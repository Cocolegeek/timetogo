# Audit Voyou vs critiques des apps de partage de frais

Sources : avis Trustpilot / App Store / Google Play de Tricount et Splitwise, comparatifs 2026.
Fiabilité : agrégateurs et sites de comparaison, souvent affiliés. À lire comme des tendances, pas des chiffres.
État de Voyou vérifié dans le code (branche de travail).

## Ce que les utilisateurs reprochent le plus

| # | Critique (app) | Voyou aujourd'hui | Verdict |
|---|---|---|---|
| 1 | Bugs, synchro entre appareils qui ne se met pas à jour (Tricount) | SWR + cache localStorage, revalidation au focus / reconnexion | Plutôt bon. Pas de temps réel : deux potes qui saisissent en même temps ne se voient qu'au prochain focus |
| 2 | Plafond de dépenses/jour, pubs, nouveautés passées en payant (Splitwise, Tricount post-rachat) | Aucun plafond, aucune pub | Argument fort à garder visible. Risque : modèle économique à décider avant d'avoir des utilisateurs |
| 3 | Exiger un compte à tous les participants (Splitwise) | Comptes invités + participants sans compte + lien de partage | Très bon |
| 4 | Pas d'export / impression du récap (Tricount) | Aucun export | **Manque.** CSV + récap partageable (image/PDF) en fin de voyage |
| 5 | Multi-devises : taux saisis à la main ou inexacts (Tricount) | Le formulaire envoie toujours `exchangeRate: 1` : une devise par voyage | **Manque réel** pour un voyage à l'étranger (Rome en EUR ok, mais Londres, Tokyo, etc.) |
| 6 | Erreurs d'arrondi / « math inaccurate » | Répartition en centimes avec reste distribué (`distributeCents`) ; pourcentages ajustés sur le dernier | Bon. Ajouter des tests unitaires sur `splits.ts` / `debts.ts` pour le prouver |
| 7 | Gros groupes difficiles à gérer (Tricount) | Simplification gloutonne des dettes | Correct. Non testé à 15+ participants |
| 8 | Modes de répartition peu clairs | 3 onglets Infos / Payé par / Pour qui | Bon. Vérifier qu'un utilisateur comprend « Payé par » multiple sans aide |
| 9 | Pas de dépenses récurrentes (location, courses) | Absent | Mineur pour des voyages ; utile pour les « groupes » |
| 10 | Pas de photo de ticket | Absent | Mineur. Pas prioritaire, WhatsApp/Photos le font déjà |
| 11 | Pas d'historique : qui a modifié / supprimé quoi (cause d'embrouilles) | Seulement `updated_at` ; suppression annulable 5 s | **Manque**, et c'est exactement la promesse « sans embrouilles » : journal d'activité par voyage |
| 12 | Virements dans l'app déconseillés / liaison bancaire (avis Bunq) | Voyou ne touche pas à l'argent : IBAN / tel copiables | Bon choix, à conserver (pas de risque réglementaire) |
| 13 | Connexion en ligne qui force à installer l'app (Tricount) | PWA, aucune installation requise | Bon |

## Points propres à Voyou à vérifier (hors avis concurrents)

1. **Hors-ligne en écriture** : le service worker met en cache les écrans, mais aucune file d'attente de mutations n'existe. En avion ou en montagne, une dépense saisie échoue. C'est LA situation de voyage. Priorité haute.
2. **Suppression de compte (RGPD)** : aucune action « supprimer mon compte » trouvée dans le code. Le consentement RGPD existe (migration 008), la suppression est obligatoire pour une app avec consentement.
3. **Marquer un remboursement comme fait** : la catégorie `reimbursement` existe mais est cachée de l'UI. Vérifier que « Régler » crée bien l'écriture, sinon les soldes ne bougent pas après un virement.
4. **Titres trop longs** : les trajets stockaient l'adresse complète Nominatim comme titre (corrigé : « Paris → Bordeaux », y compris pour les trajets déjà créés).

## Priorisation proposée

1. Hors-ligne : file de mutations + indicateur « en attente de réseau ».
2. Suppression de compte + export des données (RGPD).
3. Journal d'activité du voyage (embrouilles).
4. Multi-devises avec taux du jour modifiable.
5. Export CSV / récap de fin de voyage partageable.
6. Tests unitaires sur splits / debts.
7. Dépenses récurrentes (surtout pour `type: "group"`).

## Sources

- Tricount, avis Trustpilot : https://ca.trustpilot.com/review/tricount.com
- Rapport Kimola, avis Google Play : https://kimola.com/reports/in-depth-tricount-app-feedback-report-reveals-crucial-insights-google-play-en-157042
- Problèmes signalés (JustUseApp) : https://justuseapp.com/en/app/349866256/tricount-compte-entre-amis/problems
- Résumé des avis App Store : https://chrome-stats.com/d/id349866256
- Splitwise, plafond quotidien : https://getfinny.app/blog/best-splitwise-alternatives-2026
- Splitwise, avis : https://www.moneycrashers.com/splitwise-review/
- Rachat par Bunq : https://www.presse-citron.net/lapplication-tricount-rachetee-par-une-neobanque-ca-change-quoi/
- Tricount vs Splitwise : https://tricount.com/splitwise-vs-tricount
