@AGENTS.md
@MEMORY.md

# Voyou: Project Context

## Stack
- **Next.js 16 / React 19**: App Router, TypeScript, no Pages Router
- **Supabase**: PostgreSQL + RLS + Google OAuth + comptes invités (anonymous sign-in) via `@supabase/ssr`
- **UI**: shadcn/ui (style: base-nova, primitives restylés) + Tailwind CSS 4 + Framer Motion + Lucide
- **Forms**: react-hook-form + Zod v4
- **State**: Custom hooks + local useState (no Redux/Zustand)

## Trip vs Group (discriminated union)

Le projet gère deux types d'entités via la même table `trips`, distinguées par la colonne `type`:
- **`type: "trip"`**: voyage complet (destination, dates, planning, menus, budget)
- **`type: "group"`**: budget partagé style Tricount (nom + participants + budget seulement)

`types/index.ts` exporte une discriminated union `Trip = VoyageTrip | GroupTrip`. TypeScript force le narrowing avant d'accéder à `destination` / `startDate` / `endDate`.

**Source de vérité des features** : `lib/trip-features.ts` (`tripFeatures(trip)`, `isVoyage(trip)`, `isGroup(trip)`, `TRIP_TYPE_LABELS`). Tous les rendus conditionnels passent par là. Ne pas ré-écrire de `trip.type === "..."` ailleurs.

## Route Map
```
app/
  page.tsx               → redirects to /trips
  login/page.tsx         → Google OAuth (+ Facebook si NEXT_PUBLIC_FACEBOOK_LOGIN=true) + "Continuer en tant qu'invité" (anonymous sign-in)
  privacy/page.tsx       → politique de confidentialité PUBLIQUE (exigée par Meta ; #suppression = instructions de suppression)
  auth/callback/route.ts → exchanges OAuth code for session; forwards OAuth errors (?error_code=)
  auth/link/page.tsx     → fin de sauvegarde invité → Google (liaison OK, ou compte existant → fusion)
  consent/page.tsx       → GDPR consent (shown once after first login)
  api/consent/route.ts   → POST: saves consent to DB, redirects to /trips
  api/geocode/route.ts   → GET ?q= → { lat, lon } via Nominatim (server-side)
  api/rates/route.ts     → GET ?from=&to= → { rate } (BCE via frankfurter, cache 12 h) ; proposé dans ExpenseForm, toujours modifiable
  api/routing/route.ts   → GET ?from=&to=&mode= → { durationMinutes, distanceKm } via OSRM
  join/page.tsx          → join trip by share code
  settings/page.tsx      → menu Réglages (carte profil + lignes vers les sous-pages)
  settings/{profile,friends,payments,notifications,appearance,account}/page.tsx → sous-pages
  friends/add/page.tsx   → ?code= : aperçu + « Ajouter à ma bande » (lien d'invitation)
  api/notify/route.ts    → POST NotifyEvent → compose (RLS de l'appelant) + Web Push (VAPID) ; GET → { configured }
  trips/
    page.tsx             → list all trips
    new/page.tsx         → assistant de création (CreateWizard, type=trip | group)
    [tripId]/
      layout.tsx         → trip nav + context (wraps TripClientProviders)
      page.tsx           → trip dashboard
      budget/page.tsx    → 2 onglets : Dépenses · Soldes (Régler, récap partageable, export CSV). Le journal d'activité est dans le menu « … » du voyage (TripActionsSheet)
      menus/page.tsx     → meal planning
      lists/page.tsx     → Listes « À apporter » / « À faire » (?item=<id>, ?list=todo)
      planning/page.tsx  → itinerary builder (étapes + trajets)
  trips/template.tsx + [tripId]/template.tsx → page transitions (PageTransition)
proxy.ts                 → middleware (getClaims): enforces auth on all routes except /login /auth/callback /join /consent /privacy
                           (a guest = anonymous Supabase user, so it passes like any signed-in user)
```

