"use client";

import { EmojiIcon } from "@/components/shared/EmojiIcon";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, m as motion } from "framer-motion";
import { ArrowLeft, Check, ChevronDown, Loader2, Plus, X } from "lucide-react";
import { Burst } from "@/components/motion/Burst";
import { DateField } from "@/components/shared/DateTimeFields";
import { DateRangePicker } from "@/components/shared/DateRangePicker";
import { LocationPickerSheet } from "@/components/shared/LocationPickerSheet";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { FriendPicker } from "@/components/trips/FriendPicker";
import { TripCover } from "@/components/trips/TripCover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addFriendsToTrip, useFriends } from "@/hooks/useFriends";
import { useProfile } from "@/hooks/useProfile";
import { useTrips } from "@/hooks/useTrip";
import { TRIP_CURRENCIES } from "@/lib/currencies";
import { formatDateRange } from "@/lib/format-date";
import { haptic } from "@/lib/haptics";
import { EASE_OUT, spring } from "@/lib/motion";
import { isOfflineError } from "@/lib/offline/outbox";
import { PARTICIPANT_COLORS } from "@/lib/participant-colors";
import {
  addPerson,
  buildPayload,
  datePresets,
  effectiveName,
  firstIssue,
  firstPlace,
  initialState,
  participantsOf,
  stepsFor,
  suggestName,
  tripLength,
  validateStep,
  type GroupDateMode,
  type WizardState,
  type WizardStep,
  type WizardType,
} from "@/lib/trips/create-wizard";
import { flagEmoji, tripEmojiChoices } from "@/lib/trip-emojis";
import { cn } from "@/lib/utils";

const GROUP_EMOJIS = ["💰", "🏠", "🎂", "🎉", "🍕", "🏖️", "🚗", "🎁"];
const GROUP_IDEAS = ["Coloc", "Anniversaire", "Week-end", "Soirée", "Vacances"];

const GROUP_DATE_OPTIONS: { mode: GroupDateMode; title: string; hint: string }[] = [
  { mode: "permanent", title: "Sans date", hint: "Un budget qui dure, comme une coloc." },
  { mode: "date_fixe", title: "Un jour précis", hint: "Un anniversaire, une soirée." },
  { mode: "creneau", title: "Une période", hint: "Un week-end, des vacances." },
];

const TITLES: Record<WizardStep, { title: string; hint: string }> = {
  where: { title: "Où pars-tu ?", hint: "Une ville, un pays ou une adresse. Tout se modifie plus tard." },
  what: { title: "Comment l'appelles-tu ?", hint: "Le nom que verront tes potes." },
  when: { title: "C'est pour quand ?", hint: "Un toucher sur un raccourci, ou choisis tes dates." },
  who: { title: "Avec qui ?", hint: "Toi et ceux qui partagent les dépenses." },
};

function friendlyError(err: unknown): string {
  if (isOfflineError(err)) return "Pas de connexion. Réessaie dès que le réseau est revenu.";
  const e = err as { message?: string; details?: string; code?: string } | null;
  const parts = [e?.message, e?.details, e?.code ? `[${e.code}]` : null].filter(Boolean);
  return parts.length ? `Impossible de créer pour le moment. ${parts.join(" · ")}` : "Impossible de créer pour le moment. Réessaie dans un instant.";
}

