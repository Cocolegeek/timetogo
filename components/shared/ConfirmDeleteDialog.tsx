"use client";

import { useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ConfirmDeleteDialogProps {
  title: string;
  description: React.ReactNode;
  onCancel: () => void;
  onConfirm: () => void | Promise<void>;
}

export function ConfirmDeleteDialog({ title, description, onCancel, onConfirm }: ConfirmDeleteDialogProps) {
  const [deleting, setDeleting] = useState(false);

  return (
    <Dialog open onOpenChange={(open) => { if (!open && !deleting) onCancel(); }}>
      <DialogContent showCloseButton={false} className="max-w-sm text-center">
        <span className="mx-auto flex size-14 items-center justify-center rounded-[1.1rem] bg-red-500/12 text-red-400">
          <Trash2 size={24} />
        </span>
        <div className="space-y-1.5">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="text-[0.95rem] leading-relaxed">{description}</DialogDescription>
        </div>
        <div className="mt-1 grid grid-cols-2 gap-2">
          <Button variant="secondary" onClick={onCancel} disabled={deleting}>
            Annuler
          </Button>
          <Button
            variant="destructive"
            className="bg-red-500 text-white hover:bg-red-500/90 dark:bg-red-500 dark:hover:bg-red-500/90"
            disabled={deleting}
            onClick={async () => {
              setDeleting(true);
              try {
                await onConfirm();
              } finally {
                setDeleting(false);
              }
            }}
          >
            {deleting ? <Loader2 size={18} className="animate-spin" /> : "Supprimer"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
