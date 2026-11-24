import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Confidentialité",
  description: "Quelles données Voyou garde, pourquoi, et comment les supprimer.",
};

const UPDATED = "24 novembre 2026";
const CONTACT = process.env.NEXT_PUBLIC_CONTACT_EMAIL;

function Section({ id, title, children }: { id?: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-6 space-y-2">
      <h2 className="font-display text-xl font-bold tracking-tight">{title}</h2>
      <div className="space-y-2 text-[0.98rem] leading-relaxed text-muted-foreground">{children}</div>
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <main
      className="mx-auto w-full max-w-2xl space-y-8 px-6"
      style={{ paddingTop: "calc(env(safe-area-inset-top) + 2rem)", paddingBottom: "calc(env(safe-area-inset-bottom) + 3rem)" }}
    >
      <Link href="/login" className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-foreground">
        <ArrowLeft size={16} aria-hidden="true" />
        Retour
      </Link>

      <header className="space-y-2">
        <h1 className="font-display text-[2.2rem] leading-[1.05] font-extrabold tracking-[-0.03em]">Confidentialité</h1>
        <p className="text-muted-foreground">
          Voyou (voyou.app) sert à partager un budget, un planning et des menus entre potes. Voici ce qu&apos;on garde, pourquoi, et comment tout effacer.
          Dernière mise à jour : {UPDATED}.
        </p>
      </header>

      <Section title="Ce que Voyou garde">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <strong className="text-foreground">Ton compte</strong> : si tu te connectes avec Google ou Facebook, ton nom, ton adresse e-mail (quand le
            service la fournit) et ta photo de profil. Avec un e-mail, seulement cette adresse. En mode invité, seulement un identifiant anonyme.
          </li>
          <li>
            <strong className="text-foreground">Ton profil</strong> : le prénom et l&apos;avatar que tu choisis. Ton IBAN et ton téléphone sont
            facultatifs : si tu les renseignes, les membres de tes voyages peuvent les consulter pour te rembourser.
          </li>
          <li>
            <strong className="text-foreground">Ce que tu crées</strong> : voyages, participants, dépenses, étapes, trajets, repas, listes, et le
            journal des modifications (qui a ajouté, modifié ou supprimé quoi).
          </li>
          <li>
            <strong className="text-foreground">Sur ton appareil</strong> : une copie de tes voyages pour que l&apos;app s&apos;ouvre vite et marche
            hors ligne, tes préférences, et un identifiant d&apos;appareil si tu actives les notifications.
          </li>
        </ul>
        <p>
          Voyou n&apos;affiche aucune publicité, n&apos;utilise aucun outil de mesure d&apos;audience, et ne vend ni ne loue tes données.
        </p>
      </Section>

      <Section title="Si tu te connectes avec Facebook ou Google">
        <p>
          Voyou reçoit uniquement ton nom, ton adresse e-mail (si elle existe) et ta photo de profil. Voyou ne publie rien en ton nom et n&apos;accède ni
          à tes amis, ni à tes publications, ni à tes messages. Certains comptes Facebook n&apos;ont pas d&apos;adresse e-mail : la connexion peut alors ne
          pas aboutir, et tu peux utiliser Google ou le mode invité.
        </p>
      </Section>

      <Section title="Pourquoi">
        <p>
          Pour faire fonctionner le service : calculer les soldes, afficher les voyages à ceux qui y participent, envoyer les notifications que tu as
          activées. Le traitement repose sur ton consentement, demandé à ta première connexion et conservé avec une preuve horodatée.
        </p>
      </Section>

      <Section title="Qui voit tes données">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>Les autres membres d&apos;un voyage voient ce voyage : participants, dépenses, planning, listes, journal.</li>
          <li>
            <strong className="text-foreground">Supabase</strong> (base de données et authentification) et{" "}
            <strong className="text-foreground">Vercel</strong> (hébergement) traitent les données pour notre compte.
          </li>
          <li>
            <strong className="text-foreground">Google</strong> et <strong className="text-foreground">Meta (Facebook)</strong> interviennent seulement
            au moment de la connexion. Pour la connexion par e-mail, un prestataire d&apos;envoi d&apos;e-mails transmet le code à ton adresse.
          </li>
          <li>
            Les lieux que tu saisis sont envoyés à <strong className="text-foreground">OpenStreetMap (Nominatim)</strong> pour les retrouver, et les
            trajets à un service d&apos;itinéraires libre (<strong className="text-foreground">OSRM</strong>). Les taux de change viennent de{" "}
            <strong className="text-foreground">Frankfurter</strong> (aucune donnée personnelle envoyée).
          </li>
        </ul>
      </Section>

      <Section title="Combien de temps">
        <p>
          Tant que ton compte existe. Un compte invité abandonné peut être supprimé. Quand tu supprimes ton compte, tes données personnelles sont
          effacées (voir plus bas).
        </p>
      </Section>

      <Section title="Tes droits">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <strong className="text-foreground">Accéder à tes données</strong> : Réglages › Compte et données › « Télécharger mes données » (fichier JSON).
          </li>
          <li>
            <strong className="text-foreground">Corriger</strong> : Réglages › Profil.
          </li>
          <li>
            <strong className="text-foreground">Retirer ton consentement et supprimer</strong> : voir ci-dessous.
          </li>
          <li>
            Tu peux aussi saisir la CNIL (cnil.fr) si tu estimes que tes droits ne sont pas respectés.
          </li>
        </ul>
        {CONTACT && (
          <p>
            Une question ? Écris à{" "}
            <a href={`mailto:${CONTACT}`} className="font-semibold text-foreground underline underline-offset-4">
              {CONTACT}
            </a>
            .
          </p>
        )}
      </Section>

      <Section id="suppression" title="Supprimer mes données">
        <p>Tu peux tout effacer toi-même, à tout moment, sans nous écrire :</p>
        <ol className="list-decimal space-y-1.5 pl-5">
          <li>Ouvre Voyou et connecte-toi.</li>
          <li>Va dans Réglages › Compte et données.</li>
          <li>Touche « Supprimer mon compte » et confirme en tapant SUPPRIMER.</li>
        </ol>
        <p>
          Ton compte, ton profil, ta bande et tes abonnements aux notifications sont effacés. Les voyages où tu étais seul disparaissent ; dans les
          autres, un autre membre devient propriétaire et ton prénom reste sur les dépenses passées, pour que les comptes de la bande restent justes.
          Les photos que tu as envoyées sont supprimées.
        </p>
        <p>
          Tu t&apos;es connecté avec Facebook ? Tu peux aussi retirer Voyou de ton compte Facebook : Paramètres › Applications et sites web › Voyou ›
          Supprimer.
        </p>
      </Section>
    </main>
  );
}
