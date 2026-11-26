# Mémoire de travail (lue au début de chaque contexte)

Ce fichier dit où en est le projet et comment y travailler. Les règles de code et de design sont dans CLAUDE.md. Aucun secret ici.

## Qui et comment
- Le propriétaire parle français et ne code pas. Tout est dans le cloud (GitHub, Vercel, Supabase), rien n'est installé chez lui.
- Réponses courtes, en français, en **texte simple sans tableaux** (il les envoie par e-mail). Jamais de tiret cadratin.
- Finir par « actions restantes pour toi » quand il y en a. Agir seul quand c'est autorisé, sans demander pour chaque geste.
- **Ne jamais fusionner sans son « fusionne »** explicite. Il teste sur son téléphone avant.
- Il aime les audits d'interface : proposer, challenger ses idées avec des exemples d'apps qui marchent, puis attendre son « ok ».

## Où on en est
Fusionné sur `main` : PR #6 (audit : hors-ligne, devises, journal, RGPD, tests, récurrents, exports, connexion e-mail), PR #7 (assistant de création, « + » contextuel, saisie rapide), PR #8 (tableau de bord épuré, feuille « + » sous le pouce, formulaires en une page, polices hébergées).
En production sur voyou.app. Base Supabase migrée jusqu'à la 023. Les voyages existants en ✈️ sont passés en 🚆 (6 voyages, base de production).

## En attente (rien d'urgent)
- **Facebook en pause** : Meta exige la vérification d'une entreprise pour sortir du mode Développement. L'app Meta existe (mode Développement), `NEXT_PUBLIC_FACEBOOK_LOGIN` reste faux, le fournisseur est désactivé dans Supabase. À reprendre quand il aura une structure : App ID et clé secrète dans Supabase (il les colle lui-même), puis variable Vercel et redéploiement.
- **DMARC** (facultatif) : le jeton Vercel n'a pas le droit de créer l'enregistrement DNS ; il doit l'ajouter chez son hébergeur de domaine.
- **Jetons à supprimer par lui** quand il n'a plus besoin de moi : les deux jetons `claude-voyou` (GitHub et Vercel) et celui de Supabase s'il en reste un.
- **`TripEditDialog`** (modification d'un voyage) garde l'ancienne présentation : à refaire dans le style des formulaires (`components/forms/`).
- Idées proposées, non demandées : scan de ticket, saisie vocale, option « Planning toujours visible » pour les voyages.
- Dette connue : erreurs ESLint `set-state-in-effect` sur plusieurs formulaires (hydratation depuis les props), avertissement d'hydratation de `LazyOnboarding` au tout premier lancement.

## Travailler ici
- **Accès** : les jetons sont injectés par le réseau (demander avec `request_credential` si un hôte répond 401). Appeler Supabase et Vercel avec `Authorization: Bearer dummy`.
  - Supabase (projet `ypphxuyajsvhfiudigxb`, région eu-west-1) : `GET/PATCH https://api.supabase.com/v1/projects/<ref>/config/auth`, `POST .../database/query` avec `{"query": "..."}`. Toujours un SELECT avant un UPDATE et garder les identifiants touchés.
  - Vercel (projet `voyou`, domaine voyou.app) : liste des déploiements `/v6/deployments`, détail `/v13/deployments/<dpl_...>`, journal `/v3/deployments/<dpl_...>/events`, relance `POST /v13/deployments?forceNew=1` avec `{"name":"voyou","deploymentId":"dpl_..."}`. Un échec de compilation se lit dans le journal.
- **Vérifier en navigateur** : Chromium et Playwright sont préinstallés. `scripts/e2e/forms.cjs` simule Supabase, Nominatim et le calcul de trajet : servir l'app avec `NEXT_PUBLIC_SUPABASE_URL=https://example.supabase.co`, le cookie `sb-example-auth-token`, et copier `scenario(...)` pour un autre écran. Lancer avec `NODE_PATH=$(npm root -g)`.
- **Contrôles avant de pousser** : `npx tsc --noEmit`, `npm test`, `npx next build`, ESLint sur les fichiers touchés (les erreurs `set-state-in-effect` existantes ne comptent pas). Les polices sont locales (`app/fonts`), la compilation ne dépend plus de Google.
- **Git** : branche de développement imposée par la session. Après une fusion « squash », repartir de `main` (`git fetch origin main && git checkout -B <branche> origin/main`). La poussée forcée est refusée : pour pousser quand la branche distante a l'ancien historique, `git fetch origin <branche> && git merge --no-edit FETCH_HEAD`, garder notre version en cas de conflit (`git checkout --ours <fichier>`), vérifier que `git diff --cached <notre commit> --stat` est vide, puis pousser normalement. Ne jamais faire `git add -A` sans relire `git status` (un fichier journal a été ajouté une fois par erreur).
- **PR** : brouillon, abonnement aux événements, passer « prête » avant de fusionner (un brouillon refuse la fusion), fusion « squash » avec un titre « Fusion de la PR #N : ... ». Si la compilation Vercel échoue : lire le journal, relancer une fois au plus, chercher la vraie cause.
- Le repas d'un voyage : premier plat = « Plat ». Le « + » sur le Résumé ouvre la feuille de choix (dépense en bas).