## Component Map
```
components/
  budget/     AllSettledEmpty, IAmSettledEmpty,
              BalancesView:        onglet Soldes : "Ils me doivent" / "Je leur dois" /
                                     dépliable "Entre les autres" + grille balances + sheets paiement
              ExpenseCard:         swipe-to-delete card; tap opens ExpenseDetailSheet
              ExpenseDetailSheet:  bottom sheet: read-only detail with Edit/Delete actions
              ExpenseForm:         Sheet 92dvh, une seule page : montant, titre, catégorie, puces (date · payé par · pour qui · répéter)
              ExpenseList:         grouped by date, sticky headers with daily total
              ParticipantPaymentSheet: bottom sheet: copy IBAN/tél, share via navigator.share
  auth/       GoogleIcon, GuestUpgradeCard (carte « mode invité » + bouton Sauvegarder avec Google),
              GuestSignOutDialog (un invité qui se déconnecte perd ses données : on propose de sauvegarder)
  layout/     AppHeader, GlassCard (= carte pleine, plus de verre), MeshGradientBackground (= fond uni),
              PageHeader (grand titre), SectionThemeController, TripAppHeader (retour · recherche · partage · modifier),
              TripNav (barre du bas sur téléphone, menu latéral `aside` dès `lg`), TripMain (largeur du contenu), TripClientProviders, UserMenu (avatar = lien direct vers /settings), VoyouLogo (LogoMark = visage « oyo » en SVG inline + mot-symbole)
  motion/     MotionProvider (LazyMotion strict + MotionConfig ; features domMax chargées après le 1er rendu),
              PageTransition (templates), Stagger/StaggerItem, NumberTicker (montants animés, rAF, sans framer)
  budget/ (+) ActivityList (journal : qui a ajouté / modifié / supprimé), RecurringSheet (dépenses répétées, chargé à la demande)
  forms/      HeroInput (champ principal grand et souligné), PropertyChips (réglages en puces qui affichent leur valeur et ouvrent leur choix en dessous),
              FormFooter (action principale en bas, avec le message de ce qui manque)
  menus/      MealEditDialog (une page : plats saisis au clavier, puces catégorie · qui mange · qui gère)
  planning/   ItineraryItemForm:   full-screen dialog: title/date/type/location/participants
              JourneyForm:         full-screen dialog: from→to, mode, routing/duration, participants
  shared/     OfflineSync (monté à la racine : rejoue la file hors-ligne, pastille « Hors ligne · n en attente »), AvatarPicker (photo Google + 16 avatars), AvatarUpload, ClientOnly (rendu client après hydratation),
              ConfirmDeleteDialog, DateRangePicker, DateField / TimeField (DateTimeFields : libellé FR + sélecteur natif),
              DayHeader, DayTabs, EmptyState, SegmentedControl, Skeleton (Spinner = squelette de page),
              VoyouLoader (visage « oyo » qui saute + phrases de voyage, CSS pur, dans PageSkeleton après 1,5 s),
              Toaster (ToastProvider + useToast), UserAvatar (photo / avatar / initiale),
              ImageCropDialog, IosInstallBanner,
              LocationPickerSheet: tap → 88dvh Sheet with large search + Nominatim results;
                                     exports LocationCoord; onChangeCoord passes lat/lon directly
              MapAppIcons:         GoogleMapsIcon, WazeIcon, AppleMapsIcon, CityMapperIcon, GoogleFlightsIcon
              MapAppPicker:        MapAppPickerProvider + useOpenLocation() context hook
              ParticipantAvatar, ParticipantPicker (LA sélection multiple de participants : puces avatar,
              « Tout le monde » optionnel, payeurs, étapes, trajets, repas), ParticipantStack, SectionLabel, Spinner
  trips/      BudgetEditDialog, GettingStarted, CreateWizard (assistant unique voyage + groupe), IdentityPicker,
              OnboardingModal (bienvenue + « Ta tête dans la bande » : prénom + avatar), ShareModal,
              TripSearch, DayAgendaCard (journée utile du tableau de bord : étape en cours / à suivre + reste du jour),
              TripActionsSheet (« … » d'une carte voyage), IdentityDialog (« Qui es-tu ? »), LazyOnboarding,
              TripCard (variants featured | row, tripStatus()), TripCover (illustrations en aplats),
              TripEditDialog (ancienne présentation, à refaire dans le style des formulaires), TripEditWrapper
  settings/   DeleteAccountDialog (confirmation par saisie « SUPPRIMER »), SettingsShell (retour + grand titre), SettingsList (SettingsGroup, SettingsRow, SettingsToggle)
  trips/      FriendPicker (rangée « Ta bande » : un pote choisi = membre lié, le voyage apparaît chez lui),
              MyListCard (tableau de bord : « On compte sur toi » / « n choses sans personne »)
  ui/         switch (interrupteur iOS) +
              shadcn primitives (button, card, dialog, dropdown-menu, input, label,
              progress, select, separator, sheet, tabs, textarea, badge)
```

## Hooks (all `"use client"`, call `createClient()` internally)

Les hooks de données reposent sur SWR via `useCachedQuery` (clés : `trips`, `trip:<id>`, `claims:<id>`,
`expenses:<id>`, `itinerary:<id>`, `meals:<id>`, `checklist:<id>`, `profile`, `friends`, `friend-code`). Le cache est partagé, dédupliqué et persisté
dans localStorage (`voyou-cache-v1`, `lib/data/swr.tsx` → `DataProvider`, `clearDataCache()` à la
déconnexion / au changement de compte) : affichage instantané, revalidation en arrière-plan (focus, reconnexion).
Les mutations font `set()` (optimiste) puis `refetch()`.
```typescript
useTrips()              → { trips, loading, refetch, createTrip, deleteTrip }           // hooks/useTrip.ts
useTrip(id)             → { trip, loading, refetch, updateTrip, setMyParticipant,
                            addParticipant, updateParticipant, deleteParticipant }       // hooks/useTrip.ts
useBudget(id)           → { expenses, loading, refetch, addExpense, updateExpense,
                            deleteExpense, totalSpent }
useMeals(id)            → { meals, loading, refetch, updateMeal, deleteMeal }
useItinerary(id)        → { items, loading, refetch, addItem, updateItem, deleteItem }
useProfile()            → { profile, loading, refetch, updateProfile, signOut }
                          // updateProfile({ custom_avatar_url }) recopie l'avatar sur mes participants
useAuthUser()           → { user, loading, isAnonymous }  (suit sign-in / linkIdentity / sign-out)
useQuickAdd(cb)         → ouvre le formulaire d'une page depuis le « + » global (?new=<kind> ou événement)
useUndoableDelete(fn)   → { pending, remove(id, label) } suppression différée 5 s + toast « Annuler »
useScrolled(), useScrollDirection() → état de défilement (en-têtes, barre compacte)
useDebts(id)            → computed balances/settlements (no direct DB)
useTheme()              → { preference: system|light|dark, setPreference } (key: "voyou-theme")
useUserId()             → current user uuid (fast, no extra fetch)
useCachedQuery(key, fetcher, fallback) → { data, loading, set, refetch }  // base de tous les hooks de données
useMountOnce(open)      → true dès la 1re ouverture : monte une feuille/un dialogue chargé à la demande
useIdlePrefetch(hrefs)  → précharge les écrans suivants une fois l'écran affiché et le thread libre
useFriends()            → { friends, code, addByCode, remove, refetch }  // + addFriendsToTrip(), previewFriend()
useChecklist(id)        → { items, addItem, updateItem, deleteItem }     // notifie les nouveaux assignés
useActivity(id, on)     → { entries }                                    // journal trip_activity (lecture seule, 100 dernières)
useTripCounts(id)      → { expenses, planning, menus, lists }           // nombre d'éléments par espace (cache SWR partagé) : onglets et loupe
useRecurring(id, on)    → { items, create, remove, applyDue }            // applyDue = RPC apply_recurring_expenses (sans doublon)
```

