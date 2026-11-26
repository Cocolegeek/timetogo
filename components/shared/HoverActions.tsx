"use client";

import { Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Crayon et corbeille qui apparaissent au survol d'un élément, pour la souris seulement (pointeur précis).
 * Sur écran tactile rien ne s'affiche : on touche l'élément pour le modifier, on le glisse pour le supprimer.
 * Le parent porte la classe `group` et la position (`className`).
 */
export function HoverActions({
  label,
  onEdit,
  onDelete,
  className,
}: {
  label: string;
  onEdit?: () => void;
  onDelete?: () => void;
  className?: string;
}) {
  const button =
    "flex size-9 items-center justify-center rounded-full text-muted-foreground outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring";
  return (
    <div
      className={cn(
        "z-10 hidden items-center gap-0.5 rounded-full bg-card p-0.5 opacity-0 shadow-card transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 [@media(pointer:fine)]:flex",
        className
      )}
    >
      {onEdit && (
        <button type="button" aria-label={`Modifier ${label}`} onClick={onEdit} className={cn(button, "hover:bg-foreground/[0.07] hover:text-foreground")}>
          <Pencil size={16} aria-hidden="true" />
        </button>
      )}
      {onDelete && (
        <button type="button" aria-label={`Supprimer ${label}`} onClick={onDelete} className={cn(button, "hover:bg-red-500/10 hover:text-red-400")}>
          <Trash2 size={16} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
