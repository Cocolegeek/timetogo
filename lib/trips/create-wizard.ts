import { PARTICIPANT_COLORS } from "@/lib/participant-colors";
import type { TripModule } from "@/types";

export type WizardStep = "what" | "when" | "who";
export type GroupDateMode = "permanent" | "date_fixe" | "creneau";

export interface WizardParticipant {
  name: string;
  color: string;
}

export interface WizardState {
  name: string;
  /** Faux tant que le nom est celui qu'on propose d'après la destination. */
  nameTouched: boolean;
  emoji: string;
  /** Facultatif : un lieu donne un nom, un drapeau et le choix du planning. */
  destination: string;
  dateMode: GroupDateMode;
  startDate: string;
  endDate: string;
  currency: string;
  budget: string;
  /** Prénom du créateur, toujours dans le voyage (null tant que le profil n'est pas lu, ou pour un invité sans prénom). */
  creator: string | null;
  /** Personnes ajoutées à la main (le créateur n'en fait pas partie). */
  extra: WizardParticipant[];
  /** Amis de « Ta bande » cochés : ils deviennent membres liés à la création. */
  friendCount: number;
  /** Espaces choisis en plus du budget. Ignorés tant que `modulesTouched` est faux (on propose alors ceux qui vont avec la période). */
  modules: TripModule[];
  modulesTouched: boolean;
}

export interface StepIssue {
  step: WizardStep;
  message: string;
}

const ymdOk = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v);

export function stepsFor(): WizardStep[] {
  return ["what", "when", "who"];
}

/** Planning et menus ont besoin de jours : un jour précis ou une période complète. */
export function hasPeriod(s: Pick<WizardState, "dateMode" | "startDate" | "endDate">): boolean {
  if (s.dateMode === "date_fixe") return ymdOk(s.startDate);
  if (s.dateMode === "creneau") return ymdOk(s.startDate) && ymdOk(s.endDate) && s.endDate >= s.startDate;
  return false;
}

/** Ce qu'on propose tant qu'on n'a pas choisi : planning et menus quand il y a des jours, jamais les listes. */
export function defaultModules(s: Pick<WizardState, "dateMode" | "startDate" | "endDate">): TripModule[] {
  return hasPeriod(s) ? ["planning", "menus"] : [];
}

/** Les espaces réellement créés : le choix de la personne, sans planning ni menus quand il n'y a pas de jours. */
export function effectiveModules(s: WizardState): TripModule[] {
  const chosen = s.modulesTouched ? s.modules : defaultModules(s);
  const period = hasPeriod(s);
  return chosen.filter((m) => period || m === "lists");
}

/** « Rome, Latium, Italie » devient « Rome ». */
export function firstPlace(destination: string): string {
  return destination.split(",")[0].trim();
}

export function suggestName(destination: string): string {
  const place = firstPlace(destination);
  return place ? `Voyage à ${place}` : "";
}

export function effectiveName(s: Pick<WizardState, "name" | "nameTouched" | "destination">): string {
  const typed = s.name.trim();
  if (s.nameTouched && typed) return typed;
  return suggestName(s.destination) || typed;
}

/** Le créateur d'abord (couleur 1), puis les autres : une seule liste, pas deux sources de vérité. */
export function participantsOf(s: Pick<WizardState, "creator" | "extra">): WizardParticipant[] {
  const first = s.creator ? [{ name: s.creator, color: PARTICIPANT_COLORS[0] }] : [];
  return [...first, ...s.extra];
}

const norm = (v: string) =>
  v
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase();

/** Ajoute un prénom ; refuse le vide et les doublons (« léa » et « Léa » sont la même personne). */
export function addPerson(
  s: Pick<WizardState, "creator" | "extra">,
  raw: string
): { extra: WizardParticipant[]; error: string | null } {
  const name = raw.trim().replace(/\s+/g, " ");
  if (!name) return { extra: s.extra, error: null };
  if (participantsOf(s).some((p) => norm(p.name) === norm(name))) {
    return { extra: s.extra, error: `Il y a déjà un « ${name} » dans le voyage.` };
  }
  const color = PARTICIPANT_COLORS[participantsOf(s).length % PARTICIPANT_COLORS.length];
  return { extra: [...s.extra, { name, color }], error: null };
}

export function parseAmount(raw: string): number | null {
  const t = raw.replace(",", ".").trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) && n > 0 ? n : NaN;
}