## Lib / Utils
```
lib/
  supabase/client.ts    → createBrowserClient(): use in hooks/client components
  supabase/server.ts    → createServerClient() with cookies: use in server components/API routes
  supabase/schema.sql   → schéma de base + RLS, intégrant 021 à 023 (pas 024). ⚠️ Il NE contient PAS 016, 018, 019 et ses `join_trip` /
                          `create_trip_with_owner` sont antérieurs aux migrations 018 / 021 : projet neuf = schema.sql puis
                          016, 018, 019, 021 (voir docs/GUIDE-SUPABASE-VERCEL.md). Ne jamais le rejouer sur une base existante.
  supabase/migrations/  → 001..021_*.sql (008: RGPD, 009: multi-payer, 010: trip type,
                          011: lock join lookups, 012: join_trip RPC, 013: custom avatars,
                          014: anon join preview, 015: create_trip_with_owner RPC, 016: journeys,
                          017: payment info, 018: identity claim, 019: get_payment_info,
                          020: multi-dish meals, 021: guest accounts + transfer,
                          022: friendships + push_subscriptions + checklist_items,
                          023: trip_activity (journal) + recurring_expenses + delete_my_account,
                          024: meals.link + itinerary_items.meal_id : lien d'un repas, repas dans le planning ; projet neuf = après 023)
  auth/guest.ts         → continueAsGuest(), startUpgrade(provider), signInToExisting(provider), signInWithProvider(),
                          claimGuestTransfer(), syncProfileFromProvider(provider)
  auth/providers.ts     → AuthProvider (google|facebook), AccountMethod (+ email), enabledProviders(), FACEBOOK_ENABLED, EMAIL_ENABLED, linkedMethods(), loginChoicesLabel()
  auth/email.ts         → sendLoginCode / verifyLoginCode / startEmailUpgrade / verifyUpgradeCode / sendExistingAccountCode / verifyExistingAccountCode, mapAuthError()
  auth/redirect.ts      → safeRedirectPath(), errorRedirectUrl() (garde ?provider= au retour d'erreur vers /auth/link)
  avatar-builder.ts     → créateur d'avatar : AvatarConfig (peau, coupe, couleur, yeux, bouche, barbe, lunettes, chapeau, masque, fond) → avatarSvg() / avatarDataUrl() (URL `data:image/svg+xml`, config relisible par parseAvatarConfig()), randomConfig(graine). Aucune image à héberger.
  avatars.ts            → AVATAR_PRESETS (anciens, toujours affichés), isImageAvatar() (accepte les avatars créés), defaultPreset() (avatar tiré d'une graine), profileAvatar()
  avatar-sync.ts        → syncMyParticipantAvatars() (avatar du profil → participants liés)
  data/swr.tsx          → DataProvider (SWRConfig + cache localStorage persistant), clearDataCache()
  notifications/        → events.ts (NotifyEvent, NOTIFICATION_KINDS, isKindEnabled), notify.ts (fire-and-forget),
                          push.ts (getPushState / enablePush / disablePush), vapid.ts (clé publique)
  device-prefs.ts       → useDevicePref("motion" | "haptics"): confort par appareil (localStorage)
  boot.ts               → isBootScreen() / bootInitial() : pas d'animation d'entrée sur l'écran de lancement
  participant-colors.ts → PARTICIPANT_COLORS (palette unique des participants)
  itinerary-types.ts    → icône / libellé / teinte par type d'étape et mode de trajet
  meals/courses.ts      → COURSES (icônes Lucide), COURSE_ORDER
  forms/enter-next.ts   → handleEnter(e, onLast), focusNextField() : Entrée passe au champ de texte suivant (conteneur `data-enter-chain`), valide au dernier
  motion.ts, haptics.ts → courbes/springs Framer, haptic()
  trips/create-wizard.ts → logique pure de l'assistant de création : stepsFor(), validateStep(), firstIssue(), buildPayload(),
                          participantsOf() (créateur toujours 1er), addPerson() (doublons), datePresets(), suggestName()
  trip-emojis.ts        → THEME_EMOJIS, POPULAR_FLAGS, flagEmoji(codePays), tripEmojiChoices(paysDétecté) : emojis d'un voyage (jamais d'avion, empreinte carbone)
  trip-sections.ts      → visibleSections(features, counts, active), sectionOf(pathname, base), canSearch(total), contentWidth(pathname, base) : onglets, loupe et largeur selon le contenu
  place.ts              → shortDestination("Rome, Roma Capitale, Latium, Italie") = "Rome · Italie"
  trip-features.ts      → tripFeatures(trip), isVoyage(t), isGroup(t), TRIP_TYPE_LABELS
  budget/splits.ts      → computeShares(equal|percentage|fixed), buildDefaultSplits()
  budget/debts.ts       → computeBalances(), simplifyDebts() (greedy O(n log n))
  budget/categories.ts  → courses|restaurant|activities|transport|accommodation|other
                          (reimbursement exists in CATEGORIES but NOT in CATEGORY_ORDER, hidden from UI)
  budget/currency.ts    → toTripAmount(), convertPayers() (somme des payeurs = total au centime), parseRate()
  budget/recurrence.ts  → nextRecurrence() (jumeau TS de next_recurrence() en SQL), anchorDayOf()
  budget/schemas.ts     → Zod schemas for expenses
  currencies.ts         → CURRENCIES (dépenses), TRIP_CURRENCIES (devise d'un voyage), roundMoney()
  export/               → expenses-csv.ts (Excel FR : « ; », virgule, BOM), recap.ts (texte à partager),
                          download.ts (downloadFile, shareText), my-data.ts (export RGPD + suppression des fichiers)
  offline/outbox.ts     → file de modifications sans réseau (localStorage `voyou-outbox-v1`) : enqueue(), flushOutbox(),
                          isOfflineError(). Insert = upsert sur id client (idempotent) ; update/delete d'une ligne encore en
                          attente fusionnés. Vidée par clearDataCache() (déconnexion).
  budget/budget-color.ts → getBudgetColor(pct), getBudgetTextColor(pct)
  format-currency.ts    → formatCurrency(amount, currency), currencySymbol(currency)
  format-date.ts        → formatDateRange, formatDuration, friendlyDay (Aujourd'hui, Demain), formatClock (14:32), formatAddedAt (8 juin à 10:00)
  image-crop.ts         → getCroppedImg() for AvatarUpload / ImageCropDialog
  map-apps.ts           → MapAppId type + map app metadata
  meals/slots.ts        → DEFAULT_SLOTS, eachDate(), buildDefaultMealRows()
  meals/categories.ts   → home|picnic|restaurant
  quick-add.ts          → contextKind(), leadKind(), orderActions(), ADD_LABELS (le « + » contextuel et la feuille de choix)
  budget/guess-category.ts → guessCategory(titre) : catégorie devinée (accents et casse ignorés), null si rien d'évident
  budget/recent-titles.ts  → recentTitles(dépenses) : derniers intitulés distincts avec leur catégorie
  planning-day.ts       → itinerary day grouping
  section-theme.ts      → getSection() → maps pathname to CSS section token (used by SectionThemeController)
  trip-share.ts         → generateShareCode(), buildShareUrl()
  utils.ts              → cn() (clsx + tailwind-merge), firstName()
```

