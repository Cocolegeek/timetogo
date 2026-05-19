# Voyou

Application de planification de voyage collaborative — budget partagé, planning d'itinéraire, menus. Disponible sur [voyou.app](https://voyou.app).

## Stack

- **Next.js** (App Router) + React 19 + TypeScript
- **Tailwind CSS 4** + shadcn/ui (style: base-nova)
- **Supabase** (PostgreSQL + Auth Google OAuth + Row Level Security)
- **Vercel** pour l'hébergement

## Fonctionnalités

- Authentification Google
- **Voyages** : destination, dates, participants, devise, budget, planning jour par jour, menus
- **Groupes** (style Tricount) : budget partagé sans dates ni destination
- Suivi des dépenses avec répartition (équitable / pourcentage / montant fixe)
- Multi-payeurs par dépense
- Calcul automatique des soldes et remboursements simplifiés
- Planning d'itinéraire jour par jour
- Menus (petit-déj, déjeuner, dîner) avec liste de courses
- Partage par code 6 caractères — les contributeurs peuvent tout voir et modifier
- Profil utilisateur (nom, photo, avatar custom)
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
  ├── settings/           # Profil utilisateur + thème
  ├── join/               # Rejoindre un voyage via code
  └── trips/[tripId]/     # Voyage : budget, planning, menus
components/               # Composants UI
hooks/                    # Hooks Supabase (useTrip, useBudget, useMeals…)
lib/
  ├── supabase/           # Clients Supabase + schema.sql + migrations
  └── budget/             # Logique métier (splits, debts)
proxy.ts                  # Protection des routes (équivalent middleware)
```
