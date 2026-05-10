@AGENTS.md

# Time to Go — Project Context

## Stack
- **Next.js 16 / React 19** — App Router, TypeScript, no Pages Router
- **Supabase** — PostgreSQL + RLS + Google OAuth via `@supabase/ssr`
- **UI** — shadcn/ui (style: base-nova) + Tailwind CSS 4 + Framer Motion + Lucide
- **Forms** — react-hook-form + Zod v4
- **State** — Custom hooks + local useState (no Redux/Zustand)

## Route Map
```
app/
  page.tsx               → redirects to /trips
  login/page.tsx         → Google OAuth entry
  auth/callback/route.ts → exchanges OAuth code for session
  join/page.tsx          → join trip by share code
  settings/page.tsx      → profile + theme
  trips/
    page.tsx             → list all trips
    new/page.tsx         → trip creation wizard
    [tripId]/
      layout.tsx         → trip nav + context
      page.tsx           → trip dashboard
      budget/page.tsx    → expense tracking
      menus/page.tsx     → meal planning
      planning/page.tsx  → itinerary builder
proxy.ts                 → middleware: enforces auth on all routes except /login /auth/callback /join
```

## Component Map
```
components/
  budget/     BalanceSummary, DebtSettlements, ExpenseCard, ExpenseForm, ExpenseList
  layout/     GlassCard, MeshGradientBackground, TripNav, TripSwipeContainer, UserMenu
  menus/      MealEditDialog
  planning/   ItineraryItemForm
  shared/     CurrencyInput, EmptyState, LocationAutocomplete, ParticipantAvatar, ParticipantStack
  trips/      BudgetEditDialog, IdentityPicker, ShareModal, TodayPlanningBlock, TripCard,
              TripEditDialog, TripEditWrapper, TripWizard
  ui/         shadcn primitives (button, card, dialog, dropdown-menu, input, label,
              progress, select, separator, sheet, tabs, textarea, badge)
```

## Hooks (all `"use client"`, call `createClient()` internally)
```typescript
useTrips()      → { trips, loading, refetch, createTrip, deleteTrip }
useTrip(id)     → { trip, loading, refetch, updateTrip, setMyParticipant, addParticipant, updateParticipant, deleteParticipant }
useBudget(id)   → { expenses, loading, refetch, addExpense, updateExpense, deleteExpense, totalSpent }
useMeals(id)    → { meals, loading, refetch, updateMeal, deleteMeal }
useItinerary(id)→ { items, loading, refetch, addItem, updateItem, deleteItem }
useProfile()    → { profile, loading, refetch, updateProfile, signOut }
useDebts(id)    → computed balances/settlements (no direct DB)
useTheme()      → localStorage toggle (key: "time-to-go-theme")
```

## Lib / Utils
```
lib/
  supabase/client.ts   → createBrowserClient() — use in hooks/client components
  supabase/server.ts   → createServerClient() with cookies — use in server components/API routes
  supabase/schema.sql  → canonical schema with RLS
  supabase/migrations/ → 001..007_*.sql
  budget/splits.ts     → computeShares(equal|percentage|fixed)
  budget/debts.ts      → computeBalances(), simplifyDebts() (greedy O(n log n))
  budget/categories.ts → courses|restaurant|activities|transport|accommodation|other
  budget/schemas.ts    → Zod schemas for expenses
  meals/slots.ts       → DEFAULT_SLOTS, eachDate(), buildDefaultMealRows()
  meals/categories.ts  → home|picnic|restaurant
  utils.ts             → cn() (clsx + tailwind-merge)
  format-date.ts       → date formatting
  planning-day.ts      → itinerary day grouping
  trip-share.ts        → generateShareCode(), buildShareUrl()
```

## DB Schema (key tables)
```
profiles          id, name, avatar_url, email
trips             id, name, destination, emoji, currency, start_date, end_date, total_budget, share_code(UNIQUE), owner_id
participants      id, trip_id, name, color
trip_members      trip_id + user_id (composite PK), participant_id, role: owner|contributor
expenses          id, trip_id, title, amount, currency, exchange_rate, amount_in_trip_currency,
                  category, paid_by_id, date, split_mode, splits: json[], notes
meals             id, trip_id, date, slot: breakfast|lunch|dinner, title, category,
                  participant_ids: uuid[], cook_ids: uuid[], ingredients: json[], position
itinerary_items   id, trip_id, date, time, title, location, type, duration_minutes, participant_ids: uuid[]
```
DB rows are snake_case; UI types (types/index.ts) are camelCase. Use `rowToTrip()` / `rowToExpense()` etc. for conversion.

## Coding Conventions
- **Client/Server split**: hooks and interactive components → `"use client"`. Pages/layouts default to RSC.
- **No bare SQL**: always use Supabase query builder (`supabase.from().select().eq()...`)
- **Mutations**: call hook method → hook auto-refetches. Never mutate local state directly.
- **Forms**: react-hook-form + Zod in dialogs/modals. Multi-step → TripWizard pattern.
- **Styling**: Tailwind utility classes + CSS custom properties for theme. `cn()` for conditional classes.
- **Icons**: Lucide only.
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