## DB Schema (key tables)
```
profiles          id, name, avatar_url (Google), custom_avatar_url (choix : preset "/avatars/x.svg",
                  photo importée ou photo Google), email, iban, phone,
                  gdpr_consented_at, gdpr_consent_version, gdpr_consent_proof
trips             id, name, type ('trip'|'group'), destination?, emoji, icon_url?,
                  currency, start_date?, end_date?, total_budget, share_code(UNIQUE), owner_id
                  // destination/start_date/end_date nullable for type='group'
participants      id, trip_id, name, color, avatar? (URL/chemin d'image = avatar du membre lié, sinon emoji)
trip_members      trip_id + user_id (composite PK), participant_id, role: owner|contributor
expenses          id, trip_id, title, amount, currency, exchange_rate, amount_in_trip_currency,
                  category, paid_by_id (legacy), payers: jsonb[], date, split_mode, splits: jsonb[], notes
meals             id, trip_id, date, slot: breakfast|lunch|snack|dinner, title?, category, link? (resto et pique-nique seulement),
                  participant_ids: uuid[], cook_ids: uuid[],
                  dishes: [{id, course: starter|main|cheese|dessert|other, name, ingredients:[{id,name,quantity}]}],
                  position
                  // title est une note optionnelle (ex "Chez Léa") depuis 020. Les plats vivent dans dishes[].
                  // Meals créés à la demande via la page menus (plus de pré-remplissage matin/midi/soir).
itinerary_items   id, trip_id, date, time, title, location, type, duration_minutes, participant_ids: uuid[]
                  // type: 'accommodation'|'activity'|'food'|'other'|'journey'
                  // meal_id? (024) : étape créée par un repas, supprimée avec lui (ON DELETE CASCADE)
                  // journey extras: destination (text), journey_mode ('car'|'foot'|'bike'|'transit'|'plane')
guest_transfers   token, guest_id, expires_at, claimed_by/at: jetons à usage unique (021, pas de policy)
profiles (+022)   friend_code (UNIQUE, généré par get_my_friend_code), notification_prefs jsonb
friendships       user_id, friend_id, source 'trip'|'invite': une ligne par sens ; remplie par le trigger
                  trip_members_link_friends (voyager ensemble = être dans la bande) + ajout par code
push_subscriptions endpoint (PK), user_id, p256dh, auth: un appareil = une ligne (save_push_subscription)
trip_activity     trip_id, actor_id, actor_name, entity 'expense'|'settlement'|'step', action created|updated|deleted,
                  title, amount, details jsonb: écrite par triggers (expenses, itinerary_items), lecture seule côté client
recurring_expenses trip_id, title, amount, currency, exchange_rate, category, payers, split_mode, splits,
                  frequency weekly|monthly, anchor_day, next_date: appliquées par apply_recurring_expenses()
checklist_items   id, trip_id, list 'bring'|'todo', title, note, assignee_ids uuid[] (participants), done, position
```
RPCs: `create_trip_with_owner`, `join_trip`, `get_join_preview`, `claim_participant`,
`create_guest_transfer`, `claim_guest_transfer`, `get_my_friend_code`, `get_friend_preview`, `add_friend_by_code`,
`remove_friend`, `get_my_friends`, `add_friends_to_trip`, `save_push_subscription`, `get_push_targets`,
`prune_push_subscription`, `apply_recurring_expenses`, `delete_my_account` (all SECURITY DEFINER, see schema.sql).
DB rows are snake_case; UI types (types/index.ts) are camelCase. Use `rowToTrip()` / `rowToExpense()` etc. for conversion.

## Design system (enforced, do not regress)

