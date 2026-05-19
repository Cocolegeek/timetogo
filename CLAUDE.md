@AGENTS.md

# Voyou — Project Context

## Stack
- **Next.js 16 / React 19** — App Router, TypeScript, no Pages Router
- **Supabase** — PostgreSQL + RLS + Google OAuth via `@supabase/ssr`
- **UI** — shadcn/ui (style: base-nova) + Tailwind CSS 4 + Framer Motion + Lucide
- **Forms** — react-hook-form + Zod v4
- **State** — Custom hooks + local useState (no Redux/Zustand)

## Trip vs Group (discriminated union)

Le projet gère deux types d'entités via la même table `trips`, distinguées par la colonne `type`:
- **`type: "trip"`** — voyage complet (destination, dates, planning, menus, budget)
- **`type: "group"`** — budget partagé style Tricount (nom + participants + budget seulement)

`types/index.ts` exporte une discriminated union `Trip = VoyageTrip | GroupTrip`. TypeScript force le narrowing avant d'accéder à `destination` / `startDate` / `endDate`.

**Source de vérité des features** : `lib/trip-features.ts` (`tripFeatures(trip)`, `isVoyage(trip)`, `isGroup(trip)`, `TRIP_TYPE_LABELS`). Tous les rendus conditionnels passent par là — ne pas ré-écrire de `trip.type === "..."` ailleurs.

## Route Map
```
app/
  page.tsx               → redirects to /trips
  login/page.tsx         → Google OAuth entry
  auth/callback/route.ts → exchanges OAuth code for session
  consent/page.tsx       → GDPR consent (shown once after first login)
  api/consent/route.ts   → POST: saves consent to DB, redirects to /trips
  api/geocode/route.ts   → GET ?q= → { lat, lon } via Nominatim (server-side)
  api/routing/route.ts   → GET ?from=&to=&mode= → { durationMinutes, distanceKm } via OSRM
  join/page.tsx          → join trip by share code
  settings/page.tsx      → profile + theme
  trips/
    page.tsx             → list all trips
    new/page.tsx         → trip creation wizard (TripWizard | GroupWizard)
    [tripId]/
      layout.tsx         → trip nav + context (wraps TripClientProviders)
      page.tsx           → trip dashboard
      budget/page.tsx    → 2-tab expense tracker (Dépenses / Soldes+Régler)
      menus/page.tsx     → meal planning
      planning/page.tsx  → itinerary builder (étapes + trajets)
proxy.ts                 → middleware: enforces auth on all routes except /login /auth/callback /join /consent
```

## Component Map
```
components/
  budget/     AllSettledEmpty, IAmSettledEmpty,
              BalancesView,        — onglet Soldes : "Ils me doivent" / "Je leur dois" /
                                     dépliable "Entre les autres" + grille balances + sheets paiement
              ExpenseCard,         — swipe-to-delete card; tap opens ExpenseDetailSheet
              ExpenseDetailSheet,  — bottom sheet: read-only detail with Edit/Delete actions
              ExpenseForm,         — Sheet 92dvh, 3 tabs Infos | Payé par | Pour qui
              ExpenseList,         — grouped by date, sticky headers with daily total
              ParticipantPaymentSheet — bottom sheet: copy IBAN/tél, share via navigator.share
  layout/     AppHeader, GlassCard, MeshGradientBackground, SectionThemeController,
              TripAppHeader, TripNav, TripClientProviders, UserMenu, VoyouLogo
  menus/      MealEditDialog
  planning/   ItineraryItemForm,  — full-screen dialog: title/date/type/location/participants
              JourneyForm          — full-screen dialog: from→to, mode, routing/duration, participants
  shared/     AvatarUpload, ConfirmDeleteDialog, DateRangePicker, DayHeader, EmptyState,
              ImageCropDialog, IosInstallBanner,
              LocationPickerSheet, — tap → 88dvh Sheet with large search + Nominatim results;
                                     exports LocationCoord; onChangeCoord passes lat/lon directly
              MapAppIcons,         — GoogleMapsIcon, WazeIcon, AppleMapsIcon, CityMapperIcon, GoogleFlightsIcon
              MapAppPicker,        — MapAppPickerProvider + useOpenLocation() context hook
              ParticipantAvatar, ParticipantStack, PwaInstallBanner, SectionLabel, Spinner
  trips/      BudgetEditDialog, GroupWizard, IdentityPicker, OnboardingModal, ShareModal,
              TripCard, TripEditDialog, TripEditWrapper, TripWizard
  ui/         shadcn primitives (button, card, dialog, dropdown-menu, input, label,
              progress, select, separator, sheet, tabs, textarea, badge)
```

