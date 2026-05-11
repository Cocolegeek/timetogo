"use client";

import { useRef, useState } from "react";
import { Camera, Loader2, Trash2, X } from "lucide-react";
import { ImageCropDialog } from "./ImageCropDialog";
import { createClient } from "@/lib/supabase/client";
import {
  fileToDataUrl,
  MAX_UPLOAD_BYTES,
  ACCEPTED_IMAGE_TYPES,
} from "@/lib/image-crop";
import { cn } from "@/lib/utils";

interface AvatarUploadProps {
  /** Supabase Storage bucket id (e.g. "profile-avatars", "trip-icons") */
  bucket: string;
  /**
   * Path within the bucket (must start with the user's uid for RLS to allow).
   * Examples:
   *   "<uid>.webp" for profile avatars
   *   "<uid>/<tripId>.webp" for trip icons
   */
  path: string;
  /** Current image URL, if any */
  currentUrl?: string | null;
  /** Content rendered when no image is set (emoji, initials, icon…) */
  placeholder: React.ReactNode;
  /** Visual size of the avatar circle in pixels */
  size?: number;
  /** Border ring class added to the circle */
  ringClass?: string;
  /** Called after a successful upload with the new public URL */
  onUploaded: (url: string) => void | Promise<void>;
  /** Called after the image has been removed (URL cleared in DB) */
  onRemoved?: () => void | Promise<void>;
  /** Optional dialog title */
  dialogTitle?: string;
  className?: string;
}

export function AvatarUpload({
  bucket,
  path,
  currentUrl,
  placeholder,
  size = 80,
  ringClass = "ring-2 ring-foreground/15",
  onUploaded,
  onRemoved,
  dialogTitle,
  className,
}: AvatarUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pendingSrc, setPendingSrc] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePick = () => inputRef.current?.click();

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-picking the same file
    if (!file) return;
    if (file.size > MAX_UPLOAD_BYTES) {
      setError("Fichier trop volumineux (max 5 Mo).");
      return;
    }
    try {
      const dataUrl = await fileToDataUrl(file);
      setPendingSrc(dataUrl);
      setError(null);
    } catch {
      setError("Impossible de lire le fichier.");
    }
  };

  const handleConfirmCrop = async (blob: Blob) => {
    setUploading(true);
    setError(null);
    try {
      const supabase = createClient();
      const { error: upErr } = await supabase.storage
        .from(bucket)
        .upload(path, blob, {
          contentType: "image/webp",
          upsert: true,
          cacheControl: "3600",
        });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from(bucket).getPublicUrl(path);
      // Append a cache-busting query so the new image shows up immediately.
      const publicUrl = `${data.publicUrl}?v=${Date.now()}`;
      await onUploaded(publicUrl);
      setPendingSrc(null);
    } catch {
      setError("Échec de l'upload. Réessaie.");
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async () => {
    if (!onRemoved) return;
    setUploading(true);
    setError(null);
    try {
      const supabase = createClient();
      // Best-effort cleanup: ignore failures (the row's URL update is what matters)
      await supabase.storage.from(bucket).remove([path]).catch(() => null);
      await onRemoved();
    } finally {
      setUploading(false);
    }
  };

  const dimension = { width: size, height: size };

  return (
    <div className={cn("inline-flex flex-col items-center gap-2", className)}>
      <button
        type="button"
        onClick={handlePick}
        disabled={uploading}
        className={cn(
          "relative rounded-full overflow-hidden active:scale-95 transition-transform group focus:outline-none",
          ringClass
        )}
        style={dimension}
        aria-label={currentUrl ? "Changer l'image" : "Importer une image"}
      >
        {currentUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={currentUrl}
            alt=""
            className="w-full h-full object-cover"
            draggable={false}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-foreground/8">
            {placeholder}
          </div>
        )}

        {/* Hover/active hint */}
        <div
          className={cn(
            "absolute inset-0 flex items-center justify-center bg-black/45 opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity",
            uploading && "opacity-100"
          )}
        >
          {uploading ? (
            <Loader2 size={size > 56 ? 22 : 16} className="text-white animate-spin" />
          ) : (
            <Camera size={size > 56 ? 22 : 16} className="text-white" />
          )}
        </div>
      </button>

      {currentUrl && onRemoved && !uploading && (
        <button
          type="button"
          onClick={handleRemove}
          className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-red-400 transition-colors"
        >
          <Trash2 size={12} />
          Retirer
        </button>
      )}

      {error && (
        <p className="text-xs text-red-400 flex items-center gap-1">
          <X size={12} /> {error}
        </p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_IMAGE_TYPES}
        onChange={handleFile}
        className="sr-only"
      />

      {pendingSrc && (
        <ImageCropDialog
          imageSrc={pendingSrc}
          open
          title={dialogTitle}
          onCancel={() => setPendingSrc(null)}
          onConfirm={handleConfirmCrop}
        />
      )}
    </div>
  );
}
