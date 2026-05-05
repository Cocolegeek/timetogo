# Time to Go

Application de planification de voyage collaborative — budget partagé, checklist, planning d'itinéraire.

## Stack

- **Next.js 16** (App Router) + React 19 + TypeScript
- **Tailwind CSS 4** + shadcn/ui (base-ui)
- **Supabase** (PostgreSQL + Auth Google OAuth + Row Level Security)
- **Vercel** pour l'hébergement

## Fonctionnalités

- Authentification Google
- Création de voyages avec participants, devise, budget
- Suivi des dépenses avec répartition (équitable / pourcentage / montant fixe)
- Calcul automatique des soldes et remboursements simplifiés
- Checklist par catégories (documents, vêtements, santé…)
- Planning d'itinéraire jour par jour
- Partage par code 6 caractères — les contributeurs peuvent tout voir et modifier
- Profil utilisateur (nom, photo Google)

## Lancer en local

```bash
# 1. Installer les dépendances
npm install

# 2. Copier le template d'env et le remplir avec tes clés Supabase
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
  ├── profile/            # Gestion du profil
  ├── join/               # Rejoindre un voyage via code
  └── trips/[tripId]/     # Voyage : budget, planning, checklist
components/               # Composants UI
hooks/                    # Hooks Supabase (useTrip, useBudget, useChecklist…)
lib/
  ├── supabase/           # Clients Supabase + schema.sql
  └── budget/             # Logique métier (splits, debts)
proxy.ts                  # Protection des routes (équivalent middleware)
```