## Hooks (all `"use client"`, call `createClient()` internally)
```typescript
useTrips()              → { trips, loading, refetch, createTrip, deleteTrip }           // hooks/useTrip.ts
useTrip(id)             → { trip, loading, refetch, updateTrip, setMyParticipant,
                            addParticipant, updateParticipant, deleteParticipant }       // hooks/useTrip.ts
useBudget(id)           → { expenses, loading, refetch, addExpense, updateExpense,
                            deleteExpense, totalSpent }
useMeals(id)            → { meals, loading, refetch, updateMeal, deleteMeal }
useItinerary(id)        → { items, loading, refetch, addItem, updateItem, deleteItem }
useProfile()            → { profile, loading, refetch, updateProfile, signOut }
useDebts(id)            → computed balances/settlements (no direct DB)
useTheme()              → localStorage toggle (key: "voyou-theme")
useUserId()             → current user uuid (fast, no extra fetch)
useRevalidateOnFocus()  → re-calls refetch on window focus (pass a refetch fn)
```

## Lib / Utils
```
lib/
  supabase/client.ts    → createBrowserClient() — use in hooks/client components
  supabase/server.ts    → createServerClient() with cookies — use in server components/API routes
  supabase/schema.sql   → canonical schema with RLS (up to migration 015)
  supabase/migrations/  → 001..015_*.sql (008: RGPD, 009: multi-payer, 010: trip type,
                          011: lock join lookups, 012: join_trip RPC, 013: custom avatars,
                          014: anon join preview, 015: create_trip_with_owner RPC)
  trip-features.ts      → tripFeatures(trip), isVoyage(t), isGroup(t), TRIP_TYPE_LABELS
  budget/splits.ts      → computeShares(equal|percentage|fixed), buildDefaultSplits()
  budget/debts.ts       → computeBalances(), simplifyDebts() (greedy O(n log n))
  budget/categories.ts  → courses|restaurant|activities|transport|accommodation|other
                          (reimbursement exists in CATEGORIES but NOT in CATEGORY_ORDER — hidden from UI)
  budget/schemas.ts     → Zod schemas for expenses
  budget/budget-color.ts → getBudgetColor(pct), getBudgetTextColor(pct)
  format-currency.ts    → formatCurrency(amount, currency), currencySymbol(currency)
  format-date.ts        → date formatting
  image-crop.ts         → getCroppedImg() for AvatarUpload / ImageCropDialog
  map-apps.ts           → MapAppId type + map app metadata
  meals/slots.ts        → DEFAULT_SLOTS, eachDate(), buildDefaultMealRows()
  meals/categories.ts   → home|picnic|restaurant
  planning-day.ts       → itinerary day grouping
  section-theme.ts      → getSection() → maps pathname to CSS section token (used by SectionThemeController)
  trip-share.ts         → generateShareCode(), buildShareUrl()
  utils.ts              → cn() (clsx + tailwind-merge), firstName()
```

