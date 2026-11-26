# Mémoire de travail (lue au début de chaque contexte)

Ce fichier dit où en est le projet et comment y travailler. Les règles de code et de design sont dans CLAUDE.md. Aucun secret ici.

## Qui et comment
- Le propriétaire parle français et ne code pas. Tout est dans le cloud (GitHub, Vercel, Supabase), rien n'est installé chez lui.
- Réponses courtes, en français, en **texte simple sans tableaux** (il les envoie par e-mail). Jamais de tiret cadratin.
- Finir par « actions restantes pour toi » quand il y en a. Agir seul quand c'est autorisé, sans demander pour chaque geste.
- **Ne jamais fusionner sans son « fusionne »** explicite. Il teste sur son téléphone avant.
- Il aime les audits d'interface : proposer, challenger ses idées avec des exemples d'apps qui marchent, puis attendre son « ok ».

## Où on en est
Fusionné sur `main` : PR #6 à #12 (audit, assistant de création, tableau de bord épuré, repas dans le planning, version ordinateur, heure d'ajout), PR #13 (drapeaux en images), PR #14 (fusion voyage/groupe en un seul espace avec espaces au choix, avatars Voyou, parts à 0 €, fenêtre « Régler », couverture facultative), PR #15 (correctif du plantage de la liste dû à l'ancienne mémoire locale, formulaire de création sans phrases, aucun emoji par défaut), PR #16 (espaces non cochés toujours ajoutables), PR #17 (menus = ce qu'on cuisine ou achète, restos dans le planning, migration 026), PR #18 (réglage « Repas dans le planning », migration 027), PR #19 (24 emojis Fun Emoji dans les avatars, crédit obligatoire sous la grille), PR #20 (mémoire), PR #21 (onglets, une seule règle).
Aucune PR ouverte.
En production sur voyou.app. Base Supabase migrée jusqu'à la **028** (025 : `trips.modules`, voyages = tous les espaces, groupes = listes ; 026 : repas resto déplacés dans le planning ; 027 : `trips.meals_in_planning` ; 028 : modules des anciens voyages recochés d'après leur contenu). Toutes appliquées à la main sur la base de production, avant ou juste après la fusion.
**Piège connu** : les données de la liste des voyages sont gardées dans le navigateur (`voyou-cache-v2`). Tout nouveau champ obligatoire d'un `Trip` doit être toléré s'il est absent (voir `modulesOf()`), sinon l'écran d'erreur « This page couldn't load » apparaît chez ceux qui ont une ancienne mémoire. Changer la clé du cache si la forme des données change.
**Onglets et ajout (décidé et fait, PR #21, migration 028)** : une seule règle, case cochée = onglet là (même vide), non cochée = pas d'onglet mais ajoutable, il apparaît dès qu'il est rempli ; la feuille « + » a une seule ligne « Planning » (la page demande étape ou trajet) ; astuce « maintiens + » dès le 1er ajout ; anciens voyages recochés d'après leur contenu.

## En attente (rien d'urgent)
- **Facebook en pause** : Meta exige la vérification d'une entreprise pour sortir du mode Développement. L'app Meta existe (mode Développement), `NEXT_PUBLIC_FACEBOOK_LOGIN` reste faux, le fournisseur est désactivé dans Supabase. À reprendre quand il aura une structure : App ID et clé secrète dans Supabase (il les colle lui-même), puis variable Vercel et redéploiement.
- **DMARC** (facultatif) : le jeton Vercel n'a pas le droit de créer l'enregistrement DNS ; il doit l'ajouter chez son hébergeur de domaine.
- **Jetons à supprimer par lui** quand il n'a plus besoin de moi : les deux jetons `claude-voyou` (GitHub et Vercel) et celui de Supabase s'il en reste un.
- **`TripEditDialog`** (modification d'un voyage) garde l'ancienne présentation : à refaire dans le style du formulaire de création (tuiles, sans phrases).
- **Ordinateur, suite** (proposé, pas encore demandé) : raccourcis clavier (N, /, Échap), panneaux latéraux à la place des feuilles du bas, budget avec soldes à côté de la liste. La version ordinateur de base est en ligne et validée par lui.
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
- **Si le propriétaire voit encore l'ancienne version sur téléphone** : l'app (PWA) se met à jour au lancement suivant ; lui demander de la fermer complètement et de la rouvrir. Vérifier d'abord que le déploiement de production est `READY`.
- Le repas d'un voyage : premier plat = « Plat ». Le « + » sur le Résumé ouvre la feuille de choix (dépense en bas).