/** Ce qui empêche de passer à la suite, dit en clair. null = on peut continuer. */
export function validateStep(step: WizardStep, s: WizardState): StepIssue | null {
  if (step === "what" && !effectiveName(s)) return { step, message: "Donne un nom pour continuer." };
  if (step === "when") {
    const needsStart = s.dateMode !== "permanent";
    const needsEnd = s.dateMode === "creneau";
    if (needsStart && !ymdOk(s.startDate)) return { step, message: s.dateMode === "creneau" ? "Choisis la date de départ." : "Choisis le jour." };
    if (needsEnd && !ymdOk(s.endDate)) return { step, message: "Choisis la date de retour." };
    if (needsEnd && s.endDate < s.startDate) return { step, message: "Le retour doit être après le départ." };
  }
  if (step === "who") {
    if (participantsOf(s).length + s.friendCount === 0) {
      return { step, message: s.creator ? "Ajoute au moins une personne." : "Commence par ton prénom, tu fais partie de la bande." };
    }
    if (Number.isNaN(parseAmount(s.budget))) return { step, message: "Le budget doit être un montant positif." };
  }
  return null;
}

/** Première étape en défaut, pour y revenir au lieu d'échouer en silence à la création. */
export function firstIssue(s: WizardState): StepIssue | null {
  for (const step of stepsFor()) {
    const issue = validateStep(step, s);
    if (issue) return issue;
  }
  return null;
}

export interface CreatePayload {
  name: string;
  emoji: string;
  currency: string;
  destination?: string;
  startDate?: string;
  endDate?: string;
  totalBudget?: number;
  participants: WizardParticipant[];
  modules: TripModule[];
}

export function buildPayload(s: WizardState): CreatePayload {
  const budget = parseAmount(s.budget);
  const place = s.destination.trim();
  return {
    name: effectiveName(s),
    emoji: s.emoji,
    currency: s.currency,
    totalBudget: budget && budget > 0 ? budget : undefined,
    participants: participantsOf(s),
    modules: effectiveModules(s),
    destination: place || undefined,
    startDate: s.dateMode === "permanent" ? undefined : s.startDate,
    endDate: s.dateMode === "date_fixe" ? s.startDate : s.dateMode === "creneau" ? s.endDate : undefined,
  };
}

// ─── Dates rapides ────────────────────────────────────────────────────────

const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

export interface DatePreset {
  id: "weekend" | "nextweek" | "twoweeks";
  label: string;
  start: string;
  end: string;
}

/** Trois départs courants, calculés sur le calendrier local : un toucher et c'est réglé. */
export function datePresets(today: Date): DatePreset[] {
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const dow = t.getDay(); // 0 = dimanche
  const untilFriday = dow === 5 ? 0 : (5 - dow + 7) % 7 || 7;
  const friday = addDays(t, dow === 0 || dow === 6 ? ((5 - dow + 7) % 7) : untilFriday);
  const untilMonday = ((1 - dow + 7) % 7) || 7;
  const monday = addDays(t, untilMonday);
  const untilSaturday = ((6 - dow + 7) % 7) || 7;
  const saturday = addDays(t, untilSaturday);
  return [
    { id: "weekend", label: "Ce week-end", start: ymd(friday), end: ymd(addDays(friday, 2)) },
    { id: "nextweek", label: "Semaine prochaine", start: ymd(monday), end: ymd(addDays(monday, 6)) },
    { id: "twoweeks", label: "2 semaines", start: ymd(saturday), end: ymd(addDays(saturday, 13)) },
  ];
}

export function tripLength(start: string, end: string): { days: number; nights: number } | null {
  if (!ymdOk(start) || !ymdOk(end) || end < start) return null;
  const [sy, sm, sd] = start.split("-").map(Number);
  const [ey, em, ed] = end.split("-").map(Number);
  const nights = Math.round((new Date(ey, em - 1, ed).getTime() - new Date(sy, sm - 1, sd).getTime()) / 86400000);
  return { days: nights + 1, nights };
}

export function initialState(creator: string | null = null): WizardState {
  return {
    name: "",
    nameTouched: false,
    emoji: "💰",
    destination: "",
    dateMode: "permanent",
    startDate: "",
    endDate: "",
    currency: "EUR",
    budget: "",
    creator,
    extra: [],
    friendCount: 0,
    modules: [],
    modulesTouched: false,
  };
}