## DB Schema (key tables)
```
profiles          id, name, avatar_url, custom_avatar_url, email,
                  gdpr_consented_at, gdpr_consent_version, gdpr_consent_proof
trips             id, name, type ('trip'|'group'), destination?, emoji, icon_url?,
                  currency, start_date?, end_date?, total_budget, share_code(UNIQUE), owner_id
                  // destination/start_date/end_date nullable for type='group'
participants      id, trip_id, name, color, avatar?
trip_members      trip_id + user_id (composite PK), participant_id, role: owner|contributor
expenses          id, trip_id, title, amount, currency, exchange_rate, amount_in_trip_currency,
                  category, paid_by_id (legacy), payers: jsonb[], date, split_mode, splits: jsonb[], notes
meals             id, trip_id, date, slot: breakfast|lunch|snack|dinner, title?, category,
                  participant_ids: uuid[], cook_ids: uuid[],
                  dishes: [{id, course: starter|main|cheese|dessert|other, name, ingredients:[{id,name,quantity}]}],
                  position
                  // title est une note optionnelle (ex "Chez Léa") depuis 020. Les plats vivent dans dishes[].
                  // Meals créés à la demande via la page menus (plus de pré-remplissage matin/midi/soir).
itinerary_items   id, trip_id, date, time, title, location, type, duration_minutes, participant_ids: uuid[]
                  // type: 'accommodation'|'activity'|'food'|'other'|'journey'
                  // journey extras: destination (text), journey_mode ('car'|'foot'|'bike'|'transit'|'plane')
```
RPCs: `create_trip_with_owner`, `join_trip`, `get_join_preview` (all SECURITY DEFINER — see schema.sql).
DB rows are snake_case; UI types (types/index.ts) are camelCase. Use `rowToTrip()` / `rowToExpense()` etc. for conversion.

## UX Patterns (enforced — do not regress)

### Location input
**Always use `LocationPickerSheet`**, never raw text input or the old `LocationAutocomplete`.
- Tap → 88dvh bottom Sheet with large search field + Nominatim results split into main name / subtitle
- `onChangeCoord` returns `LocationCoord` directly from the Nominatim result — no extra `/api/geocode` call needed
- Used in: `ItineraryItemForm`, `JourneyForm`, `TripWizard`, `TripEditDialog`

### Full-screen forms
All creation/edit forms are full-screen or near-full-screen on mobile:
- **Sheet 92dvh** (bottom): `ExpenseForm`, `MapAppPicker`
- **Sheet 88dvh** (bottom): `LocationPickerSheet`, `ExpenseDetailSheet`
- **Dialog full-screen mobile / centered desktop**: `ItineraryItemForm`, `JourneyForm`, `MealEditDialog`

### Expense flow
Tap card → `ExpenseDetailSheet` (read-only: amount, payers, splits) → "Modifier" → `ExpenseForm`.
Swipe left on card = direct delete (no extra confirmation needed — the gesture is the confirmation).

### Number inputs
All `<input type="number">` and amount text inputs must have `onFocus={(e) => e.target.select()}` so tapping replaces the value immediately.

### Map app redirection
`useOpenLocation()` from `MapAppPickerProvider` — call with a location string, shows the branded picker sheet. Deep links use coordinates when available (from `LocationPickerSheet.onChangeCoord`).

## Coding Conventions
- **Client/Server split**: hooks and interactive components → `"use client"`. Pages/layouts default to RSC.
- **No bare SQL**: always use Supabase query builder (`supabase.from().select().eq()...`)
- **Mutations**: call hook method → hook auto-refetches. Never mutate local state directly.
- **Forms**: react-hook-form + Zod in dialogs/modals. Multi-step → TripWizard pattern.
- **Styling**: Tailwind utility classes + CSS custom properties for theme. `cn()` for conditional classes.
- **Icons**: Lucide only (never emoji as icon in code, except TripWizard emoji picker).
- **No comments** unless WHY is non-obvious.
- **Env vars**: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Common Patterns

### Auth check in server component
```typescript
import { createClient } from "@/lib/supabase/server";
const supabase = await createClient();
const { data: { user } } = await supabase.auth.getUser();
if (!user) redirect("/login");
```

### New hook pattern
```typescript
"use client";
import { createClient } from "@/lib/supabase/client";
export function useX(tripId: string) {
  const [data, setData] = useState<X[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  const refetch = useCallback(async () => { ... }, [tripId]);
  useEffect(() => { refetch(); }, [refetch]);
  return { data, loading, refetch };
}
```

### New shadcn component
```bash
npx shadcn@latest add <component>
```
