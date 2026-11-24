# Voyou — Guide de mise en ligne : Supabase + Vercel

Ce guide part du principe que **rien n'a été fait** côté Supabase, Google Cloud et Vercel pour la PR #6
(hors-ligne, multi-devises, journal d'activité, dépenses répétées, export, suppression de compte).
Il est écrit pour être suivi de haut en bas, case par case. Compte 45 à 60 minutes la première fois.

> **Ce qui a été vérifié, et ce qui ne l'a pas été**
> - Vérifié sur un PostgreSQL 16 local (faux schémas `auth` et `storage`) : la migration 023, la requête de diagnostic,
>   l'ordre des migrations pour un projet neuf, et le fait que les migrations 016, 018, 019, 021, 022 et 023 se rejouent sans erreur.
> - **Non vérifié** : les libellés exacts des menus Supabase, Google Cloud et Vercel (ils changent de temps en temps),
>   et le comportement sur ton vrai projet. Si un libellé diffère, cherche le même mot-clé dans la barre de recherche du dashboard.

---

## 0. En bref

| # | Où | Quoi | Si tu l'oublies |
|---|----|------|-----------------|
| 1 | Supabase | Sauvegarder la base | Aucun retour possible si un problème survient |
| 2 | Supabase › SQL Editor | Lancer la requête de diagnostic (§2.2) | Tu ne sais pas quelles migrations manquent |
| 3 | Supabase › SQL Editor | Jouer les migrations manquantes **dont la 023** (§2.3 et annexe A) | Historique vide, dépenses répétées inertes, « Supprimer mon compte » en erreur |
| 4 | Supabase › Authentication | Invités + liaison manuelle + URL de redirection (§2.5) | Connexion Google ou mode invité en échec |
| 5 | Supabase › Storage | Deux buckets publics (§2.6) | Photos de profil et icônes de voyage impossibles à envoyer |
| 6 | Google Cloud | Adresse de retour + application publiée (§3) | Connexion Google en échec |
| 7 | Supabase + prestataire d'e-mails | Envoi d'e-mails (SMTP), modèles de messages, code à 6 chiffres (§3 ter) | Pas de connexion par e-mail (le bouton reste caché, rien ne casse) |
| 8 | Vercel › Environment Variables | `CONSENT_HMAC_SECRET` + clés Supabase + VAPID (§4.1) | **Erreur 500 au consentement RGPD** : personne ne peut finir sa première connexion |
| 9 | Vercel + GitHub | Redéployer (§4.5), recette sur l'aperçu (§6), puis fusionner la PR #6 | Rien n'arrive en production |
| 10 | Meta + Supabase | Créer l'app Facebook et la brancher (§3 bis), **après** la fusion | Pas de connexion Facebook (le bouton reste caché, rien ne casse) |
| 11 | Vercel | `NEXT_PUBLIC_FACEBOOK_LOGIN=true` et/ou `NEXT_PUBLIC_EMAIL_LOGIN=true`, puis redéployer (§3 bis.6 et §3 ter.6) | Les boutons Facebook / e-mail n'apparaissent pas |

**À ne surtout pas faire : activer un CAPTCHA dans Supabase.** L'app n'envoie pas de jeton CAPTCHA, donc le bouton
« Continuer en tant qu'invité » cesserait de marcher (détail §2.5).

---

## 1. Avant de commencer

À avoir sous la main :

- [ ] Accès **propriétaire** au projet Supabase de Voyou.
- [ ] Accès au projet **Vercel** « voyou » (équipe qui héberge `voyou.app`).
- [ ] Accès à la **console Google Cloud** qui contient l'identifiant OAuth utilisé pour la connexion Google.
- [ ] Accès **écriture** au dépôt GitHub `Cocolegeek/timetogo` (pour fusionner la PR #6).
- [ ] Un **compte Google jetable** (pour la recette et pour tester la suppression de compte).
- [ ] Facultatif : `psql` / `pg_dump` sur ton ordinateur (pour la sauvegarde en ligne de commande) et Node.js (pour générer des clés VAPID).

Informations à noter (tu en auras besoin plus bas) :

| Info | Où la trouver | Ta valeur |
|------|---------------|-----------|
| Référence du projet Supabase (`<PROJECT_REF>`) | Supabase › Project Settings › General › Reference ID | |
| URL du projet | Supabase › Project Settings › API › Project URL (`https://<PROJECT_REF>.supabase.co`) | |
| Clé publique | Supabase › Project Settings › API (clé `anon` / « publishable ») | |
| Domaine de production | `voyou.app` | |

---

## 2. Supabase

### 2.1 Sauvegarde (à faire en premier)

La migration 023 ajoute des triggers sur la table des dépenses. Elle est conçue pour ne rien casser, mais une sauvegarde
coûte deux minutes.

- Offre **Pro** : Supabase › Database › Backups. Vérifie qu'une sauvegarde récente existe, ou déclenche-en une.
- Offre **gratuite** : pas de sauvegarde restaurable fournie. Fais un export :
  ```bash
  # Chaîne de connexion : Supabase › Project Settings › Database › Connection string (mode « Session pooler » ou « Direct »)
  pg_dump "postgresql://postgres:<MOT_DE_PASSE>@<HOTE>:5432/postgres" \
    --schema=public --no-owner --file=voyou-avant-023.sql
  ```
  Remplace `<MOT_DE_PASSE>` et `<HOTE>` par tes valeurs. Garde le fichier hors du dépôt Git (il contient des données personnelles).

### 2.2 Diagnostic : quelles migrations sont déjà jouées ?

Supabase › **SQL Editor** › **New query**, colle la requête ci-dessous, clique **Run**.
Elle ne modifie rien. Chaque ligne affiche `OK` ou `MANQUE`.

```sql
with checks(migration, element, ok) as (values
  ('008 RGPD',            'profiles.gdpr_consented_at',        exists(select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='gdpr_consented_at')),
  ('009 multi-payeurs',   'expenses.payers',                   exists(select 1 from information_schema.columns where table_schema='public' and table_name='expenses' and column_name='payers')),
  ('010 type de voyage',  'trips.type',                        exists(select 1 from information_schema.columns where table_schema='public' and table_name='trips' and column_name='type')),
  ('012 rejoindre',       'fonction join_trip',                exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='join_trip')),
  ('013 avatars perso',   'profiles.custom_avatar_url',        exists(select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='custom_avatar_url')),
  ('013 avatars perso',   'trips.icon_url',                    exists(select 1 from information_schema.columns where table_schema='public' and table_name='trips' and column_name='icon_url')),
  ('014 aperçu invité',   'fonction get_join_preview',         exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='get_join_preview')),
  ('015 création voyage', 'fonction create_trip_with_owner',   exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='create_trip_with_owner')),
  ('016 trajets',         'itinerary_items.journey_mode',      exists(select 1 from information_schema.columns where table_schema='public' and table_name='itinerary_items' and column_name='journey_mode')),
  ('017 paiement',        'profiles.iban',                     exists(select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='iban')),
  ('018 identité',        'fonction claim_participant',        exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='claim_participant')),
  ('019 infos paiement',  'fonction get_payment_info',         exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='get_payment_info')),
  ('020 plats multiples', 'meals.dishes',                      exists(select 1 from information_schema.columns where table_schema='public' and table_name='meals' and column_name='dishes')),
  ('021 invités',         'table guest_transfers',             to_regclass('public.guest_transfers') is not null),
  ('021 invités',         'fonction claim_guest_transfer',     exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='claim_guest_transfer')),
  ('022 bande',           'table friendships',                 to_regclass('public.friendships') is not null),
  ('022 notifications',   'table push_subscriptions',          to_regclass('public.push_subscriptions') is not null),
  ('022 listes',          'table checklist_items',             to_regclass('public.checklist_items') is not null),
  ('023 journal',         'table trip_activity',               to_regclass('public.trip_activity') is not null),
  ('023 journal',         'trigger expenses_log_activity',     exists(select 1 from pg_trigger where tgname='expenses_log_activity')),
  ('023 récurrentes',     'table recurring_expenses',          to_regclass('public.recurring_expenses') is not null),
  ('023 récurrentes',     'fonction apply_recurring_expenses', exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='apply_recurring_expenses')),
  ('023 suppression',     'fonction delete_my_account',        exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='delete_my_account')),
  ('base',                'trigger on_auth_user_created (crée le profil)', exists(select 1 from pg_trigger where tgname='on_auth_user_created'))
)
select migration, element, case when ok then 'OK' else 'MANQUE' end as etat
from checks order by ok, migration;
```

**Comment lire le résultat**

- Tout est `OK` : passe au §2.4 (vérifier la 023) puis au §2.5.
- `MANQUE` sur une ligne `0xx` : la migration `0xx` n'a pas été jouée. Joue **toutes** les migrations manquantes, **dans l'ordre numérique** (§2.3).
- `MANQUE` sur `trigger on_auth_user_created` : les nouveaux comptes n'auront pas de profil. Cherche ce trigger dans `lib/supabase/schema.sql` (section `profiles`) et rejoue-le.
- Une ligne `023 …` en `MANQUE` est **normale** à ce stade : c'est ce que tu vas corriger.

Deuxième requête, pour le stockage (à lancer aussi) :

```sql
-- Attendu : 2 lignes avec public = true
select id, public from storage.buckets where id in ('profile-avatars', 'trip-icons');

-- Attendu : 8
select count(*) as policies_storage
from pg_policies
where schemaname = 'storage'
  and (policyname like 'trip-icons%' or policyname like 'profile-avatars%');
```

- Moins de 2 buckets : voir §2.6.
- `policies_storage` différent de 8 : rejoue `lib/supabase/migrations/013_custom_avatars.sql` **après** avoir créé les buckets.

### 2.3 Jouer les migrations manquantes

**Procédure (identique pour chaque fichier)**

1. Ouvre le fichier dans le dépôt GitHub (dossier `lib/supabase/migrations/`), bouton « Raw » ou « Copy raw file ».
2. Supabase › SQL Editor › New query › colle tout le contenu › **Run**.
3. Attendu : `Success. No rows returned`. Si Supabase demande une confirmation à cause de `DROP POLICY` / `DROP TRIGGER IF EXISTS`,
   c'est normal : ce sont des remplacements idempotents. Confirme.
4. En cas d'erreur : **arrête-toi**, ne passe pas au fichier suivant, copie le message d'erreur complet.
5. Relance la requête de diagnostic (§2.2) quand tu as fini.

N'exécute **que** les migrations marquées `MANQUE`. Les migrations 001 à 007 sont anciennes et pas toutes idempotentes :
ne les rejoue pas si le diagnostic ne signale rien pour elles.

| Fichier | Contenu |
|---------|---------|
| `001_equal_member_rights.sql` | Droits égaux entre membres |
| `002_itinerary_duration.sql` | Durée des étapes |
| `003_itinerary_participants.sql` | Participants d'une étape |
| `004_drop_checklist.sql` | Suppression de l'ancienne checklist (remplacée par la 022) |
| `005_create_meals.sql` | Table des repas |
| `006_menu_redesign.sql` | Refonte des menus |
| `007_blank_default_titles.sql` | Titres par défaut vides |
| `008_gdpr_consent.sql` | Consentement RGPD |
| `009_multi_payer.sql` | Plusieurs payeurs par dépense |
| `010_trip_type.sql` | Voyage / groupe |
| `011_lock_join_lookups.sql` | Verrouillage des recherches de code de partage |
| `012_join_trip_rpc.sql` | Fonction `join_trip` |
| `013_custom_avatars.sql` | Photos personnalisées (**nécessite les 2 buckets**, §2.6) |
| `014_join_preview_anon.sql` | Aperçu d'un voyage avant de rejoindre |
| `015_create_trip_rpc.sql` | Fonction `create_trip_with_owner` |
| `016_itinerary_journey.sql` | Trajets (point d'arrivée, mode de transport) |
| `017_profile_payment_info.sql` | IBAN et téléphone du profil |
| `018_identity_claim.sql` | « Qui es-tu ? » (revendiquer un participant) |
| `019_get_payment_info.sql` | Fonction `get_payment_info` |
| `020_multi_dish_meals.sql` | Plusieurs plats par repas |
| `021_guest_accounts.sql` | Comptes invités + fusion vers Google |
| `022_friends_notifications_lists.sql` | Ta bande, notifications push, listes |
| **`023_activity_recurring_account_deletion.sql`** | **Journal d'activité, dépenses répétées, suppression de compte** (contenu complet en annexe A) |

**Projet Supabase neuf (cas peu probable)**

`lib/supabase/schema.sql` n'est **pas** un schéma complet à jour : il ne contient pas les migrations 016, 018 et 019, et ses
versions de `join_trip` et `create_trip_with_owner` sont antérieures aux migrations 018 et 021. Ordre testé sur base vierge :

1. `lib/supabase/schema.sql`
2. `016_itinerary_journey.sql`
3. `018_identity_claim.sql`
4. `019_get_payment_info.sql`
5. `021_guest_accounts.sql` (**après** la 018, car elle redéfinit `create_trip_with_owner`)

Le schéma contient déjà la 022 et la 023. Ne joue **jamais** `schema.sql` sur une base qui existe déjà : il échouerait
(« policy already exists ») et pourrait laisser la base à moitié modifiée.

### 2.4 La migration 023 en détail

Elle ajoute :

- `trip_activity` : le journal. Alimenté **uniquement par des triggers** (dépenses, remboursements, création et suppression d'étapes). Lecture réservée aux membres du voyage. Il ne contient que ce qui se passe **après** la migration (pas de reprise de l'historique).
- `recurring_expenses` et les fonctions `next_recurrence` / `apply_recurring_expenses` : dépenses répétées, créées côté serveur, sans doublon même si deux téléphones ouvrent l'écran en même temps.
- `delete_my_account()` : suppression RGPD. Les voyages dont tu es propriétaire passent au membre le plus ancien ; s'il n'y en a pas, le voyage est supprimé. Les participants liés à ton compte restent (sans compte) pour que les soldes des autres restent justes.

**Exécute-la dans le SQL Editor avec le rôle par défaut (`postgres`).** Ce rôle est indispensable : la fonction supprime la ligne
dans `auth.users`. Si tu passes par une autre connexion (rôle restreint), la suppression de compte échouera avec
`permission denied for table users`.

Elle est **additive** : elle ne modifie ni ne supprime aucune donnée existante, et elle se rejoue sans risque.

**Vérification juste après** (tout doit répondre `true`) :

```sql
select
  to_regclass('public.trip_activity')      is not null as journal,
  to_regclass('public.recurring_expenses') is not null as recurrentes,
  exists(select 1 from pg_trigger where tgname = 'expenses_log_activity')        as trigger_depenses,
  exists(select 1 from pg_trigger where tgname = 'itinerary_items_log_activity') as trigger_etapes,
  exists(select 1 from pg_proc where proname = 'apply_recurring_expenses') as fn_recurrentes,
  exists(select 1 from pg_proc where proname = 'delete_my_account')        as fn_suppression,
  (select relrowsecurity from pg_class where oid = 'public.trip_activity'::regclass)      as rls_journal,
  (select relrowsecurity from pg_class where oid = 'public.recurring_expenses'::regclass) as rls_recurrentes;
```

### 2.5 Authentication

Supabase › **Authentication**.

#### a) Sign In / Providers

- [ ] **Allow anonymous sign-ins** : activé (mode invité).
- [ ] **Allow manual linking** : activé (sauvegarde d'un invité vers Google sans perte de données).
- [ ] **Google** : activé, avec **Client ID** et **Client Secret** (créés au §3). Laisse « Skip nonce check » désactivé.
- [ ] « Allow new users to sign up » : activé (sinon personne ne peut créer de compte).

#### b) URL Configuration

- [ ] **Site URL** : `https://voyou.app`
- [ ] **Redirect URLs** : ajoute chaque ligne (une par entrée) :
  ```text
  https://voyou.app/**
  http://localhost:3000/**
  https://*-corentins-projects-ad191af9.vercel.app/**
  ```
  - La 1re : production. Le code renvoie vers `https://voyou.app/auth/callback?redirect_to=…` et `…/auth/callback?redirect_to=%2Fauth%2Flink…`.
  - La 2e : développement local.
  - La 3e : les aperçus Vercel (pour te connecter sur l'aperçu d'une PR). Remplace `corentins-projects-ad191af9` par le slug de ton équipe Vercel si besoin.
  - Sans entrée correspondante, Supabase ignore l'URL demandée et renvoie vers le Site URL : la connexion « réussit » mais tu atterris au mauvais endroit.

#### c) Attack Protection : ne pas activer le CAPTCHA

La migration 021 recommande un CAPTCHA, mais **le code de l'app ne transmet aucun `captchaToken`**
(`lib/auth/guest.ts` appelle `signInAnonymously()` sans paramètre). Si tu actives un CAPTCHA dans Supabase, la création d'un invité
échouera avec une erreur de vérification CAPTCHA. Tant que le code n'est pas adapté, laisse-le **désactivé**.

Pour limiter les abus des comptes invités sans CAPTCHA :

- [ ] Authentication › **Rate Limits** : vérifie la limite sur les connexions anonymes et baisse-la si tu veux.
- [ ] Facultatif, de temps en temps : supprimer les invités abandonnés (annexe C).

### 2.6 Storage

Supabase › **Storage** › **New bucket**, deux fois :

| Nom exact | Public |
|-----------|--------|
| `profile-avatars` | **oui** |
| `trip-icons` | **oui** |

- Les noms doivent être **exactement** ceux-ci.
- Les règles d'accès (8 policies) sont créées par la migration 013. Si tu crées les buckets après avoir joué la 013, rejoue-la.
- Convention des fichiers : `{identifiant_utilisateur}/{nom}.webp`. Chaque personne ne peut écrire que dans son propre dossier.
- « Supprimer mon compte » efface ces fichiers avant de supprimer le compte (si un bucket n'existe pas, la suppression continue quand même).

### 2.7 Project Settings › API

- [ ] Note le **Project URL** et la clé **anon public** (ou « publishable »). Tu les colles dans Vercel au §4.1.
- [ ] **N'utilise jamais** la clé `service_role` / « secret » dans Vercel ni dans le code : l'app n'en a pas besoin, et elle contourne toute la sécurité par ligne (RLS).

### 2.8 Ce que tu n'as PAS à configurer

- **Realtime** : non utilisé.
- **Edge Functions**, **Database Webhooks**, **pg_cron** : non utilisés (les dépenses répétées se déclenchent à l'ouverture du budget d'un groupe).
- **Clé `service_role`** : non utilisée.
- **E-mails d'authentification** : l'app n'utilise que Google et les comptes invités.

---

## 3. Google Cloud (connexion Google)

Console Google Cloud › **APIs & Services** › **Credentials**.

- [ ] Un identifiant **OAuth client ID** de type **Web application** existe.
- [ ] **Authorized redirect URIs** contient exactement :
  ```text
  https://<PROJECT_REF>.supabase.co/auth/v1/callback
  ```
  Le retour se fait via Supabase, **pas** directement vers `voyou.app` : inutile d'y ajouter les URL de ton site.
- [ ] Copie **Client ID** et **Client secret** dans Supabase › Authentication › Sign In / Providers › Google.
- [ ] **OAuth consent screen** : l'état de publication doit être **« In production »**. En « Testing », seuls les comptes de test
  peuvent se connecter et les sessions expirent au bout de 7 jours.
- [ ] Les portées par défaut (`openid`, `email`, `profile`) suffisent.

---

## 3 bis. Facebook (connexion avec Facebook)

L'app sait désormais proposer « Continuer avec Facebook » (écran de connexion) et « Sauvegarder avec Facebook » (mode invité).
Le bouton est **caché par défaut** : il n'apparaît que quand la variable `NEXT_PUBLIC_FACEBOOK_LOGIN` vaut `true` (§3 bis.6).
On peut donc déployer le code sans risque, et allumer Facebook quand tout est prêt.

**À faire après la fusion de la PR #6** : Meta exige l'adresse d'une page de confidentialité en ligne
(`https://voyou.app/privacy`, créée par cette PR) et d'une page d'explication pour la suppression des données
(`https://voyou.app/privacy#suppression`).

### 3 bis.1 Créer l'application Meta

1. Va sur **developers.facebook.com**, connecte-toi avec ton compte Facebook, et accepte les conditions développeur si on te le demande.
2. **My Apps** › **Create App**.
3. Nom : `Voyou`. E-mail de contact : une adresse à toi (de préférence dédiée au projet, c'est elle que Meta utilise pour te joindre).
4. Cas d'usage (« Use case ») : choisis **Authenticate and request data from users with Facebook Login** (ou « Se connecter avec Facebook »).
   Type d'application, si on te le demande : **Consumer**.
5. Valide la création (Meta peut te redemander ton mot de passe).

### 3 bis.2 Réglages de base

**App settings** › **Basic** (Paramètres › Général) :

- [ ] Note **App ID** (identifiant de l'app). Clique sur **Show** à côté de **App Secret** pour le voir : tu en as besoin en §3 bis.5. Ne le publie nulle part.
- [ ] **Privacy Policy URL** :
  ```text
  https://voyou.app/privacy
  ```
- [ ] **User data deletion** › choisis **Data deletion instructions URL** (instructions) et colle :
  ```text
  https://voyou.app/privacy#suppression
  ```
- [ ] **App Domains** :
  ```text
  voyou.app
  ```
- [ ] **App icon (1024 x 1024)** : envoie `public/icons/icon-1024.png` (fichier du dépôt, ajouté par cette PR). Après déploiement, tu peux aussi le télécharger sur `https://voyou.app/icons/icon-1024.png`.
- [ ] **Category** : par exemple « Voyages » / « Travel » (ou « Lifestyle »).
- [ ] **Save changes**.

### 3 bis.3 Facebook Login : adresse de retour et permissions

1. Copie l'adresse de retour de Supabase : Supabase › Authentication › Sign In / Providers › **Facebook** › **Callback URL (for OAuth)**. Elle ressemble à :
   ```text
   https://<PROJECT_REF>.supabase.co/auth/v1/callback
   ```
2. Dans Meta : **Use cases** › **Authenticate and request data from users with Facebook Login** › **Customize**
   (ou le produit **Facebook Login** › **Settings**).
3. **Valid OAuth Redirect URIs** : colle l'adresse copiée. Laisse **Client OAuth login** et **Web OAuth login** activés. **Save**.
4. **Permissions** : ajoute **`email`** (en plus de `public_profile`). Ces deux permissions sont en « accès standard » :
   en principe **aucune revue d'application** n'est nécessaire.

### 3 bis.4 Passer l'application en « Live »

Tant que l'app est en mode **Development**, seuls toi, les administrateurs et les testeurs déclarés peuvent se connecter.

1. En haut de la page Meta, bascule **App mode** de *Development* à **Live**.
2. Si Meta refuse, il liste ce qui manque : privacy policy, instructions de suppression, icône, catégorie. Complète-le (§3 bis.2) puis réessaie.

### 3 bis.5 Brancher Facebook dans Supabase

1. Supabase › **Authentication** › **Sign In / Providers** › **Facebook**.
2. Active **Enable Sign in with Facebook**.
3. **Facebook client ID** = l'**App ID** ; **Facebook secret** = l'**App Secret** (§3 bis.2).
4. **Save**.

Aucune autre adresse à ajouter dans Supabase : les Redirect URLs du §2.5 s'appliquent aussi à Facebook.

### 3 bis.6 Afficher le bouton dans l'app

1. Vercel › Settings › Environment Variables › ajoute :

| Variable | Valeur | Environnements |
|----------|--------|----------------|
| `NEXT_PUBLIC_FACEBOOK_LOGIN` | `true` | Production (+ Preview si tu veux tester dessus) |
| `NEXT_PUBLIC_EMAIL_LOGIN` | non (e-mail uniquement) | `true` : affiche « Continuer avec un e-mail » (§3 ter.6) | Production (+ Preview) |
| `NEXT_PUBLIC_CONTACT_EMAIL` | une adresse de contact (facultatif, s'affiche sur la page de confidentialité) | Production |

2. **Redeploy** (§4.5) : ce sont des `NEXT_PUBLIC_*`, intégrées au build.
3. Ouvre `https://voyou.app/login` : le bouton **Continuer avec Facebook** doit apparaître sous celui de Google.

### 3 bis.7 À savoir

- **Compte Facebook sans e-mail** (inscrit avec un numéro de téléphone) : Facebook ne renvoie pas d'adresse e-mail et la connexion peut échouer. La personne peut utiliser Google ou le mode invité.
- **Deux comptes pour une même personne** : si quelqu'un se connecte une fois avec Google puis une fois avec Facebook, il peut se retrouver avec deux comptes Voyou distincts (ou voir Supabase les relier d'après l'e-mail). L'app ne propose pas encore « Ajouter Facebook à mon compte » pour un compte déjà créé : le lien Facebook ne se fait qu'au moment de sauvegarder un invité. **À tester** avec deux comptes de test.
- **Photo Facebook** : l'adresse de la photo fournie par Facebook peut expirer avec le temps. Chaque personne choisit de toute façon un avatar à son arrivée, qui passe avant la photo du compte.
- **Page de confidentialité** : c'est un texte de départ écrit d'après ce que fait l'app. Relis-le, et complète-le si besoin (identité de l'éditeur, mentions légales). Ce n'est pas un avis juridique.

---

## 3 ter. E-mail (code à 6 chiffres, sans mot de passe)

L'app propose « Continuer avec un e-mail » (écran de connexion) et « Sauvegarder avec un e-mail » (mode invité).
Principe : la personne saisit son adresse, reçoit un **code à 6 chiffres**, le tape dans l'app. Pas de mot de passe, pas de lien à ouvrir
(un lien s'ouvrirait dans le navigateur et non dans l'app installée). Si l'adresse a déjà un compte, un invité qui se sauvegarde y est
connecté et ses voyages y sont rapatriés.

Comme pour Facebook, le bouton est **caché par défaut** (variable `NEXT_PUBLIC_EMAIL_LOGIN`) : tu l'allumes à la fin, une fois l'envoi d'e-mails testé.

### 3 ter.1 Pourquoi un service d'envoi est obligatoire

Avec son envoi par défaut, Supabase n'envoie des e-mails qu'à quelques adresses autorisées (les membres de ton organisation) et en très petit
nombre. **Pour le public, il faut brancher ton propre service d'envoi (SMTP)** sur ton domaine `voyou.app`. Sans cela, personne d'autre que toi ne recevra de code.

### 3 ter.2 Brancher un service d'envoi (exemple : Resend)

Resend a une offre gratuite suffisante pour démarrer. D'autres services (Brevo, Postmark, Mailgun…) font la même chose : seuls les champs changent.

1. Crée un compte sur **resend.com**.
2. **Domains** › **Add Domain** › `voyou.app`.
3. Resend affiche des enregistrements DNS à créer (SPF, DKIM, parfois DMARC). Ajoute-les là où tu gères le DNS de `voyou.app`
   (ton registrar, ou Vercel › Domains si le DNS est chez Vercel). Puis clique sur **Verify** (la propagation peut prendre de quelques minutes à quelques heures).
4. **API Keys** › **Create API Key** (accès « Sending »). Copie la clé, elle ne s'affiche qu'une fois.
5. Supabase › **Authentication** › **Emails** › **SMTP Settings** (ou Project Settings › Authentication › SMTP) › active **Enable custom SMTP** :

| Champ | Valeur (Resend) |
|-------|-----------------|
| Sender email | `no-reply@voyou.app` (une adresse de ton domaine vérifié) |
| Sender name | `Voyou` |
| Host | `smtp.resend.com` |
| Port | `465` |
| Username | `resend` |
| Password | la clé API créée à l'étape 4 |

6. **Save**. Dans **Authentication** › **Rate Limits**, vérifie la limite d'envoi d'e-mails par heure et augmente-la si tu attends beaucoup d'inscriptions.

### 3 ter.3 Réglages du code

Supabase › **Authentication** › **Sign In / Providers** › **Email** :

- [ ] **Enable Email provider** : activé.
- [ ] **Email OTP Length** : **6** (l'app attend 6 chiffres ; si tu changes cette valeur, il faut changer `OTP_LENGTH` dans le code).
- [ ] **Email OTP Expiration** : par exemple **600** secondes (10 minutes) au lieu de la valeur par défaut, plus longue.
- [ ] **Confirm email** : peut rester activé.
- Les réglages de mot de passe ne servent pas : l'app n'en propose pas.

### 3 ter.4 Modèles de message (obligatoire)

Par défaut, Supabase envoie un **lien** au lieu d'un code. Il faut remplacer **trois** modèles pour y mettre `{{ .Token }}`.
Supabase › **Authentication** › **Emails** › **Templates**. Pour chacun des trois modèles ci-dessous, remplace le **Subject** et le **Message body** (mode source / HTML) puis **Save** :

**1. « Confirm signup »** (première connexion d'une nouvelle adresse) et **2. « Magic Link »** (connexion d'une adresse existante) : même contenu.

Subject :
```text
Ton code Voyou : {{ .Token }}
```
Message body :
```html
<h2>Ton code Voyou</h2>
<p>Entre ce code dans l'app pour continuer :</p>
<p style="font-size:32px;font-weight:700;letter-spacing:6px;">{{ .Token }}</p>
<p>Il est valable quelques minutes. Si tu n'es pas à l'origine de cette demande, ignore simplement ce message.</p>
```

**3. « Change Email Address »** (sauvegarde d'un compte invité avec un e-mail) :

Subject :
```text
Confirme ton e-mail Voyou : {{ .Token }}
```
Message body :
```html
<h2>Sauvegarde ton compte Voyou</h2>
<p>Entre ce code dans l'app pour relier cette adresse à ton compte :</p>
<p style="font-size:32px;font-weight:700;letter-spacing:6px;">{{ .Token }}</p>
<p>Il est valable quelques minutes. Si tu n'es pas à l'origine de cette demande, ignore simplement ce message.</p>
```

Laisse `{{ .Token }}` tel quel : Supabase le remplace par le code.

### 3 ter.5 Tester l'envoi avant d'allumer le bouton

1. Allume le bouton sur l'**aperçu** seulement (variable `NEXT_PUBLIC_EMAIL_LOGIN=true` dans l'environnement **Preview**, puis redéploie l'aperçu), et fais la recette §6 point R avec ta propre adresse.
2. Vérifie dans la boîte de réception **et les courriers indésirables** que le code arrive en moins d'une minute, avec l'expéditeur `Voyou`.
3. Si le code n'arrive jamais : Supabase › **Logs** › **Auth** pour voir l'erreur SMTP ; Resend › **Logs** pour voir si le message est parti.

### 3 ter.6 Afficher le bouton dans l'app

Vercel › Settings › Environment Variables :

| Variable | Valeur | Environnements |
|----------|--------|----------------|
| `NEXT_PUBLIC_EMAIL_LOGIN` | `true` | Production (+ Preview pour tester) |

Puis **Redeploy** (§4.5). Sur `https://voyou.app/login`, le bouton **Continuer avec un e-mail** apparaît.

### 3 ter.7 À savoir

- **Un code toutes les 60 secondes** : Supabase refuse un second envoi à la même adresse avant une minute. L'app affiche un compte à rebours.
- **Courriers indésirables** : les premiers envois depuis un nouveau domaine finissent souvent en spam. L'écran de saisie du code le rappelle ; DKIM et SPF correctement configurés (étape 3 ter.2) limitent le problème.
- **Une adresse, plusieurs moyens** : si la même adresse e-mail sert pour Google et pour un code, Supabase peut relier les deux comptes ou en créer deux selon le cas. À tester avec deux comptes de test, comme pour Facebook.
- **Pas de mot de passe** : une personne qui perd l'accès à sa boîte e-mail perd l'accès à son compte. Google et Facebook restent là pour ceux qui préfèrent ne dépendre que de leur compte habituel.

---

## 4. Vercel

### 4.1 Variables d'environnement

Vercel › projet **voyou** › **Settings** › **Environment Variables** › ajoute chaque variable
(champs **Key**, **Value**, et les environnements **Production**, **Preview**, **Development**).
Pour les valeurs secrètes, active **Sensitive** si Vercel le propose.

| Variable | Obligatoire | Valeur | Environnements |
|----------|-------------|--------|----------------|
| `NEXT_PUBLIC_SUPABASE_URL` | **oui** | `https://<PROJECT_REF>.supabase.co` | Production, Preview, Development |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **oui** | clé anon / publishable (§2.7) | Production, Preview, Development |
| `CONSENT_HMAC_SECRET` | **oui** | une chaîne aléatoire longue (voir ci-dessous) | Production, Preview |
| `VAPID_PRIVATE_KEY` | pour les notifications push | clé privée VAPID (§4.2) | Production (+ Preview si tu veux les tester) |
| `VAPID_SUBJECT` | non | `mailto:toi@exemple.fr` | idem |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | seulement si tu changes de paire de clés | clé publique VAPID (§4.2) | idem |
| `NEXT_PUBLIC_SITE_URL` | recommandé | `https://voyou.app` | Production |
| `NEXT_PUBLIC_FACEBOOK_LOGIN` | non (Facebook uniquement) | `true` : affiche le bouton Facebook (§3 bis.6) | Production (+ Preview) |
| `NEXT_PUBLIC_CONTACT_EMAIL` | non | adresse affichée sur `/privacy` | Production |

Détails :

- **`CONSENT_HMAC_SECRET`** : sert à signer la preuve de consentement RGPD enregistrée dans le profil. Sans lui, la route
  `/api/consent` répond **500 « Server misconfigured »** et le consentement ne s'enregistre jamais. Génère-le :
  ```bash
  openssl rand -hex 32
  ```
  Garde-le **stable** : si tu le changes plus tard, tu ne pourras plus re-vérifier les preuves déjà enregistrées.
- **`NEXT_PUBLIC_*`** : ces variables sont **intégrées au code au moment du build** et visibles dans le navigateur. N'y mets jamais de secret.
  Après modification, il faut **redéployer** (§4.5).
- **`NEXT_PUBLIC_SITE_URL`** : sert aux liens de partage et à l'image de partage. Sans elle, le code retombe sur `https://voyou.app`.
- Aucune variable n'est nécessaire pour la conversion de devises (`/api/rates` appelle `api.frankfurter.dev`, sans clé).

**En local** (`.env.local` à la racine du projet, jamais commité) : le README mentionne un `.env.local.example` qui n'existe pas
dans le dépôt. Crée le fichier à la main avec les mêmes variables.

### 4.2 Notifications push (clés VAPID)

Sans `VAPID_PRIVATE_KEY`, l'app fonctionne normalement mais **aucune notification n'est envoyée** : Réglages › Notifications
affiche « clé VAPID manquante ».

La clé **publique** est écrite en dur dans `lib/notifications/vapid.ts`. La clé **privée** doit être sa jumelle :

- **Tu as la clé privée correspondante** : ajoute-la dans `VAPID_PRIVATE_KEY`. Rien d'autre.
- **Tu ne l'as plus, ou tu n'es pas sûr** : génère une nouvelle paire.
  ```bash
  npx web-push generate-vapid-keys
  ```
  Puis renseigne **les deux** : `NEXT_PUBLIC_VAPID_PUBLIC_KEY` (clé publique) et `VAPID_PRIVATE_KEY` (clé privée), et redéploie.
  Conséquence : les appareils déjà abonnés ne recevront plus rien tant que leur propriétaire n'a pas désactivé puis
  réactivé les notifications dans Réglages (un abonnement est lié à la clé publique d'origine).
- **Vérifier que la paire est bonne** : sur un téléphone, installe l'app (sur iPhone, l'app doit être **installée sur l'écran d'accueil**),
  Réglages › Notifications › active, puis **« M'envoyer un test »**. Pas de notification : voir §8.
- `VAPID_SUBJECT` : adresse de contact `mailto:…`. Facultatif : par défaut, l'URL du site.

### 4.3 Git, domaine, protections

- [ ] Settings › **Git** : la **Production Branch** est `main`. La fusion de la PR #6 déclenchera alors un déploiement de production.
- [ ] Settings › **Domains** : `voyou.app` est rattaché au projet, certificat HTTPS actif. (Facultatif : `www.voyou.app` redirigé vers `voyou.app`.)
- [ ] Settings › **Deployment Protection** : choisis le niveau.
  - Si l'aperçu d'une PR t'affiche une demande de connexion Vercel, c'est cette protection : connecte-toi une fois, ou désactive-la pour les aperçus.
  - Ne protège pas le domaine de production par mot de passe : les gens n'arriveraient plus à ouvrir l'app.
- [ ] Facultatif, performance : Settings › **Functions** › **Function Region** : choisis la région la plus proche de ta région Supabase
  (les appels serveur de l'app, comme `/api/notify` ou `/api/consent`, parlent à la base).
- Aucun fichier `vercel.json` n'existe, et aucun réglage de build particulier n'est nécessaire (commande par défaut `next build`).

### 4.4 Aperçus (Preview) : les pièges

- Un aperçu utilise les variables d'environnement de l'environnement **Preview**. Si tu y mets les **mêmes** clés Supabase qu'en production,
  **tout ce que tu fais sur l'aperçu s'écrit dans ta base de production** (vrais voyages, vraies dépenses, vrais utilisateurs).
- Deux façons de rester propre :
  1. **Recommandé** : un second projet Supabase (« voyou-preview »), avec les mêmes migrations (§2.3), le même réglage d'authentification (§2.5),
     les mêmes buckets (§2.6), et des clés **différentes** dans les variables Vercel **Preview**.
  2. Utiliser la production, avec **uniquement** des comptes jetables, et nettoyer ensuite (annexe C).
- Pour te connecter sur un aperçu, le joker `https://*-<slug-équipe>.vercel.app/**` doit être dans les Redirect URLs de **la** base utilisée par l'aperçu (§2.5 b).

### 4.5 Redéployer

Une variable ajoutée ou modifiée ne s'applique **pas** aux déploiements existants :

- Vercel › **Deployments** › ouvre le dernier déploiement de production › menu **⋯** › **Redeploy**.
- Pour les `NEXT_PUBLIC_*`, laisse Vercel reconstruire (n'utilise pas un build mis en cache sans reconstruction).

La fusion de la PR #6 (branche `ccr-d72dab82-6s6pcz`) fait aussi un nouveau build avec les variables en place.

---

## 5. Ordre d'exécution conseillé

1. [ ] Sauvegarde (§2.1).
2. [ ] Diagnostic SQL (§2.2).
3. [ ] Migrations manquantes dans l'ordre, **023 comprise** (§2.3). Vérification (§2.4).
4. [ ] Buckets Storage (§2.6), puis rejouer la 013 si ses policies manquaient.
5. [ ] Supabase Authentication : providers, URL, **pas de CAPTCHA** (§2.5).
6. [ ] Google Cloud (§3).
7. [ ] E-mail : service d'envoi (SMTP), réglages du code, trois modèles de message (§3 ter.1 à 3 ter.4).
8. [ ] Vercel : variables (§4.1), clés VAPID (§4.2).
9. [ ] Recette sur l'**aperçu** de la PR #6 (§6), avec un compte jetable. Facebook et e-mail sont encore cachés : c'est normal.
10. [ ] Passer la PR #6 de brouillon à « Ready for review », puis fusionner dans `main`.
11. [ ] Vercel : vérifier que le déploiement de production est « Ready », et que `https://voyou.app/privacy` s'ouvre.
12. [ ] Facebook : app Meta (§3 bis.1 à 3 bis.4), puis Supabase (§3 bis.5).
13. [ ] Allumer les boutons (§3 bis.6 et §3 ter.6) en une seule fois, redéployer, tester (§6, points O à T).
14. [ ] Recette courte en production (§6, points A, B, E, H).

Pourquoi la migration avant le code : si le nouveau code arrive avant la 023, rien ne plante, mais le journal reste vide,
les dépenses répétées ne se créent pas, et « Supprimer mon compte » affiche une erreur.

---

## 6. Recette (après déploiement de l'aperçu, puis en production)

Utilise un compte jetable. Coche chaque ligne.

- [ ] **A. Connexion Google** : tu arrives sur l'écran de consentement RGPD puis sur la liste des voyages (si erreur 500 : `CONSENT_HMAC_SECRET`).
- [ ] **B. Mode invité** : « Continuer en tant qu'invité » fonctionne, puis « Sauvegarder avec Google » garde tes voyages.
- [ ] **C. Créer un groupe** (budget) avec deux participants.
- [ ] **D. Dépense en euros** : elle s'ajoute, un toast de succès apparaît.
- [ ] **E. Historique** : l'onglet « Historique » du budget montre « X a ajouté la dépense … ». Modifie le montant : la ligne indique « montant : A → B ». Supprime : « a supprimé ».
- [ ] **F. Devise étrangère** : dans le formulaire, choisis USD. Le taux apparaît (ou saisis-le), la conversion s'affiche sous le champ, la dépense est enregistrée en euros avec le montant d'origine en petit.
- [ ] **G. Dépense répétée** (groupe uniquement) : ajoute une dépense « Chaque mois ». Une ligne « 1 dépense répétée » apparaît dans l'onglet Dépenses.
  Pour tester l'échéance sans attendre un mois, dans le SQL Editor :
  ```sql
  update public.recurring_expenses set next_date = current_date - 1 where title = 'NOM_DE_TA_DEPENSE';
  ```
  puis rouvre le budget du groupe : une nouvelle dépense datée d'hier apparaît, une seule (recharge : pas de doublon).
- [ ] **H. Hors ligne** : passe le téléphone en mode avion (ou DevTools › Network › Offline). Ajoute une dépense : elle apparaît avec « En attente »,
  la pastille « Hors ligne · 1 en attente » s'affiche en haut. Coche aussi un élément d'une liste. Remets le réseau : « Modification envoyée », le badge disparaît.
  Contrôle en SQL qu'il n'y a **qu'une** ligne :
  ```sql
  select count(*) from public.expenses where title = 'TITRE_DE_LA_DEPENSE_HORS_LIGNE';
  ```
- [ ] **I. Export** : onglet Soldes › « Exporter en CSV » : le fichier s'ouvre dans Excel avec les accents, une colonne par champ.
  « Partager le récap » ouvre la feuille de partage (ou copie le texte sur ordinateur).
- [ ] **J. Remboursement** : onglet Soldes › « Régler » : le solde concerné passe à zéro.
- [ ] **K. Photo de profil** : envoie une photo (teste les buckets et leurs policies).
- [ ] **L. Notifications** : Réglages › Notifications › « M'envoyer un test » (§4.2).
- [ ] **M. Export RGPD** : Réglages › Compte › « Télécharger mes données » : un fichier JSON se télécharge.
- [ ] **N. Suppression de compte** (compte jetable **uniquement**) : Réglages › Compte › « Supprimer mon compte », tape `SUPPRIMER`. Tu es renvoyé vers la connexion.
  Contrôle en SQL (remplace l'e-mail) :
  ```sql
  select count(*) as comptes_restants from auth.users where email = 'compte-jetable@exemple.fr';  -- attendu : 0
  ```

- [ ] **O. Connexion Facebook** (après §3 bis.6) : sur l'écran de connexion, « Continuer avec Facebook » ouvre Facebook, puis tu arrives sur le consentement RGPD et la liste des voyages. Réglages › Compte et données affiche « Facebook · Connecté ».
- [ ] **P. Invité vers Facebook** : en mode invité, « Sauvegarder avec Facebook » garde tes voyages. Refais le test avec un compte Facebook qui a **déjà** servi : l'écran « Ce compte Facebook existe déjà » doit proposer de rapatrier les voyages invités.
- [ ] **Q. Page de confidentialité** : `https://voyou.app/privacy` s'ouvre sans être connecté, et le lien « Lire la politique de confidentialité » de l'écran de consentement aussi.

- [ ] **R. Connexion par e-mail** (après §3 ter.6) : « Continuer avec un e-mail » › saisis une adresse › le code arrive (regarde les indésirables) › tu le tapes : l'app valide toute seule au sixième chiffre et t'envoie sur le consentement RGPD puis tes voyages. Colle le code avec un espace (« 123 456 ») : il doit marcher aussi. Réglages › Compte et données affiche « E-mail · Connecté ».
- [ ] **S. Code refusé** : tape un faux code : le message « Code incorrect ou expiré » s'affiche ; « Renvoyer le code » est grisé pendant 60 secondes.
- [ ] **T. Invité vers e-mail** : en mode invité, « Sauvegarder avec un e-mail » › code › « Compte sauvegardé », tes voyages sont toujours là. Refais avec une adresse qui a **déjà** un compte : l'app l'annonce, envoie un code de connexion, puis rapatrie les voyages invités (« Tout est rapatrié »).

---

## 7. Retour arrière

- **Le code** : Vercel › Deployments › choisis le dernier déploiement de production qui allait bien › **⋯** › **Promote to Production**
  (ou « Instant Rollback »). Les migrations étant **additives**, l'ancien code fonctionne très bien avec la base mise à jour :
  **il n'y a normalement rien à défaire côté base.**
- **La base** : seulement si les triggers posent un problème. Cela supprime le journal et les dépenses répétées :
  ```sql
  drop trigger if exists expenses_log_activity on public.expenses;
  drop trigger if exists itinerary_items_log_activity on public.itinerary_items;
  drop function if exists public.log_trip_activity();
  drop function if exists public.apply_recurring_expenses(uuid);
  drop function if exists public.next_recurrence(date, text, integer);
  drop function if exists public.delete_my_account();
  drop table if exists public.recurring_expenses;
  drop table if exists public.trip_activity;
  ```
  À ne faire **qu'avec** un retour du code à la version précédente : le nouveau code interroge ces tables.
- En dernier recours : restaure la sauvegarde du §2.1.

---

## 8. Dépannage

| Symptôme | Cause probable | Remède |
|----------|----------------|--------|
| Erreur 500 après avoir accepté le consentement | `CONSENT_HMAC_SECRET` absente | §4.1, puis redéployer |
| Connexion Google : `redirect_uri_mismatch` | URL de retour Google incorrecte | §3 : `https://<PROJECT_REF>.supabase.co/auth/v1/callback` |
| Connexion Google OK mais retour sur `/login` | URL non autorisée dans Supabase | §2.5 b : Redirect URLs |
| Seuls certains comptes Google peuvent se connecter | Écran de consentement Google en « Testing » | §3 : passer en « In production » |
| « Continuer en tant qu'invité » échoue : « Anonymous sign-ins are disabled » | Option désactivée | §2.5 a |
| Invité échoue : erreur de vérification CAPTCHA | CAPTCHA activé dans Supabase | §2.5 c : le désactiver |
| « Sauvegarder avec Google » échoue | « Allow manual linking » désactivé | §2.5 a |
| Onglet Historique vide | Migration 023 non jouée, ou aucune action depuis la migration | §2.4 puis fais une action (le journal ne reprend pas l'historique) |
| Dépenses répétées jamais créées | Migration 023 non jouée, ou groupe de type « voyage » (réservé aux groupes) | §2.4 ; créer un budget de groupe |
| « Supprimer mon compte » : « La suppression a échoué » | 023 absente, ou fonction créée avec un rôle restreint (`permission denied for table users`) | Rejoue la 023 dans le SQL Editor (rôle `postgres`) |
| Envoi de photo impossible | Bucket absent, privé, ou policies manquantes | §2.6 puis rejoue la 013 |
| Notifications muettes | `VAPID_PRIVATE_KEY` absente, paire de clés incohérente, app non installée sur iPhone, ou déploiement non refait | §4.2 |
| Taux de change vide | `api.frankfurter.dev` indisponible | Saisis le taux à la main : le champ reste modifiable |
| Connexion impossible sur un aperçu Vercel | Joker d'aperçu absent des Redirect URLs, ou protection Vercel | §2.5 b et §4.3 |
| Une variable modifiée n'a aucun effet | Pas de redéploiement | §4.5 |
| Données de test dans la production après un essai sur un aperçu | Aperçu relié à la base de production | §4.4 |
| Facebook : « Application non disponible » ou connexion réservée à toi | App Meta encore en mode Development | §3 bis.4 : passer en Live |
| Facebook : erreur d'adresse de redirection | Adresse de retour absente des Valid OAuth Redirect URIs | §3 bis.3 |
| Facebook : « Unsupported provider » / « provider is not enabled » | Facebook non activé dans Supabase | §3 bis.5 |
| Facebook : « Error getting user email from external provider » | Permission `email` non ajoutée, ou compte Facebook sans e-mail | §3 bis.3 (point 4) et §3 bis.7 |
| Pas de bouton Facebook | `NEXT_PUBLIC_FACEBOOK_LOGIN` ≠ `true`, ou pas de redéploiement | §3 bis.6 |
| Meta refuse le passage en Live | Privacy policy, instructions de suppression, icône ou catégorie manquantes | §3 bis.2 |
| E-mail : le code n'arrive jamais | SMTP non configuré (envoi par défaut limité), domaine non vérifié, ou message en indésirables | §3 ter.2, puis Supabase › Logs › Auth et Resend › Logs |
| E-mail : l'e-mail contient un lien et pas de code | Modèles « Confirm signup », « Magic Link » ou « Change Email Address » non modifiés | §3 ter.4 |
| E-mail : « Trop d'essais » | Un seul envoi par minute et par adresse, ou limite horaire atteinte | Attendre 60 s ; §3 ter.2 (Rate Limits) |
| E-mail : code toujours refusé | Code expiré, ou longueur de code ≠ 6 dans Supabase | §3 ter.3 |
| E-mail : « n'est pas disponible pour le moment » | Fournisseur Email désactivé dans Supabase | §3 ter.3 |
| Pas de bouton e-mail | `NEXT_PUBLIC_EMAIL_LOGIN` ≠ `true`, ou pas de redéploiement | §3 ter.6 |

Où chercher les erreurs : Vercel › projet › **Logs** (routes `/api/*`) ; Supabase › **Logs** (Auth, Postgres, API) ; console du navigateur.

---

## 9. À savoir

- **Hors ligne** : fonctionne pour les dépenses (ajout, modification, suppression) et les cases des listes. Ne sont **pas** couverts : étapes, trajets, repas, création d'une dépense répétée.
- **Déconnexion hors ligne** : se déconnecter sans réseau efface les modifications qui n'étaient pas encore envoyées.
- **Journal** : il ne remonte que ce qui s'est passé après la 023. Il garde le nom de la personne même après la suppression de son compte (pour que l'historique reste lisible par le groupe).
- **Suppression de compte** : ton prénom reste sur les dépenses passées des voyages des autres (sans compte lié), sinon leurs soldes seraient faux.
- **`app/api/geocode/route.ts`** : le code envoie une adresse e-mail personnelle dans l'en-tête `User-Agent` à Nominatim (qui demande un contact). Remplace-la par une adresse dédiée au projet si tu ne veux pas l'exposer.
- **`schema.sql`** n'est pas à jour pour les migrations 016, 018 et 019 (voir §2.3).

---

## Annexe A — Migration 023 (contenu complet)

Fichier : `lib/supabase/migrations/023_activity_recurring_account_deletion.sql`. À coller tel quel dans le SQL Editor.

```sql
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
```

## Annexe B — Rappel : requête de diagnostic

Voir §2.2 (même requête, à relancer après chaque série de migrations).

## Annexe C — Requêtes utiles

```sql
-- Combien d'invités abandonnés (créés il y a plus de 30 jours, sans aucun voyage) ?
select count(*) from auth.users u
where u.is_anonymous
  and u.created_at < now() - interval '30 days'
  and not exists (select 1 from public.trip_members m where m.user_id = u.id);

-- Les supprimer (à lancer seulement après avoir regardé le résultat ci-dessus)
delete from auth.users u
where u.is_anonymous
  and u.created_at < now() - interval '30 days'
  and not exists (select 1 from public.trip_members m where m.user_id = u.id);

-- Dernières entrées du journal d'activité
select created_at, actor_name, entity, action, title, amount
from public.trip_activity order by created_at desc limit 20;

-- Dépenses répétées et leur prochaine échéance
select title, frequency, next_date from public.recurring_expenses order by next_date;

-- Nettoyer les données de test faites depuis un aperçu relié à la production
-- (remplace le nom ; supprime le voyage et tout ce qu'il contient)
-- delete from public.trips where name = 'NOM_DU_VOYAGE_DE_TEST';
```
