# Voyou — Audit design UX / UI

Périmètre : 14 000 lignes TSX, 30 composants, 14 écrans. Constats tirés du code (tokens, composants, pages).

## Verdict

L'interface est fonctionnelle et cohérente en interne, mais **sans identité**. Elle applique la recette « SaaS IA dark glassmorphism » : fond sombre, orbes de gradient flous, cartes en verre, indigo/violet, gradients partout. Rien n'évoque le voyage, les potes ou « Voyou » (nom, ton, humour). Un écran de Voyou est interchangeable avec n'importe quelle app générée.

## 1. Identité visuelle

| Constat | Preuve |
|---|---|
| Palette indigo/violet générique, aucune couleur de marque ni de personnalité | `--accent-h: 270`, `--primary: indigo` ; 29 occurrences indigo/violet |
| Fond « mesh gradient » : 3 orbes flous animés + grille | `MeshGradientBackground.tsx` (animations infinies sur tout l'écran, coûteuses en batterie) |
| Glassmorphism systématique | 46 `glass*`, 15 `backdrop-blur`, `blur(40px) saturate(200%)` sur la nav |
| Gradients décoratifs sans fonction | 28 `gradient-*` ; `TripCard` assigne un gradient par index (sans signification) |
| Une seule typo (Geist) | pas de hiérarchie typographique expressive, pas de caractère |
| Logo = icône PNG dans un carré arrondi + ombre colorée | `VoyouLogo.tsx` ; pas de wordmark |
| Ton éditorial (« entre potes, sans embrouilles ») absent du visuel | le copywriting est fun, l'UI est corporate |

## 2. Système de design (dette technique)

- **Light mode bricolé** : override des échelles `--color-slate-*`, `indigo-*`, `emerald-*`… sous `:root:not(.dark)` (≈ 60 lignes). Les composants utilisent `text-slate-100` pour dire « texte principal », donc inversé en clair. Fragile et incompréhensible. Le clair n'est pas un vrai thème.
- **Thème par défaut dark forcé** (`className="dark"` + `colorScheme: "dark"` + `themeColor` fixe), sans respect de `prefers-color-scheme`.
- **Aucun token sémantique** : 460 `text-slate-*`, 12 `bg-white/x`, 10 `border-white/x` en dur au lieu de `text-foreground`/`text-muted-foreground`.
- **Tokens shadcn et tokens maison en doublon** : `--accent` (violet) vs `--accent-500` (hue 270) ; `--card`/`--glass-bg` ; `--primary`/`--accent-500`.
- **Échelle typographique incohérente** : 17 `text-[10..13px]` arbitraires + 96 `text-xs` ; racine à 17px ; `<input>` forcé à 16px mobile / 0,875rem desktop (saut visuel).
- **Rayons** : 44 `rounded-2xl/3xl`, tout est arrondi pareil → pas de hiérarchie.
- **Ombres** : `shadow-2xl shadow-black/40` sur chaque GlassCard.
- **shadcn `base-nova` à peine personnalisé** : `components/ui/*` d'origine, donc look « shadcn par défaut ».

## 3. Accessibilité (bloquant)

1. `viewport: maximumScale: 1, userScalable: false` → **zoom désactivé** (échec WCAG 1.4.4).
2. **Contraste** : `text-slate-500/600` sur verre sombre translucide, `text-[10px]/[11px]` (15 occurrences) ; en clair, texte sur `oklch(1 0 0 / 70%)` au-dessus d'orbes colorés (contraste variable).
3. Couleur seule pour le statut (Passé/Planifié/En cours = rouge/bleu/vert en badges de même forme). Rouge pour « Passé » est trompeur (ce n'est pas une erreur).
4. `aria-label` : 25 occurrences pour 44 fichiers de composants interactifs ; boutons-icônes, swipe-to-delete sans alternative clavier ni lecteur d'écran.
5. Animations infinies (orbes) sans `prefers-reduced-motion`. 136 usages de `motion.*` sans respect de la préférence.
6. Cibles tactiles : plusieurs contrôles < 44 px (avatars, chevrons, menus ⋮).
7. `user-select: none` global sur les boutons ; `overscroll-behavior-y: none` global (casse le pull-to-refresh natif).

## 4. UX / navigation

- **Barre de nav flottante en verre** (≈ 5rem de haut) : mange l'écran sur mobile, nécessite un système de variables `--fab-bottom` pour que les FAB ne la chevauchent pas. Symptôme d'un empilement flottant (nav + FAB + bannières PWA/iOS).
- **Trois bannières d'installation PWA/iOS** (`PwaInstallBanner`, `IosInstallBanner`, `AppInstallBanner`) + `OnboardingModal` : agressif dès l'arrivée.
- **Tableau de bord** : bandeau « Connecté en tant que » au même poids visuel que le Budget ; empilement de cartes identiques (icône dans carré teinté + titre + chiffre) sans hiérarchie. Le chiffre clé (reste à payer / qui doit quoi) n'est pas mis en avant.
- **Page voyages** : voyages et groupes mélangés visuellement ; badges Type + Statut en majuscules rivalisent avec le titre. Pas de vue « prochain voyage » mise en avant.
- **Formulaires** : `ExpenseForm` = 912 lignes, 3 onglets dans un sheet ; `MealEditDialog` 721 lignes ; `JourneyForm` 606 lignes. Complexité de saisie élevée pour l'action la plus fréquente (ajouter une dépense).
- **Suppression par swipe sans confirmation** : choix documenté, mais irréversible et non découvrable (aucun indice visuel, pas d'annulation).
- **Page Soldes** (`BalancesView`, 601 lignes) : l'information la plus sensible (qui doit combien à qui) est noyée dans des sections dépliables.
- **Incohérence de modèle d'interaction** : Sheet 92dvh / Sheet 88dvh / Dialog plein écran / Dialog centré selon l'écran, sans règle lisible pour l'utilisateur.
- **Emojis comme icônes** (TripCard, dashboard `ITINERARY_EMOJI`, menus, join, wizards) alors que la convention du projet est « Lucide uniquement » ; rendu différent selon l'OS.

## 5. Performance perçue

- `backdrop-filter` à 20–40 px + 3 orbes animés `filter: blur(60–80px)` en `position: fixed` sur toutes les pages : repaints constants sur mobile bas de gamme.
- `framer-motion` omniprésent (136 usages) pour des entrées simples réalisables en CSS.

## 6. Ce qui est à conserver

- Architecture de features (`tripFeatures`, Trip vs Group), hooks, logique de dettes, RLS : **ne pas toucher**.
- Choix mobile-first, formulaires plein écran, `LocationPickerSheet`, redirection vers apps cartes, `inputs` 16 px anti-zoom iOS.
- Copywriting en français, tutoiement, ton « potes ».
- Données et routes : la refonte est strictement visuelle/UX, sans migration.

## 7. Plan de refonte proposé

1. **Direction artistique** : palette, typographie, formes, ton (à valider).
2. **Fondations** : tokens sémantiques réels (clair + sombre natifs, `prefers-color-scheme`), suppression des overrides slate, échelle typo et espacements, rayons/ombres à 2–3 niveaux, motion respectant `prefers-reduced-motion`. Retrait du mesh et du glass.
3. **Primitives** : `components/ui/*` redessinés (Button, Card, Input, Sheet, Dialog, Tabs, Badge), nouveau `VoyouLogo`/wordmark.
4. **Navigation** : barre basse fixe et sobre (ou onglets en haut), suppression des variables FAB, une seule bannière d'installation.
5. **Écrans par priorité** : Voyages (liste) → Tableau de bord → Budget (dépenses + soldes) → Planning → Menus → Création/rejoindre → Réglages/login.
6. **Accessibilité** : zoom autorisé, contrastes AA, cibles 44 px, labels, annulation de suppression.
7. **Vérification** : build, captures Playwright mobile/desktop clair et sombre à chaque étape.
