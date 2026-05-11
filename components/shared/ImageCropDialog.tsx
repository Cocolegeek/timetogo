"use client";

import { useCallback, useState } from "react";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";
import { Loader2, ZoomIn, ZoomOut } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cropToWebpBlob } from "@/lib/image-crop";

interface ImageCropDialogProps {
  /** Source image as data URL (read from a File before opening this dialog) */
  imageSrc: string;
  /** Final output square size in px (default 512) */
  outputSize?: number;
  /** Title shown in the dialog header */
  title?: string;
  open: boolean;
  onCancel: () => void;
  /** Receives the cropped image as a WebP Blob */
  onConfirm: (blob: Blob) => Promise<void> | void;
}

/**
 * Interactive crop UI on top of react-easy-crop.
 * - Circular crop area (visual mask)
 * - Pinch / wheel zoom + drag to pan
 * - Outputs a square WebP Blob via the canvas-based cropToWebpBlob util
 */
export function ImageCropDialog({
  imageSrc,
  outputSize = 512,
  title = "Recadrer l'image",
  open,
  onCancel,
  onConfirm,
}: ImageCropDialogProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [cropPixels, setCropPixels] = useState<Area | null>(null);
  const [busy, setBusy] = useState(false);

  const onCropComplete = useCallback((_area: Area, areaPixels: Area) => {
    setCropPixels(areaPixels);
  }, []);

  const handleConfirm = async () => {
    if (!cropPixels) return;
    setBusy(true);
    try {
      const blob = await cropToWebpBlob(imageSrc, cropPixels, outputSize);
      await onConfirm(blob);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && !busy) onCancel(); }}>
      <DialogContent
        className="glass-strong border-foreground/10 w-[calc(100vw-2rem)] max-w-md p-0 max-h-[92vh] flex flex-col overflow-hidden"
        showCloseButton={false}
      >
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-foreground/8 shrink-0">
          <DialogTitle className="text-slate-100 text-lg">{title}</DialogTitle>
        </DialogHeader>

        <div className="relative flex-1 min-h-0">
          <div className="relative w-full aspect-square bg-slate-950">
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={1}
              cropShape="round"
              showGrid={false}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
              objectFit="contain"
            />
          </div>
        </div>

        {/* Zoom slider */}
        <div className="px-5 py-3 border-t border-foreground/8 flex items-center gap-3 shrink-0">
          <ZoomOut size={16} className="text-slate-500 shrink-0" />
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="flex-1 accent-[var(--accent-500)]"
            aria-label="Zoom"
          />
          <ZoomIn size={16} className="text-slate-500 shrink-0" />
        </div>

        <DialogFooter className="px-5 py-3 border-t border-foreground/8 gap-2 shrink-0">
          <Button
            variant="ghost"
            onClick={onCancel}
            disabled={busy}
            className="text-slate-300 hover:text-slate-100 hover:bg-foreground/8"
          >
            Annuler
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={busy || !cropPixels}
            className="gradient-primary text-white border-0"
          >
            {busy ? <Loader2 size={15} className="animate-spin" /> : "Confirmer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