export function CreateWizard({ type }: { type: WizardType }) {
  const router = useRouter();
  const { createTrip } = useTrips();
  const { profile } = useProfile();
  const { friends } = useFriends();
  const steps = stepsFor(type);

  const [base, setBase] = useState<WizardState>(() => initialState(type, new Date()));
  const [friendIds, setFriendIds] = useState<string[]>(() => {
    const w = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("with") : null;
    return w ? [w] : [];
  });
  const [stepIndex, setStepIndex] = useState(0);
  const [dir, setDir] = useState(1);
  const [issue, setIssue] = useState<string | null>(null);
  const [shake, setShake] = useState(0);
  const [country, setCountry] = useState<string | null>(null);
  const [emojiPicked, setEmojiPicked] = useState(false);
  const [newName, setNewName] = useState("");
  const [moreOpen, setMoreOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [doneId, setDoneId] = useState<string | null>(null);
  const issueRef = useRef<HTMLParagraphElement>(null);

  const creator = profile?.name?.split(" ")[0]?.trim() || null;
  const chosenFriends = friends.filter((f) => friendIds.includes(f.id));
  // Une seule source de vérité : le créateur et les amis sont dérivés, jamais recopiés.
  const flag = type === "trip" ? flagEmoji(country) : null;
  const s: WizardState = useMemo(
    () => ({ ...base, emoji: emojiPicked ? base.emoji : (flag ?? base.emoji), creator, friendCount: friendIds.length }),
    [base, emojiPicked, flag, creator, friendIds.length]
  );
  const step = steps[stepIndex];
  const people = participantsOf(s);
  const patch = (p: Partial<WizardState>) => {
    setBase((b) => ({ ...b, ...p }));
    setIssue(null);
  };

  const fail = (message: string) => {
    setIssue(message);
    setShake((n) => n + 1);
    haptic("warning");
  };

  useEffect(() => {
    if (issue) issueRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [issue, shake]);

  const goTo = (index: number) => {
    setDir(index > stepIndex ? 1 : -1);
    setStepIndex(index);
  };

  const submit = async () => {
    const problem = firstIssue(s);
    if (problem) {
      goTo(steps.indexOf(problem.step));
      fail(problem.message);
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      const payload = buildPayload(s);
      const id = await createTrip(payload);
      await addFriendsToTrip(
        id,
        chosenFriends.map((f, i) => ({ id: f.id, color: PARTICIPANT_COLORS[(payload.participants.length + i) % PARTICIPANT_COLORS.length] }))
      ).catch(() => 0);
      haptic("success");
      setDoneId(id);
      setTimeout(() => router.push(`/trips/${id}`), 1400);
    } catch (err) {
      console.error("[create-trip]", err);
      setSubmitError(friendlyError(err));
      setSubmitting(false);
    }
  };

  const next = () => {
    if (submitting) return;
    const problem = validateStep(step, s);
    if (problem) return fail(problem.message);
    setIssue(null);
    if (stepIndex < steps.length - 1) {
      haptic("light");
      goTo(stepIndex + 1);
    } else {
      void submit();
    }
  };

  const back = () => {
    setIssue(null);
    goTo(Math.max(0, stepIndex - 1));
  };

  const addName = () => {
    const r = addPerson(s, newName);
    if (r.error) return fail(r.error);
    if (newName.trim()) haptic("light");
    patch({ extra: r.extra });
    setNewName("");
  };

  const shownName = s.nameTouched ? s.name : type === "trip" ? suggestName(s.destination) : s.name;
  const title = effectiveName(s) || (type === "trip" ? "Ton voyage" : "Ton budget");
  const dates = (() => {
    if (type === "group" && s.dateMode === "permanent") return "";
    if (s.startDate && (s.endDate || s.dateMode === "date_fixe")) return formatDateRange(s.startDate, s.dateMode === "date_fixe" ? s.startDate : s.endDate);
    return "";
  })();
  const presets = useMemo(() => datePresets(new Date()), []);
  const length = tripLength(s.startDate, s.endDate);
  const ctaLabel = stepIndex < steps.length - 1 ? "Continuer" : type === "trip" ? "Créer le voyage" : "Créer le budget";
  const emojis = type === "trip" ? tripEmojiChoices(country) : GROUP_EMOJIS;
  const pickEmoji = (e: string) => {
    setEmojiPicked(true);
    patch({ emoji: e });
  };

  if (doneId) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: EASE_OUT }}
        className="flex min-h-[60dvh] flex-col items-center justify-center gap-5 text-center"
      >
        <span className="animate-pop relative flex size-20 items-center justify-center rounded-[1.5rem] bg-emerald-500 text-white shadow-raised">
          <Check size={38} strokeWidth={2.6} aria-hidden="true" />
          <Burst />
        </span>
        <div className="space-y-1.5">
          <h2 className="font-display text-[2rem] leading-tight font-extrabold tracking-[-0.03em]">{type === "trip" ? "Voyage créé" : "Budget créé"}</h2>
          <p className="text-muted-foreground">{title}</p>
        </div>
        <Button size="lg" onClick={() => router.push(`/trips/${doneId}`)} className="shadow-section">
          Ouvrir
        </Button>
      </motion.div>
    );
  }

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        next();
      }}
      className="pb-36"
    >
      {/* Progression */}
      <div className="mb-4 flex gap-1.5" role="progressbar" aria-valuemin={1} aria-valuemax={steps.length} aria-valuenow={stepIndex + 1} aria-label={`Étape ${stepIndex + 1} sur ${steps.length}`}>
        {steps.map((st, i) => (
          <span key={st} className="h-1.5 flex-1 overflow-hidden rounded-full bg-foreground/10">
            <motion.span
              className="block h-full rounded-full bg-primary"
              initial={false}
              animate={{ width: i <= stepIndex ? "100%" : "0%" }}
              transition={spring}
            />
          </span>
        ))}
      </div>

      {/* Aperçu en direct */}
      <TripCover seed={type} variant={type === "trip" ? 1 : 4} className="mb-6 h-32 rounded-[1.5rem]">
        <div className="absolute inset-x-3 bottom-3 flex items-center gap-3 rounded-2xl bg-card p-3 shadow-card">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-secondary text-2xl" aria-hidden="true">
            <EmojiIcon emoji={s.emoji} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate font-display text-[1.05rem] font-bold tracking-tight">{title}</span>
            <span className="block truncate text-sm text-muted-foreground">
              {[type === "trip" ? firstPlace(s.destination) : "", dates, people.length + friendIds.length > 1 ? `${people.length + friendIds.length} pers.` : ""]
                .filter(Boolean)
                .join(" · ") || (type === "trip" ? "Dis-nous où tu pars" : "Dis-nous ce que c'est")}
            </span>
          </span>
        </div>
      </TripCover>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={step}
          initial={{ opacity: 0, x: dir * 28 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: dir * -28 }}
          transition={{ duration: 0.22, ease: EASE_OUT }}
          className="space-y-5"
        >
          <header className="space-y-1">
            <h2 className="font-display text-[1.75rem] leading-[1.1] font-extrabold tracking-[-0.03em]">{TITLES[step].title}</h2>
            <p className="text-[0.95rem] text-muted-foreground">{step === "when" && type === "group" ? "Facultatif, tu pourras le changer plus tard." : TITLES[step].hint}</p>
          </header>

          {step === "where" && (
            <div className="space-y-4">
              <LocationPickerSheet
                value={s.destination}
                onChange={(v) => patch({ destination: v })}
                onChangeCoord={(c) => setCountry(c?.countryCode ?? null)}
                placeholder="Rome, Italie"
              />
              <AnimatePresence initial={false}>
                {firstPlace(s.destination) && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                    <div className="space-y-3 pt-1">
                      <label htmlFor="trip-name" className="px-1 text-sm font-semibold">
                        Nom du voyage
                      </label>
                      <Input
                        id="trip-name"
                        value={shownName}
                        onChange={(e) => patch({ name: e.target.value, nameTouched: e.target.value.trim().length > 0 })}
                        placeholder={suggestName(s.destination)}
                        enterKeyHint="next"
                      />
                      <EmojiRow emojis={emojis} value={s.emoji} onPick={pickEmoji} />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {step === "what" && (
            <div className="space-y-4">
              <Input
                autoFocus
                value={s.name}
                onChange={(e) => patch({ name: e.target.value, nameTouched: true })}
                placeholder="Coloc, anniversaire de Léa…"
                aria-label="Nom du budget"
                enterKeyHint="next"
              />
              <div className="flex flex-wrap gap-2">
                {GROUP_IDEAS.map((idea) => (
                  <button
                    key={idea}
                    type="button"
                    onClick={() => patch({ name: idea, nameTouched: true })}
                    className="pressable h-10 rounded-full bg-foreground/[0.06] px-4 text-sm font-semibold transition-colors hover:bg-foreground/[0.1]"
                  >
                    {idea}
                  </button>
                ))}
              </div>
              <EmojiRow emojis={emojis} value={s.emoji} onPick={pickEmoji} />
            </div>
          )}

          {step === "when" && type === "trip" && (
            <div className="space-y-4">
              <PresetChips presets={presets} start={s.startDate} end={s.endDate} onPick={(p) => patch({ startDate: p.start, endDate: p.end })} />
              <DateRangePicker startDate={s.startDate} endDate={s.endDate} onChange={(start, end) => patch({ startDate: start, endDate: end })} />
              {length && (
                <p className="px-1 text-sm font-medium">
                  {formatDateRange(s.startDate, s.endDate)} · {length.days} jour{length.days > 1 ? "s" : ""}
                  {length.nights > 0 ? `, ${length.nights} nuit${length.nights > 1 ? "s" : ""}` : ""}
                </p>
              )}
            </div>
          )}

          {step === "when" && type === "group" && (
            <div className="space-y-3">
              <div role="radiogroup" aria-label="Type de date" className="space-y-2">
                {GROUP_DATE_OPTIONS.map((o) => {
                  const on = s.dateMode === o.mode;
                  return (
                    <button
                      key={o.mode}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      onClick={() => {
                        const t = presets[0].start;
                        patch({
                          dateMode: o.mode,
                          startDate: o.mode === "permanent" ? "" : s.startDate || t,
                          endDate: o.mode === "creneau" ? s.endDate || presets[0].end : "",
                        });
                      }}
                      className={cn(
                        "pressable flex w-full items-center gap-3 rounded-2xl p-4 text-left transition-colors",
                        on ? "bg-primary text-primary-foreground" : "bg-secondary hover:bg-foreground/[0.08]"
                      )}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block text-[1.02rem] font-semibold">{o.title}</span>
                        <span className={cn("block text-sm", on ? "text-primary-foreground/70" : "text-muted-foreground")}>{o.hint}</span>
                      </span>
                      {on && <Check size={20} strokeWidth={2.6} aria-hidden="true" />}
                    </button>
                  );
                })}
              </div>
              {s.dateMode === "date_fixe" && (
                <DateField id="group-date" label="Jour" value={s.startDate} onChange={(v) => patch({ startDate: v })} />
              )}
              {s.dateMode === "creneau" && (
                <DateRangePicker startDate={s.startDate} endDate={s.endDate} onChange={(start, end) => patch({ startDate: start, endDate: end })} />
              )}
            </div>
          )}

          {step === "who" && (
            <div className="space-y-4">
              <ul className="flex flex-wrap gap-2" aria-label="Participants">
                {people.map((p, i) => {
                  const isCreator = !!creator && i === 0;
                  return (
                    <li key={`${p.name}-${i}`} className="flex items-center gap-2 rounded-full bg-secondary py-1.5 pr-2 pl-1.5">
                      <span className="flex size-8 items-center justify-center rounded-full text-xs font-bold text-white" style={{ backgroundColor: p.color }}>
                        {p.name.slice(0, 2).toUpperCase()}
                      </span>
                      <span className="text-[0.95rem] font-medium">{p.name}</span>
                      {isCreator ? (
                        <span className="pr-2 text-xs text-muted-foreground">toi</span>
                      ) : (
                        <button
                          type="button"
                          aria-label={`Retirer ${p.name}`}
                          onClick={() => patch({ extra: s.extra.filter((x) => x !== p) })}
                          className="flex size-7 items-center justify-center rounded-full text-muted-foreground hover:text-red-400"
                        >
                          <X size={15} />
                        </button>
                      )}
                    </li>
                  );
                })}
                {chosenFriends.map((f) => (
                  <li key={f.id} className="flex items-center gap-2 rounded-full bg-secondary py-1.5 pr-2 pl-1.5">
                    <UserAvatar src={f.avatar} name={f.name} size={32} />
                    <span className="text-[0.95rem] font-medium">{f.name?.split(" ")[0]}</span>
                    <button
                      type="button"
                      aria-label={`Retirer ${f.name?.split(" ")[0] ?? ""}`}
                      onClick={() => setFriendIds((ids) => ids.filter((x) => x !== f.id))}
                      className="flex size-7 items-center justify-center rounded-full text-muted-foreground hover:text-red-400"
                    >
                      <X size={15} />
                    </button>
                  </li>
                ))}
              </ul>

              <div className="flex gap-2">
                <Input
                  value={newName}
                  onChange={(e) => {
                    setNewName(e.target.value);
                    setIssue(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newName.trim()) {
                      e.preventDefault();
                      addName();
                    }
                  }}
                  placeholder={creator ? "Ajouter un prénom" : "Ton prénom"}
                  aria-label={creator ? "Ajouter un prénom" : "Ton prénom"}
                  autoCapitalize="words"
                  enterKeyHint="done"
                />
                <Button type="button" onClick={addName} size="icon" className="size-12 shrink-0 rounded-2xl" aria-label="Ajouter">
                  <Plus size={18} />
                </Button>
              </div>

              <FriendPicker selected={friendIds} onToggle={(f) => setFriendIds((ids) => (ids.includes(f.id) ? ids.filter((x) => x !== f.id) : [...ids, f.id]))} />

              <div className="rounded-[1.25rem] bg-secondary">
                <button
                  type="button"
                  onClick={() => setMoreOpen((v) => !v)}
                  aria-expanded={moreOpen}
                  className="flex min-h-12 w-full items-center justify-between px-4 text-left text-[0.95rem] font-semibold"
                >
                  Devise et budget
                  <ChevronDown size={18} className={cn("transition-transform", moreOpen && "rotate-180")} aria-hidden="true" />
                </button>
                {moreOpen && (
                  <div className="space-y-4 border-t border-border px-4 py-4">
                    <div className="flex flex-wrap gap-2" role="group" aria-label="Devise">
                      {TRIP_CURRENCIES.map((c) => (
                        <button
                          key={c}
                          type="button"
                          aria-pressed={s.currency === c}
                          onClick={() => patch({ currency: c })}
                          className={cn(
                            "pressable h-10 rounded-full px-4 text-sm font-semibold transition-colors",
                            s.currency === c ? "bg-primary text-primary-foreground" : "bg-card hover:bg-foreground/[0.08]"
                          )}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                    <div className="relative">
                      <Input
                        inputMode="decimal"
                        value={s.budget}
                        onChange={(e) => patch({ budget: e.target.value.replace(/[^0-9.,]/g, "") })}
                        onFocus={(e) => e.target.select()}
                        placeholder="Budget prévu (facultatif)"
                        aria-label="Budget prévu, facultatif"
                        className="pr-14 tabular-nums"
                      />
                      <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-muted-foreground">{s.currency}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {(issue || submitError) && (
        <p
          key={shake}
          ref={issueRef}
          role="alert"
          className="animate-shake mt-5 rounded-2xl bg-red-500/10 px-4 py-3 text-[0.95rem] font-medium text-red-400"
        >
          {issue ?? submitError}
        </p>
      )}

      {/* Barre d'action : toujours visible, jamais grisée sans explication */}
      <div
        className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background px-5 pt-3"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 0.9rem)" }}
      >
        <div className="mx-auto flex max-w-xl items-center gap-2">
          {stepIndex > 0 && (
            <Button type="button" variant="secondary" size="lg" onClick={back} aria-label="Étape précédente" disabled={submitting}>
              <ArrowLeft size={18} />
            </Button>
          )}
          <Button type="submit" size="lg" disabled={submitting} className="flex-1 shadow-section">
            {submitting ? <Loader2 size={18} className="animate-spin" /> : ctaLabel}
          </Button>
        </div>
      </div>
    </form>
  );
}

function EmojiRow({ emojis, value, onPick }: { emojis: string[]; value: string; onPick: (e: string) => void }) {
  return (
    <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5" role="group" aria-label="Emoji">
      {emojis.map((e) => (
        <button
          key={e}
          type="button"
          aria-pressed={value === e}
          onClick={() => onPick(e)}
          className={cn(
            "pressable flex size-12 shrink-0 items-center justify-center rounded-2xl text-2xl transition-colors",
            value === e ? "bg-primary/12 ring-2 ring-primary ring-inset" : "bg-foreground/[0.06] hover:bg-foreground/[0.1]"
          )}
        >
          <EmojiIcon emoji={e} />
        </button>
      ))}
    </div>
  );
}

function PresetChips({
  presets,
  start,
  end,
  onPick,
}: {
  presets: ReturnType<typeof datePresets>;
  start: string;
  end: string;
  onPick: (p: ReturnType<typeof datePresets>[number]) => void;
}) {
  return (
    <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5" role="group" aria-label="Raccourcis de dates">
      {presets.map((p) => {
        const on = p.start === start && p.end === end;
        return (
          <button
            key={p.id}
            type="button"
            aria-pressed={on}
            onClick={() => {
              haptic("light");
              onPick(p);
            }}
            className={cn(
              "pressable h-11 shrink-0 rounded-full px-4 text-sm font-semibold transition-colors",
              on ? "bg-primary text-primary-foreground" : "bg-foreground/[0.06] hover:bg-foreground/[0.1]"
            )}
          >
            {p.label}
          </button>
        );
      })}
    </div>
  );
}
