-- ============================================================
-- 023 — Journal d'activité, dépenses récurrentes, suppression de compte
-- ============================================================
-- 1. trip_activity : qui a créé / modifié / supprimé quoi (dépenses,
--    remboursements, étapes). Alimenté par triggers, lecture seule côté client.
-- 2. recurring_expenses : modèles de dépenses répétées (hebdo / mensuel),
--    appliqués sans doublon par apply_recurring_expenses().
-- 3. delete_my_account() : suppression RGPD. Les voyages dont tu es
--    propriétaire passent à un autre membre ; ceux où tu es seul disparaissent.
-- Idempotent : peut être rejouée sans casse.

-- ─── 1. Journal d'activité ───────────────────────────────────
CREATE TABLE IF NOT EXISTS public.trip_activity (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id    uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  actor_id   uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  actor_name text,
  entity     text NOT NULL,                    -- 'expense' | 'settlement' | 'step'
  action     text NOT NULL,                    -- 'created' | 'updated' | 'deleted'
  entity_id  uuid,
  title      text,
  amount     numeric,                          -- dans la devise du voyage
  details    jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT trip_activity_entity_check CHECK (entity IN ('expense', 'settlement', 'step')),
  CONSTRAINT trip_activity_action_check CHECK (action IN ('created', 'updated', 'deleted'))
);

CREATE INDEX IF NOT EXISTS trip_activity_trip_idx ON public.trip_activity (trip_id, created_at DESC);

ALTER TABLE public.trip_activity ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Trip members can read activity" ON public.trip_activity;
CREATE POLICY "Trip members can read activity"
  ON public.trip_activity FOR SELECT
  USING (public.is_trip_member(trip_id));
-- Aucune policy d'écriture : seules les fonctions ci-dessous (SECURITY DEFINER) écrivent.

CREATE OR REPLACE FUNCTION public.log_trip_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid     uuid := auth.uid();
  v_trip    uuid;
  v_name    text;
  v_entity  text;
  v_action  text;
  v_id      uuid;
  v_title   text;
  v_amount  numeric;
  v_details jsonb := '{}'::jsonb;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_trip := OLD.trip_id; v_id := OLD.id; v_title := OLD.title;
  ELSE
    v_trip := NEW.trip_id; v_id := NEW.id; v_title := NEW.title;
  END IF;

  -- Suppression en cascade du voyage : plus rien à journaliser.
  IF NOT EXISTS (SELECT 1 FROM public.trips WHERE id = v_trip) THEN
    RETURN NULL;
  END IF;

  v_action := CASE TG_OP WHEN 'INSERT' THEN 'created' WHEN 'UPDATE' THEN 'updated' ELSE 'deleted' END;

  IF TG_TABLE_NAME = 'expenses' THEN
    IF TG_OP = 'DELETE' THEN
      v_entity := CASE WHEN OLD.category = 'reimbursement' THEN 'settlement' ELSE 'expense' END;
      v_amount := OLD.amount_in_trip_currency;
    ELSE
      v_entity := CASE WHEN NEW.category = 'reimbursement' THEN 'settlement' ELSE 'expense' END;
      v_amount := NEW.amount_in_trip_currency;
    END IF;

    IF TG_OP = 'UPDATE' THEN
      IF OLD.title IS NOT DISTINCT FROM NEW.title
         AND OLD.amount_in_trip_currency IS NOT DISTINCT FROM NEW.amount_in_trip_currency
         AND OLD.date IS NOT DISTINCT FROM NEW.date
         AND OLD.category IS NOT DISTINCT FROM NEW.category
         AND OLD.payers IS NOT DISTINCT FROM NEW.payers
         AND OLD.splits IS NOT DISTINCT FROM NEW.splits
      THEN
        RETURN NULL;
      END IF;
      v_details := jsonb_strip_nulls(jsonb_build_object(
        'title',    CASE WHEN OLD.title IS DISTINCT FROM NEW.title
                         THEN jsonb_build_object('from', OLD.title, 'to', NEW.title) END,
        'amount',   CASE WHEN OLD.amount_in_trip_currency IS DISTINCT FROM NEW.amount_in_trip_currency
                         THEN jsonb_build_object('from', OLD.amount_in_trip_currency, 'to', NEW.amount_in_trip_currency) END,
        'date',     CASE WHEN OLD.date IS DISTINCT FROM NEW.date
                         THEN jsonb_build_object('from', OLD.date, 'to', NEW.date) END,
        'category', CASE WHEN OLD.category IS DISTINCT FROM NEW.category
                         THEN jsonb_build_object('from', OLD.category, 'to', NEW.category) END,
        'payers',   CASE WHEN OLD.payers IS DISTINCT FROM NEW.payers THEN to_jsonb(true) END,
        'splits',   CASE WHEN OLD.splits IS DISTINCT FROM NEW.splits THEN to_jsonb(true) END
      ));
    END IF;
  ELSE
    -- Étapes : seules la création et la suppression comptent.
    v_entity := 'step';
  END IF;

  SELECT COALESCE(pa.name, pr.name) INTO v_name
  FROM public.profiles pr
  LEFT JOIN public.trip_members tm ON tm.user_id = pr.id AND tm.trip_id = v_trip
  LEFT JOIN public.participants pa ON pa.id = tm.participant_id
  WHERE pr.id = v_uid;

  INSERT INTO public.trip_activity (trip_id, actor_id, actor_name, entity, action, entity_id, title, amount, details)
  VALUES (v_trip, v_uid, v_name, v_entity, v_action, v_id, v_title, v_amount, v_details);

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS expenses_log_activity ON public.expenses;
CREATE TRIGGER expenses_log_activity
  AFTER INSERT OR UPDATE OR DELETE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.log_trip_activity();

