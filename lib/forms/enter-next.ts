const FIELDS =
  'input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]):not([type="date"]):not([type="time"]):not([disabled]), textarea:not([disabled])';

/** Passe au champ de texte suivant du formulaire. Renvoie false s'il n'y en a plus. */
export function focusNextField(from: HTMLElement): boolean {
  const root: ParentNode = from.closest("[data-enter-chain]") ?? document;
  const fields = [...root.querySelectorAll<HTMLElement>(FIELDS)].filter((el) => el.getClientRects().length > 0);
  const next = fields[fields.indexOf(from) + 1];
  if (!next) return false;
  next.focus();
  return true;
}

/**
 * Touche Entrée d'un champ d'une ligne : champ suivant, et `onLast` au dernier (en général : valider).
 * Dans une zone de texte, Entrée reste un retour à la ligne.
 */
export function handleEnter(e: React.KeyboardEvent<HTMLElement>, onLast?: () => void) {
  if (e.key !== "Enter" || e.shiftKey || e.nativeEvent.isComposing) return;
  if (e.target instanceof HTMLTextAreaElement) return;
  e.preventDefault();
  if (!focusNextField(e.currentTarget)) onLast?.();
}
