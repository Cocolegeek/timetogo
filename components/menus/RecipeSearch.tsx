"use client";

import { useEffect, useRef, useState } from "react";
import { Search, Loader2, ChefHat } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { searchRecipes, type RecipeResult } from "@/lib/meals/themealdb";

interface RecipeSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (recipe: RecipeResult) => void;
}

export function RecipeSearch({
  open,
  onOpenChange,
  onSelect,
}: RecipeSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<RecipeResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset on open
  useEffect(() => {
    if (open) {
      setQuery("");
      setResults([]);
      setHasSearched(false);
    }
  }, [open]);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      const data = await searchRecipes(query);
      setResults(data);
      setHasSearched(true);
      setLoading(false);
    }, 350);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const handleSelect = (recipe: RecipeResult) => {
    onSelect(recipe);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="glass-strong border-white/10 max-w-md p-0 max-h-[80vh] overflow-hidden flex flex-col"
        showCloseButton={false}
      >
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-white/8">
          <DialogTitle className="text-slate-100 text-xl flex items-center gap-2">
            <ChefHat size={20} className="text-indigo-400" />
            Importer une recette
          </DialogTitle>
        </DialogHeader>

        <div className="px-5 py-4 border-b border-white/8">
          <div className="relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
            />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Pasta, curry, pancake…"
              className="bg-white/8 border-white/10 text-slate-100 placeholder:text-slate-500 pl-9 pr-9"
              autoFocus
            />
            {loading && (
              <Loader2
                size={14}
                className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-slate-500"
              />
            )}
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Recettes en anglais — propulsé par TheMealDB.
          </p>
        </div>

        <div className="flex-1 overflow-y-auto">
          {!loading && hasSearched && results.length === 0 && (
            <div className="px-5 py-12 text-center">
              <ChefHat
                size={32}
                className="mx-auto text-slate-600 mb-3"
              />
              <p className="text-sm text-slate-400">
                Aucune recette trouvée pour &laquo; {query} &raquo;.
              </p>
            </div>
          )}

          {!hasSearched && query.trim().length < 2 && (
            <div className="px-5 py-10 text-center">
              <p className="text-sm text-slate-500">
                Tape au moins 2 caractères pour chercher.
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {["pasta", "curry", "salad", "pizza", "pancake"].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setQuery(s)}
                    className="px-3 py-1.5 rounded-full text-xs font-medium bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="px-3 py-2 space-y-1">
            {results.map((recipe) => (
              <button
                key={recipe.id}
                type="button"
                onClick={() => handleSelect(recipe)}
                className="w-full flex items-start gap-3 p-2.5 rounded-xl hover:bg-white/8 active:bg-white/12 transition-colors text-left"
              >
                {recipe.thumbnail ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={recipe.thumbnail}
                    alt={recipe.name}
                    className="w-14 h-14 rounded-lg object-cover shrink-0"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                    <ChefHat size={20} className="text-slate-500" />
                  </div>
                )}
                <div className="flex-1 min-w-0 py-0.5">
                  <p className="text-sm font-semibold text-slate-100 truncate">
                    {recipe.name}
                  </p>
                  <p className="text-xs text-slate-500 truncate mt-0.5">
                    {[recipe.area, recipe.category].filter(Boolean).join(" · ") ||
                      "Recette"}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    {recipe.ingredients.length} ingrédient
                    {recipe.ingredients.length !== 1 ? "s" : ""}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