DROP TRIGGER IF EXISTS itinerary_items_log_activity ON public.itinerary_items;
CREATE TRIGGER itinerary_items_log_activity
  AFTER INSERT OR DELETE ON public.itinerary_items
  FOR EACH ROW EXECUTE FUNCTION public.log_trip_activity();


-- ─── 2. Dépenses récurrentes ─────────────────────────────────
CREATE TABLE IF NOT EXISTS public.recurring_expenses (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id       uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  title         text NOT NULL,
  amount        numeric NOT NULL,                  -- dans `currency`
  currency      text NOT NULL,
  exchange_rate numeric NOT NULL DEFAULT 1,
  category      text NOT NULL,
  payers        jsonb NOT NULL DEFAULT '[]'::jsonb, -- [{participantId, amount}] en devise du voyage
  split_mode    text NOT NULL DEFAULT 'equal',
  splits        jsonb NOT NULL DEFAULT '[]'::jsonb,
  frequency     text NOT NULL,
  anchor_day    integer NOT NULL,                  -- jour du mois voulu (évite la dérive 31 → 28 → 28)
  next_date     date NOT NULL,
  created_by    uuid DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT recurring_expenses_frequency_check CHECK (frequency IN ('weekly', 'monthly'))
);

CREATE INDEX IF NOT EXISTS recurring_expenses_trip_idx ON public.recurring_expenses (trip_id, next_date);

ALTER TABLE public.recurring_expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Trip members can CRUD recurring_expenses" ON public.recurring_expenses;
CREATE POLICY "Trip members can CRUD recurring_expenses"
  ON public.recurring_expenses FOR ALL
  USING (public.is_trip_member(trip_id))
  WITH CHECK (public.is_trip_member(trip_id));

CREATE OR REPLACE FUNCTION public.next_recurrence(p_from date, p_frequency text, p_anchor_day integer)
RETURNS date
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE p_frequency
    WHEN 'weekly' THEN p_from + 7
    ELSE (
      date_trunc('month', p_from)::date + interval '1 month'
      + (LEAST(
          p_anchor_day,
          EXTRACT(day FROM (date_trunc('month', p_from) + interval '2 month' - interval '1 day'))::int
        ) - 1) * interval '1 day'
    )::date
  END;
$$;

-- Crée les dépenses échues, une seule fois même si deux téléphones l'appellent
-- en même temps (verrou de ligne + avance de next_date dans la même transaction).
CREATE OR REPLACE FUNCTION public.apply_recurring_expenses(p_trip_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r       record;
  v_count integer := 0;
  v_loops integer;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_trip_member(p_trip_id) THEN
    RAISE EXCEPTION 'Not a member of this trip' USING ERRCODE = '42501';
  END IF;

  FOR r IN
    SELECT * FROM public.recurring_expenses
    WHERE trip_id = p_trip_id AND next_date <= current_date
    FOR UPDATE
  LOOP
    v_loops := 0;
    WHILE r.next_date <= current_date AND v_loops < 24 LOOP
      INSERT INTO public.expenses (
        trip_id, title, amount, currency, exchange_rate, amount_in_trip_currency,
        category, paid_by_id, payers, date, split_mode, splits, notes
      ) VALUES (
        r.trip_id, r.title, r.amount, r.currency, r.exchange_rate,
        round(r.amount * r.exchange_rate, 2),
        r.category,
        NULLIF(r.payers -> 0 ->> 'participantId', '')::uuid,
        r.payers, r.next_date, r.split_mode, r.splits, 'Dépense récurrente'
      );
      r.next_date := public.next_recurrence(r.next_date, r.frequency, r.anchor_day);
      v_loops := v_loops + 1;
      v_count := v_count + 1;
    END LOOP;
    UPDATE public.recurring_expenses SET next_date = r.next_date WHERE id = r.id;
  END LOOP;

  RETURN v_count;
END;
$$;


-- ─── 3. Suppression de compte ────────────────────────────────
-- Les participants liés au compte restent dans les voyages des autres (sans
-- compte) : leurs dépenses et soldes doivent continuer à tomber juste.
CREATE OR REPLACE FUNCTION public.delete_my_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid  uuid := auth.uid();
  v_trip record;
  v_heir uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  FOR v_trip IN SELECT id FROM public.trips WHERE owner_id = v_uid LOOP
    SELECT user_id INTO v_heir
    FROM public.trip_members
    WHERE trip_id = v_trip.id AND user_id <> v_uid
    ORDER BY (role = 'owner') DESC, joined_at ASC
    LIMIT 1;

    IF v_heir IS NULL THEN
      DELETE FROM public.trips WHERE id = v_trip.id;
    ELSE
      UPDATE public.trips SET owner_id = v_heir WHERE id = v_trip.id;
      UPDATE public.trip_members SET role = 'owner' WHERE trip_id = v_trip.id AND user_id = v_heir;
    END IF;
  END LOOP;

  -- Cascade : profil, appartenances, bande, abonnements push.
  DELETE FROM auth.users WHERE id = v_uid;
END;
$$;


-- ─── Grants ──────────────────────────────────────────────────
REVOKE ALL ON FUNCTION public.log_trip_activity() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.apply_recurring_expenses(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.delete_my_account() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.apply_recurring_expenses(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_my_account() TO authenticated;
