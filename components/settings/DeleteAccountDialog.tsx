"use client";

import { useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { clearDataCache } from "@/lib/data/swr";
import { deleteMyStoredFiles } from "@/lib/export/my-data";
import { createClient } from "@/lib/supabase/client";

const WORD = "SUPPRIMER";

export function DeleteAccountDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const confirm = async () => {
    setBusy(true);
    setError(null);
    try {
      await deleteMyStoredFiles();
      const supabase = createClient();
      const { error: rpcError } = await supabase.rpc("delete_my_account");
      if (rpcError) throw rpcError;
      clearDataCache();
      await supabase.auth.signOut({ scope: "local" }).catch(() => null);
      window.location.href = "/login";
    } catch {
      setError("La suppression a échoué. Vérifie ta connexion et réessaie.");
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogContent showCloseButton={false} className="max-w-sm">
        <span className="mx-auto flex size-14 items-center justify-center rounded-[1.1rem] bg-red-500/15 text-red-400">
          <Trash2 size={24} />
        </span>
        <div className="space-y-2 text-center">
          <DialogTitle>Supprimer mon compte</DialogTitle>
          <DialogDescription className="text-[0.95rem] leading-relaxed">
            C&apos;est définitif. Les groupes où tu es seul disparaissent. Dans les autres, quelqu&apos;un d&apos;autre devient propriétaire et ton
            prénom reste sur les dépenses passées, pour que les comptes de la bande tombent toujours juste.
          </DialogDescription>
        </div>
        <div className="space-y-2">
          <label htmlFor="delete-confirm" className="px-1 text-sm font-semibold">
            Tape {WORD} pour confirmer
          </label>
          <Input
            id="delete-confirm"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            autoCapitalize="characters"
            autoComplete="off"
            placeholder={WORD}
          />
          {error && <p role="alert" className="px-1 text-sm text-red-400">{error}</p>}
        </div>
        <div className="space-y-2">
          <Button
            size="lg"
            className="w-full bg-red-500 text-white hover:bg-red-500/90"
            disabled={typed.trim().toUpperCase() !== WORD || busy}
            onClick={confirm}
          >
            {busy ? <Loader2 size={18} className="animate-spin" /> : "Supprimer définitivement"}
          </Button>
          <Button variant="ghost" size="lg" className="w-full" disabled={busy} onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
