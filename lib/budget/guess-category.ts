import type { ExpenseCategory } from "@/types";

const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();

/** Du plus précis au plus général : « hôtel restaurant » est un logement, « essence » un transport. */
const RULES: [ExpenseCategory, RegExp][] = [
  ["accommodation", /\b(hotel|airbnb|logement|camping|gite|auberge|hostel|nuitee|villa|appartement|chambre|booking|loyer)\b/],
  [
    "transport",
    /\b(essence|carburant|gasoil|diesel|peage|autoroute|parking|train|sncf|tgv|ter|bus|metro|navigo|taxi|uber|vtc|bolt|vol|avion|ryanair|easyjet|ferry|bateau|trottinette|velo|location (de )?(voiture|vehicule|van|scooter))\b/,
  ],
  [
    "activities",
    /\b(musee|visite|concert|parc|excursion|activite|cinema|spectacle|entree|ski|forfait|plage|kayak|rando|surf|escape game|bowling|karting)\b/,
  ],
  [
    "restaurant",
    /\b(resto|restaurant|pizza|pizzeria|burger|kebab|sushi|cafe|bar|bistro|brasserie|glace|petit[- ]?dej|dejeuner|diner|brunch|snack|fast[- ]?food|mcdo|mcdonald|apero|biere|verre|boisson)\b/,
  ],
  [
    "courses",
    /\b(courses?|supermarche|carrefour|leclerc|lidl|auchan|intermarche|monoprix|franprix|aldi|marche|epicerie|boulangerie|primeur|boucherie|pique[- ]?nique|provisions)\b/,
  ],
];

/** Devine la catégorie d'après le titre saisi ; null si rien d'évident (on ne force jamais). */
export function guessCategory(title: string): ExpenseCategory | null {
  const t = normalize(title);
  if (t.length < 3) return null;
  for (const [category, re] of RULES) if (re.test(t)) return category;
  return null;
}