- **Monochrome** : pas de couleur dominante. `primary` = encre (noir en clair, blanc en sombre) pour
  boutons, onglets actifs, sélections. La couleur est réservée au sens (vert « on te doit », rouge
  « tu dois », teintes de catégories / types d'étape / créneaux) et aux illustrations. Le logo garde
  sa couleur, c'est la seule touche de marque. Ne pas réintroduire d'accent violet/bleu/orange.
- **Logo** : petit visage « oyo » (deux yeux en anneaux + nez/sourire en « y ») encre `#15171C` sur
  jaune soleil `#FFC83D`. Source unique : `scripts/generate-logo.mjs` (SVG + PNG PWA / maskable /
  apple-touch / favicon) et `LogoMark` (même tracé). Changer l'un = changer l'autre + `opengraph-image.tsx`.
- **Neutres** froids, clair + sombre natifs. Thème = système par défaut (`useTheme()` → `preference`
  `system | light | dark`, clé localStorage `voyou-theme`). Toujours utiliser les tokens
  (`bg-card`, `bg-secondary`, `text-foreground`, `text-muted-foreground`, `border-border`).
  Les échelles `slate`/`indigo`/`violet` sont remappées dans globals.css pour le code existant.
- **Typo** : Bricolage Grotesque (`font-display`) pour titres et montants, Inter pour le texte. Polices **hébergées** dans `app/fonts/`
  (`next/font/local`, sous-ensemble latin, polices variables) : jamais `next/font/google`, la compilation Vercel échouait par intermittence
  quand le téléchargement chez Google ratait.
  Montants en `tabular` + `font-display`. Pas de petites capitales en `uppercase tracking-wider`.
- **Surfaces** : cartes pleines `bg-card shadow-card rounded-[1.5rem]` (ou `glass` = même rendu),
  listes groupées façon iOS (rangées séparées par `border-t border-border`). Jamais de verre dépoli,
  d'orbes, de dégradés décoratifs (`gradient-primary` = aplat) ni d'emoji comme icône.
- **Illustrations** : `TripCover` (aplats doux : ciel, sable, sauge, argile, nuit, or), choisie par
  `seed` = id. Même palette pour l'écran de connexion et les avatars.
- **Avatars** : créés par l'utilisateur dans `AvatarPicker` (créateur : catégories Peau et fond · Cheveux · Visage · Accessoires, « Au hasard », photo Google en option). Les 16 anciens `public/avatars/*.svg` restent pour ceux qui les ont choisis (`scripts/generate-avatars.mjs`, `lib/avatars.ts`). Priorité d'affichage : choix (`custom_avatar_url`) > photo Google > initiale.
- **Motion** : `lib/motion.ts` (`EASE_OUT`, `EASE_SHEET`, `spring`, `fadeUp`, `stagger`). Indicateurs
  glissants via `layoutId` (TripNav, SegmentedControl, DayTabs). Respect de `prefers-reduced-motion`
  (MotionConfig + CSS). `pressable` pour le retour tactile.
- **Formulaires** : participants → `ParticipantPicker` ; dates/heures → `DateField` / `TimeField` ;
  listes éditables → liste groupée `rounded-[1.25rem] bg-secondary` + `ParticipantAvatar`. Sélection = encre
  (`bg-primary text-primary-foreground`), jamais une teinte (pas d'ambre/violet pour « sélectionné »).
- **Chargement** : `PageSkeleton` montre la forme de l'écran tout de suite ; si l'attente dépasse 1,5 s, les blocs
  s'effacent et `VoyouLoader` prend le relais (le visage saute, regarde en l'air, cligne ; phrases qui tournent).
  CSS/SVG uniquement (classes `.vl*` dans globals.css) : visible dès le HTML, sans JS, mouvements réduits respectés.
  Jamais de spinner générique pour une page entière ; `Loader2` reste réservé aux boutons.
- **Accessibilité** : zoom autorisé, cibles ≥ 44 px, `aria-label` sur les boutons icônes.

## Parcours (enforced, do not regress)

- **Épure** : n'afficher que ce qui diffère du défaut (pas de « Tout le monde », « À la maison », compteurs à 1,
  tuile à 0 €) ; une action = un seul endroit (pas de menu « … » qui répète un geste ou un bouton visible).
- **Réglages** : carte profil → sous-pages (profil, bande, remboursements, notifications, apparence, compte) ;
  champs en liste groupée, un seul bouton « Enregistrer » flottant qui n'apparaît que si quelque chose a changé.

- **Navigation voyage** : barre d'onglets flottante (matière translucide = seule zone « verre » autorisée),
  qui se compacte au défilement ; toucher l'onglet actif ou le titre de l'en-tête remonte en haut.
  **Onglets selon le contenu** (`visibleSections()`) : Résumé et Budget toujours ; Planning, Menus et Listes n'apparaissent que
  lorsqu'ils contiennent quelque chose (ou quand on est dessus : l'onglet courant ne disparaît jamais). La première création passe par
  « Premiers pas » et le « + » (feuille de choix). Libellés plus grands quand il y a peu d'onglets. La loupe de l'en-tête
  n'apparaît qu'à partir de 5 éléments (`SEARCH_MIN_ITEMS`).
