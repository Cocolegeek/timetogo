# Voyou

Application de planification de voyage collaborative — budget partagé, planning d'itinéraire, menus. Disponible sur [voyou.app](https://voyou.app).

## Stack

- **Next.js** (App Router) + React 19 + TypeScript
- **Tailwind CSS 4** + shadcn/ui (style: base-nova)
- **Supabase** (PostgreSQL + Auth Google OAuth + Row Level Security)
- **Vercel** pour l'hébergement

## Fonctionnalités

- Authentification Google, ou mode invité sans compte (sauvegarde ultérieure vers Google sans perte de données)
- Avatars : photo Google ou bibliothèque de 16 avatars illustrés, choisis à l'arrivée
- **Voyages** : destination, dates, participants, devise, budget, planning jour par jour, menus
- **Groupes** (style Tricount) : budget partagé sans dates ni destination
- Suivi des dépenses avec répartition (équitable / pourcentage / montant fixe)
- Multi-payeurs par dépense
- Calcul automatique des soldes et remboursements simplifiés
- Planning d'itinéraire jour par jour
- Menus (petit-déj, déjeuner, dîner) avec liste de courses
- Partage par code 6 caractères — les contributeurs peuvent tout voir et modifier
- **Listes** : « À apporter » (qui ramène quoi) et « À faire », avec qui s'en charge
- **Ta bande** : les gens avec qui tu voyages (et ceux ajoutés par lien) s'embarquent en un geste dans un nouveau voyage
- **Notifications push** (dépenses, remboursements, listes, bande, planning), réglables par type
- Réglages en sous-menus : profil, bande, remboursements, notifications, apparence et confort, compte
- Recherche dans un voyage, ajout rapide, annulation des suppressions
- PWA installable (iOS + Android)

## Lancer en local

```bash
# 1. Installer les dépendances
npm install

# 2. Copier le template d'env et remplir avec tes clés Supabase
cp .env.local.example .env.local

# 3. Lancer
npm run dev
```

### Supabase : migrations récentes

1. `lib/supabase/migrations/021_guest_accounts.sql` (mode invité), puis dans le dashboard Supabase
   (Authentication) activer **Allow anonymous sign-ins** et **Allow manual linking**.
   Un CAPTCHA (Attack Protection) est recommandé pour limiter la création de comptes invités.
2. `lib/supabase/migrations/022_friends_notifications_lists.sql` (Ta bande, notifications push, Listes).
3. `lib/supabase/migrations/023_activity_recurring_account_deletion.sql` (journal d'activité, dépenses répétées,
   suppression de compte). À jouer **avant** de déployer le code qui l'utilise ; à exécuter dans le SQL Editor
   (rôle `postgres`, nécessaire pour supprimer un utilisateur `auth.users`).

### Variables d'environnement (Vercel : Production + Preview)

| Variable | Rôle |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | obligatoires |
| `CONSENT_HMAC_SECRET` | obligatoire : sans lui, l'enregistrement du consentement RGPD répond 500 |
| `VAPID_PRIVATE_KEY` (+ `VAPID_SUBJECT`) | notifications push (voir ci-dessous) |
| `NEXT_PUBLIC_SITE_URL` | recommandé (liens de partage, image de partage) |

### Notifications push

L'envoi passe par `app/api/notify` (Web Push / VAPID). La clé publique est dans
`lib/notifications/vapid.ts` ; la clé **privée** doit être fournie au serveur :

- `VAPID_PRIVATE_KEY` (obligatoire pour envoyer)
- `VAPID_SUBJECT` (optionnel, ex. `mailto:toi@exemple.fr` ; par défaut l'URL du site)
- Pour changer de paire : `npx web-push generate-vapid-keys`, puis `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
  + `VAPID_PRIVATE_KEY`. Sans clé privée, l'app marche normalement, seules les notifications sont muettes.

Sur iPhone, les notifications web demandent iOS 16.4+ et l'app installée sur l'écran d'accueil.

Ouvre http://localhost:3000.

## Déploiement

### 1. Supabase
1. Crée un projet sur [supabase.com](https://supabase.com)
2. Dans le SQL Editor, exécute le contenu de [`lib/supabase/schema.sql`](lib/supabase/schema.sql)
3. **Authentication → Providers → Google** : active et configure (Client ID/Secret depuis Google Cloud Console)
4. **Authentication → URL Configuration** :
   - Site URL : ton URL de production
   - Redirect URLs : ajoute `<URL_PROD>/auth/callback`
5. Récupère `Project URL` et `anon key` dans **Settings → API**
6. Crée deux buckets Storage **publics** : `trip-icons` et `profile-avatars`

### 2. Vercel
1. Importe ce repo sur [vercel.com](https://vercel.com)
2. Ajoute les variables d'environnement :
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `VAPID_PRIVATE_KEY` (notifications push, voir plus haut)
3. Deploy

### 3. Boucle Google OAuth
- Dans Google Cloud Console → Credentials → ton OAuth client
- Authorized redirect URI : `https://<ton-projet>.supabase.co/auth/v1/callback`

## Structure

```
app/                      # Routes (App Router)
  ├── login/              # Page de connexion Google
  ├── auth/callback/      # Callback OAuth
  ├── consent/            # GDPR consent (une seule fois après connexion)
  ├── settings/           # Réglages + sous-pages (profil, bande, remboursements, notifications…)
  ├── friends/add/        # Lien d'invitation dans la bande
  ├── api/notify/         # Envoi des notifications push
  ├── join/               # Rejoindre un voyage via code
  └── trips/[tripId]/     # Voyage : budget, planning, menus, listes
components/               # Composants UI
hooks/                    # Hooks Supabase (useTrip, useBudget, useMeals…)
lib/
  ├── supabase/           # Clients Supabase + schema.sql + migrations
  └── budget/             # Logique métier (splits, debts)
proxy.ts                  # Protection des routes (équivalent middleware)
```
