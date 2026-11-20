"use client";

import { TriangleAlert } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { GoogleIcon } from "@/components/auth/GoogleIcon";
import { startGoogleUpgrade } from "@/lib/auth/guest";

/** A guest who signs out loses access to their data: offer to save it first. */
export function GuestSignOutDialog({
  open,
  onOpenChange,
  onSignOut,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSignOut: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="max-w-sm text-center">
        <span className="mx-auto flex size-14 items-center justify-center rounded-[1.1rem] bg-amber-500/15 text-amber-400">
          <TriangleAlert size={24} />
        </span>
        <div className="space-y-1.5">
          <DialogTitle>Tes voyages invité seront perdus</DialogTitle>
          <DialogDescription className="text-[0.95rem] leading-relaxed">
            Un compte invité ne peut pas être retrouvé après déconnexion. Sauvegarde-le avec Google, c&apos;est instantané.
          </DialogDescription>
        </div>
        <div className="space-y-2">
          <Button size="lg" className="w-full" onClick={() => void startGoogleUpgrade()}>
            <GoogleIcon />
            Sauvegarder avec Google
          </Button>
          <Button variant="ghost" size="lg" className="w-full text-red-400 hover:text-red-400" onClick={onSignOut}>
            Me déconnecter quand même
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