- **Ordinateur** (une seule app responsive, pas deux versions ; point de bascule `lg` = 1024 px) : le menu latéral à gauche (`TripNav`,
  `aside`, largeur 16rem, bouton « + Dépense / Étape / Repas / Liste » selon l'écran, « Ajouter » sur le Résumé, flèche pour les autres ajouts)
  remplace la barre du bas et le « + » ; `TripMain` donne une colonne de lecture (`max-w-3xl`) aux pages, deux colonnes (CSS `columns`,
  `max-w-5xl`) au Résumé ; la liste des voyages passe en grille. Sans souris, rien ne change (téléphone et tablette en portrait). Le crayon et la corbeille
  (`HoverActions`, parent en `group`) apparaissent au survol des cartes de dépense, de repas, d'étape et d'élément de liste ; sur une carte de
  voyage le crayon seul (supprimer reste derrière la confirmation du menu « … »). Uniquement avec un pointeur précis (`[@media(pointer:fine)]`),
  jamais au toucher : toucher = modifier, glisser = supprimer. Le crayon d'une dépense ouvre directement le formulaire (`onQuickEdit`), pas la fiche. À faire ensuite : raccourcis clavier (N, /, Échap) et panneaux latéraux à la place des feuilles du bas.
- **Ajout rapide** : le bouton « + » de la barre agit selon l'écran (`contextKind()` dans `lib/quick-add.ts`) : Budget = nouvelle
  dépense, Planning = étape, Menus = repas, Listes = champ d'ajout. Un seul toucher. Sur l'accueil du voyage (et dans un budget de
  groupe sans planning), il ouvre la feuille de choix. **Appui long** (450 ms), clic droit ou bouton lecteur d'écran = feuille de choix
  complète (`QuickAddSheet` : l'action de l'écran, sinon la dépense, en grande ligne EN BAS, sous le pouce qui vient de toucher « + » ; les autres
  en liste groupée au-dessus, la plus probable au plus près du bas, sans phrases d'aide).
  Une astuce unique (« maintiens + ») s'affiche au 3e ajout direct. Les pages ouvrent leur formulaire via `useQuickAdd()`
  (événement si déjà sur la page, sinon `?new=<kind>`). Pas de FAB par page.
- **Formulaires** (`components/forms/`) : une seule page, jamais d'onglets pour un petit formulaire. Un champ principal (`HeroInput` :
  le plat, le titre, le montant), les réglages en puces (`PropertyChips`) qui affichent leur valeur, s'affirment quand elle diffère du défaut
  (aucune coche de validation) et ouvrent leur choix en dessous. Tout le facultatif est replié (« + Ajouter une note »), pas de « (optionnel) ».
  Action principale dans `FormFooter`, en bas sous le pouce, jamais grisée sans explication (message + secousse + focus du champ manquant).
  Clavier : `enterKeyHint`, premier champ au focus à l'ouverture, Entrée = champ suivant puis validation (`handleEnter`, zone de texte exceptée).
  Formulaires concernés : repas, dépense, étape, trajet. Le trajet calcule seul sa durée dès que départ et arrivée sont choisis.
- **Repas et planning** : enregistrer un repas crée son étape dans le planning (`syncMeal()` de `useItinerary`, `mealPlanningEntry()` dans
  `lib/meals/planning.ts`) : type « food », heure par défaut (déjeuner 12:00, une heure ; petit-déjeuner 08:00 ; goûter 16:00, 30 min ; dîner 20:00),
  titre « Déjeuner · Chez Léa ». Ensuite seuls titre, description et participants suivent le repas : jour, heure et durée déplacés dans
  l'onglet Planning ne sont jamais écrasés. Supprimer le repas supprime l'étape (cascade). Un lien (`normalizeLink()`) est proposé pour un
  resto ou un pique-nique, jamais à la maison ; il s'affiche sur la carte du repas (nom du site) et dans la description de l'étape.
- **Saisie rapide d'une dépense** : seul le montant est obligatoire (titre facultatif, par défaut la catégorie), puces des titres récents
  (`recentTitles()`, reprennent la catégorie), catégorie devinée d'après le titre tant qu'elle n'a pas été choisie (`guessCategory()`),
  « Dupliquer » dans la fiche d'une dépense (date du jour), et après un ajout la pastille « Ajouter une autre » (budget et planning).

- **Recherche** : `TripSearch` (loupe de l'en-tête) cherche dans dépenses, planning, repas, listes et participants
  (sans accents). Liens profonds : `budget?expense=<id>`, `budget?tab=balances`,
  `planning?date=YYYY-MM-DD&item=<id>`, `menus?date=YYYY-MM-DD`, `lists?item=<id>`.
- **Retours** : `useToast()` (`ToastProvider` à la racine) après chaque création / modification / suppression,
  `haptic()` sur les gestes. Feuilles du bas fermables en glissant la poignée.
- **Création** : un seul assistant (`CreateWizard`), 3 étapes (voyage : Où · Quand · Avec qui ; groupe : Nom · Quand · Avec qui),
  aperçu en direct de la carte, barre d'action fixe. Le bouton n'est JAMAIS grisé sans explication : un toucher sur un champ
  incomplet affiche le message (`role="alert"`, secousse, haptique). Une seule source de vérité pour les participants : le créateur
  (prénom du profil) est dérivé, jamais recopié dans un état de formulaire. À la validation finale `firstIssue()` renvoie à l'étape
  fautive au lieu d'échouer en silence. Toute évolution passe par `lib/trips/create-wizard.ts` + son test.
  Emoji du voyage : le drapeau du pays choisi (`countryCode` de `LocationPickerSheet`) est proposé en premier et présélectionné tant que
  l'utilisateur n'a pas choisi lui-même ; puis thèmes (train, plage…) et drapeaux courants. Pas d'avion (empreinte carbone).
- **Trajets** : le mode « Avion » reste disponible dans `JourneyForm` (calcul de trajet, avertissement CO₂) ; seul l'emoji d'un voyage évite l'avion.
- **Payeur** : toujours la photo de profil du participant (`ParticipantAvatar`), jamais un point de couleur. **Heure d'ajout** d'une dépense :
  `· 14:32` sur la carte (`createdAt`, heure locale), « Ajoutée le 8 juin à 10:00 » dans la fiche.
- **Identité du voyage** : l'emoji ou le drapeau choisi s'affiche devant le titre (tableau de bord, cartes de la liste). Destination
  toujours abrégée (`shortDestination()`). Participants = avatars + prénoms (« Toi, Léa, Marc +2 ») ; la pastille « Qui es-tu ? »
  n'apparaît que si on n'est pas encore relié à un participant (toucher les avatars rouvre le choix). Pas d'illustration par défaut : la couverture est une photo facultative (modifier le voyage › « Photo de couverture »), sans photo la liste montre l'emoji sur une tuile et le Résumé n'a pas de bandeau.
- **Tableau de bord** : `GettingStarted` (n'affiche que les étapes restantes) puis budget, solde, `DayAgendaCard`
  (aujourd'hui, ou demain une fois la journée finie), repas du jour. Une carte vide n'est pas affichée si
  « Premiers pas » invite déjà à la remplir. Solde : une seule tuile large si un seul sens est non nul.

## Performance & cache (enforced, do not regress)

- **Données** : toujours via les hooks SWR (`useCachedQuery`). Jamais de `useEffect` + `fetch` maison.
  Une page revisitée ou rechargée s'affiche depuis le cache, sans squelette.
- **Pages connectées** : rendues côté client derrière `ClientOnly` (fallback `PageSkeleton`) pour lire le
  cache sans erreur d'hydratation. `app/trips/[tripId]/layout.tsx` ne fait aucune requête serveur ;
  `TripNav` lit le type du voyage via `useTrip()`. `loading.tsx` = squelette pendant la navigation.
- **Navigation** : `<Link prefetch>` sur les onglets et les cartes voyage, `experimental.staleTimes`
  (next.config.ts) pour réutiliser le rendu RSC, `optimizePackageImports` (lucide, framer-motion).
- **Middleware** (`proxy.ts`) : ne tourne pas pour les assets ni `/api`. Lit l'expiration du jeton dans le cookie
  `sb-<ref>-auth-token` (éventuellement découpé en `.0`, `.1`…) : jeton valide = aucun appel réseau ; jeton qui
  expire / illisible → `getClaims()` (rafraîchit la session), erreur → déconnecté. La RLS protège les données.
- **Service worker** (`public/sw.js`) : cache-first pour `/_next/static`, `/avatars`, `/icons` ; écrans de l'app
  (`/trips*`, `/settings*`) en stale-while-revalidate (cache `voyou-pages-v1` : lancement instantané). Nouveau
  déploiement détecté (scripts différents) → cache des écrans vidé + message `voyou:new-version` → `PwaRegister`
  recharge si rien n'a été touché, sinon navigation complète au prochain lien. `clearDataCache()` vide aussi ce
  cache (déconnexion), et `PwaRegister` renvoie au login si un écran sauvegardé s'affiche sans session.
  Incrémenter `CACHE` quand les assets précachés changent.
- **Lancement** : le premier écran s'affiche tel quel (`isBootScreen()` : pas de fondu `PageTransition`, pas de
  cascade `Stagger`, montant final direct dans `NumberTicker`, `bootInitial()` sur les pages d'entrée). Jamais
  d'`initial={{ opacity: 0 }}` sur un contenu rendu côté serveur sans passer par `bootInitial()`.
- **JS au lancement** : framer-motion via `m` (import `{ m as motion }`, `LazyMotion strict`: un `motion` complet
  lève une erreur). Feuilles et dialogues fermés au départ = module à part chargé à la 1re ouverture
  (`dynamic` + `useMountOnce`) : QuickAddSheet, MapAppPickerSheet, TripActionsSheet, IdentityDialog,
  ConfirmDeleteDialog, bandeau d'installation, `LazyOnboarding` (seulement s'il y a quelque chose à montrer).
  Pas de `<Link prefetch>` au lancement : `useIdlePrefetch` (onglets, voyages de la liste).
- **Données** : la liste des voyages est lue en une requête (`trip_members` + `trips` + `participants` imbriqués).

## Bande, notifications, listes (enforced, do not regress)

- **Promesse** : Voyou = « les voyages entre potes, sans embrouilles » → qui paie, qui fait quoi, quand.
  Un nouvel espace doit résoudre une embrouille de groupe ; pas de chat, pas d'album photo (WhatsApp/Photos le font).
- **Listes** : un seul espace, deux listes (« À apporter », « À faire »), assignation à des participants,
  coche directe, suggestions dans l'état vide. `tripFeatures().hasLists` (voyages et groupes).
- **Ta bande** : jamais saisie à la main. Elle se remplit en voyageant (trigger) ou par lien `/friends/add?code=`.
  À la création (CreateWizard, `?with=<id>`) ou dans l'édition du voyage, `FriendPicker` +
  `addFriendsToTrip()` (RPC `add_friends_to_trip`) : participant + membre lié, sans code de partage.
- **Notifications** : le client n'envoie qu'un `NotifyEvent` via `notify()` (jamais de texte) ; le serveur lit les
  données avec la RLS de l'appelant, rédige et cible (`get_push_targets` filtre bande/voyage + préférences).
  Préférences par type dans Réglages › Notifications (défaut : tout sauf « planning »). Sans `VAPID_PRIVATE_KEY`
  l'app marche, seules les notifications sont muettes. Sur iPhone : PWA installée requise.
- **Réglages** : menu + sous-pages via `SettingsShell` / `SettingsGroup`. Confort par appareil (animations,
  vibrations) dans `device-prefs.ts`, préférences de compte dans `profiles`.

## Fiabilité des données (enforced, do not regress)

- **Hors-ligne** : ajouter / modifier / supprimer une dépense et cocher une liste marchent sans réseau
  (`lib/offline/outbox.ts`). Toute nouvelle mutation « de voyage » doit suivre le même schéma : id généré côté client,
  `isOfflineError(error)` → `enqueue(...)` au lieu de revert/throw, et la lecture SWR fusionne la file
  (`withPendingChanges` dans `useBudget`). Une dépense en attente porte `pending: true` (badge « En attente »).
- **Multi-devises** : le formulaire travaille en devise du voyage pour « Payé par » / « Pour qui » ; seul le champ
  montant est dans la devise choisie. On stocke montant d'origine + `exchange_rate` + `amount_in_trip_currency`.
  Toujours passer par `lib/budget/currency.ts` (arrondi au centime, aucun centime perdu).
- **Journal** : jamais écrit par le client (triggers). Ne pas dupliquer cette logique côté app.
- **Suppression de compte** : `delete_my_account()` transfère les voyages à un autre membre (ou les supprime si seul).
  Les participants restent (sans compte) pour que les soldes des autres tombent juste.
- **Tests** : `npm test` (node:test, sans dépendance) couvre répartitions, dettes, devises, récurrence, exports, file
  hors-ligne. Toute modification de `lib/budget/*`, `lib/export/*` ou `lib/offline/*` s'accompagne d'un test.

## Comptes invités (enforced, do not regress)

- **Fournisseurs** : Google toujours ; Facebook seulement si `NEXT_PUBLIC_FACEBOOK_LOGIN=true` (à n'activer qu'une fois
  Facebook configuré dans Supabase + app Meta en mode Live). Jamais de `"google"` en dur : passer par `AuthProvider`
  et `enabledProviders()`. Libellés génériques (« ton compte », `loginChoicesLabel()`), pas « Google » seul.
- **E-mail** : code à 6 chiffres sans mot de passe (`lib/auth/email.ts`, `components/auth/EmailAuthDialog.tsx`), visible seulement si
  `NEXT_PUBLIC_EMAIL_LOGIN=true` (exige SMTP + modèles `{{ .Token }}` dans Supabase). Connexion = `signInWithOtp` + `verifyOtp(type:"email")` ;
  sauvegarde d'un invité = `updateUser({email})` + `verifyOtp(type:"email_change")` ; adresse déjà inscrite → `exists` → code de connexion
  (`shouldCreateUser:false`) puis `claimGuestTransfer()`. Ne pas mettre `maxLength` sur le champ du code (les codes collés contiennent des espaces).
- Pas de CAPTCHA Supabase : l'app n'envoie pas de `captchaToken`, l'activer casserait le mode invité.
- « Continuer en tant qu'invité » = `supabase.auth.signInAnonymously()` : vrai utilisateur
  (`is_anonymous`), toutes les RLS/RPC fonctionnent sans changement.
- Sauvegarde = `linkIdentity({ provider: "google" })` → même uid, aucune copie. Avant, on crée un jeton
  (`create_guest_transfer`, gardé en localStorage). Si Google existe déjà (`identity_already_exists`) :
  connexion au compte existant puis `claim_guest_transfer(token)` qui déplace voyages + memberships
  (fusion sans doublon), complète le profil et supprime l'invité vide. Voir migration 021.
- Prérequis Supabase : « Allow anonymous sign-ins » + « Allow manual linking » activés.
- Un invité est signalé (point ambre sur l'avatar, carte sur /trips et /settings) ; la déconnexion
  d'un invité passe par `GuestSignOutDialog`.

## UX Patterns (enforced, do not regress)

### Location input
**Always use `LocationPickerSheet`**, never raw text input or the old `LocationAutocomplete`.
- Tap → 88dvh bottom Sheet with large search field + Nominatim results split into main name / subtitle
- `onChangeCoord` returns `LocationCoord` (`lat`, `lon`, `countryCode`) directly from the Nominatim result, no extra `/api/geocode` call needed
- Used in: `ItineraryItemForm`, `JourneyForm`, `TripEditDialog`

### Full-screen forms
All creation/edit forms are full-screen or near-full-screen on mobile:
- **Sheet 92dvh** (bottom): `ExpenseForm`, `MapAppPicker`
- **Sheet 88dvh** (bottom): `LocationPickerSheet`, `ExpenseDetailSheet`
- **Dialog full-screen mobile / centered desktop**: `ItineraryItemForm`, `JourneyForm`, `MealEditDialog`
  (className `FULLSCREEN_DIALOG` exporté par `components/ui/dialog.tsx`)

### Expense flow
Tap card → `ExpenseDetailSheet` (read-only: amount, payers, splits) → "Modifier" → `ExpenseForm`.
Swipe left on card = delete with a 5 s "Annuler" toast (`useUndoableDelete`). No confirmation dialog.
Same for expenses, itinerary items and meals (also from detail sheets / menus). Étapes et trajets : toucher la carte
= modifier, bouton rond = itinéraire, « Supprimer » en bas du formulaire d'édition (pas de menu « … » sur les cartes).
Budget page accepts `?tab=balances` to open the Soldes tab (used by the dashboard balance tiles).

### Number inputs
All `<input type="number">` and amount text inputs must have `onFocus={(e) => e.target.select()}` so tapping replaces the value immediately.

### Map app redirection
`useOpenLocation()` from `MapAppPickerProvider`: call with a location string, shows the branded picker sheet. Deep links use coordinates when available (from `LocationPickerSheet.onChangeCoord`).

## Coding Conventions
- **Client/Server split**: hooks and interactive components → `"use client"`. Pages/layouts default to RSC.
- **No bare SQL**: always use Supabase query builder (`supabase.from().select().eq()...`)
- **Mutations**: call hook method → hook auto-refetches. Never mutate local state directly.
- **Forms**: react-hook-form + Zod in dialogs/modals. Multi-step → pattern CreateWizard (logique pure dans `lib/trips/`, testée).
- **Styling**: Tailwind utility classes + CSS custom properties for theme. `cn()` for conditional classes.
- **Icons**: Lucide only (never emoji as icon in code, except the emoji pickers of CreateWizard / TripEditDialog).
- **No comments** unless WHY is non-obvious.
- **Ponctuation** : jamais de tiret cadratin (U+2014) dans le code, les textes de l'interface, les commentaires ni la doc. Utiliser les deux-points, la virgule, le point, des parenthèses, ou le point médian `·` pour les titres et séparateurs d'interface.
- **Env vars**: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Common Patterns

### Auth check in server component
```typescript
import { createClient } from "@/lib/supabase/server";
const supabase = await createClient();
const { data: { user } } = await supabase.auth.getUser();
if (!user) redirect("/login");
```

### New hook pattern
```typescript
"use client";
import { createClient } from "@/lib/supabase/client";
export function useX(tripId: string) {
  const [data, setData] = useState<X[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  const refetch = useCallback(async () => { ... }, [tripId]);
  useEffect(() => { refetch(); }, [refetch]);
  return { data, loading, refetch };
}
```

### New shadcn component
```bash
npx shadcn@latest add <component>
```
