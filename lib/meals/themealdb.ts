/**
 * Tiny client for TheMealDB — a free, no-API-key recipe database.
 * https://www.themealdb.com/api.php
 *
 * Note: results are in English only. We surface this in the UI.
 */

export interface RecipeResult {
  id: string;
  name: string;
  thumbnail: string | null;
  /** Combined "{measure} {ingredient}" entries, ready for our Dish.ingredients array */
  ingredients: string[];
  area?: string;
  category?: string;
  instructions?: string;
}

interface RawMealDbMeal {
  idMeal: string;
  strMeal: string;
  strMealThumb?: string | null;
  strArea?: string | null;
  strCategory?: string | null;
  strInstructions?: string | null;
  [key: string]: string | null | undefined;
}

interface RawMealDbResponse {
  meals: RawMealDbMeal[] | null;
}

const BASE = "https://www.themealdb.com/api/json/v1/1";

function parseIngredients(meal: RawMealDbMeal): string[] {
  const out: string[] = [];
  for (let i = 1; i <= 20; i++) {
    const ing = (meal[`strIngredient${i}`] ?? "")?.toString().trim();
    const measure = (meal[`strMeasure${i}`] ?? "")?.toString().trim();
    if (!ing) continue;
    out.push(measure ? `${measure} ${ing}`.trim() : ing);
  }
  return out;
}

function parseRecipe(meal: RawMealDbMeal): RecipeResult {
  return {
    id: meal.idMeal,
    name: meal.strMeal,
    thumbnail: meal.strMealThumb ?? null,
    ingredients: parseIngredients(meal),
    area: meal.strArea ?? undefined,
    category: meal.strCategory ?? undefined,
    instructions: meal.strInstructions ?? undefined,
  };
}

/** Search recipes by name (returns up to ~25 results). */
export async function searchRecipes(query: string): Promise<RecipeResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];
  try {
    const res = await fetch(`${BASE}/search.php?s=${encodeURIComponent(trimmed)}`);
    if (!res.ok) return [];
    const data = (await res.json()) as RawMealDbResponse;
    if (!data.meals) return [];
    return data.meals.map(parseRecipe);
  } catch {
    return [];
  }
}
