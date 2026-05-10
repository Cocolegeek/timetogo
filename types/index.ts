// ─── Profile ─────────────────────────────────────────────────────────────────

export interface Profile {
  id: string;
  name: string | null;
  avatar_url: string | null;
  email: string | null;
  created_at: string;
}

// ─── Participants ─────────────────────────────────────────────────────────────

export interface Participant {
  id: string;
  name: string;
  color: string;
  avatar?: string;
}

// ─── Trip Member ──────────────────────────────────────────────────────────────

export interface TripMember {
  trip_id: string;
  user_id: string;
  participant_id: string | null;
  role: "owner" | "contributor";
  joined_at: string;
  profile?: Profile;
}

// ─── Voyages ─────────────────────────────────────────────────────────────────

export interface Trip {
  id: string;
  name: string;
  destination: string;
  emoji: string;
  currency: string;
  startDate: string;  // camelCase alias used in UI, mapped from start_date
  endDate: string;
  participants: Participant[];
  totalBudget?: number;
  shareCode: string;
  isOwner: boolean;
  myParticipantId: string | null; // which participant the current user is
  createdAt: string;
  updatedAt: string;
}

// Raw Supabase row shapes (snake_case from DB)
export interface TripRow {
  id: string;
  name: string;
  destination: string;
  emoji: string;
  currency: string;
  start_date: string;
  end_date: string;
  total_budget: number | null;
  share_code: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

// ─── Budget ───────────────────────────────────────────────────────────────────

export type SplitMode = "equal" | "percentage" | "fixed";

export type ExpenseCategory =
  | "courses"
  | "restaurant"
  | "activities"
  | "transport"
  | "accommodation"
  | "other";

export interface ParticipantSplit {
  participantId: string;
  excluded: boolean;
  share?: number;
  percentage?: number;
  fixedAmount?: number;
}

export interface Payer {
  participantId: string;
  amount: number; // amount in trip currency
}

export interface Expense {
  id: string;
  tripId: string;
  title: string;
  amount: number;
  currency: string;
  exchangeRate: number;
  amountInTripCurrency: number;
  category: ExpenseCategory;
  payers: Payer[];
  date: string;
  splitMode: SplitMode;
  splits: ParticipantSplit[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Calculs dérivés (non stockés) ───────────────────────────────────────────

export interface Balance {
  participantId: string;
  paid: number;
  owes: number;
  net: number;
}

export interface Settlement {
  fromId: string;
  toId: string;
  amount: number;
}

// ─── Menus ────────────────────────────────────────────────────────────────────

/** Three fixed slots per day: morning / noon / evening. */
export type MealSlot = "breakfast" | "lunch" | "dinner";

/** Visual category that drives the badge color. */
export type MealCategory = "home" | "picnic" | "restaurant";

export interface Ingredient {
  id: string;
  name: string;
  quantity: string;
}

export interface Meal {
  id: string;
  tripId: string;
  date: string;
  slot: MealSlot;
  category: MealCategory;
  title: string;
  notes?: string;
  /** Participants who eat this meal — empty list = "tout le monde" implicit. */
  participantIds: string[];
  /** Participants in charge of preparing the meal — optional. */
  cookIds: string[];
  ingredients: Ingredient[];
  position: number;
  createdAt: string;
}

// ─── Planning ─────────────────────────────────────────────────────────────────

export type ItineraryType =
  | "transport"
  | "accommodation"
  | "activity"
  | "food"
  | "other";

export interface ItineraryItem {
  id: string;
  tripId: string;
  date: string;
  time?: string;
  title: string;
  description?: string;
  location?: string;
  type: ItineraryType;
  /** Duration in minutes (optional). */
  durationMinutes?: number;
  /** Participant IDs involved in this step. */
  participantIds: string[];
  createdAt: string;
}
