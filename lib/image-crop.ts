/**
 * Crop an image from a source URL and return a 512×512 WebP Blob.
 *
 * @param imageSrc — data URL or http(s) URL of the source image
 * @param cropPixels — { x, y, width, height } in source pixels
 *                    (provided by react-easy-crop's `croppedAreaPixels`)
 * @param outputSize — final square size in pixels (default 512)
 * @param quality — webp quality 0..1 (default 0.85)
 */
export async function cropToWebpBlob(
  imageSrc: string,
  cropPixels: { x: number; y: number; width: number; height: number },
  outputSize = 512,
  quality = 0.85
): Promise<Blob> {
  const image = await loadImage(imageSrc);

  const canvas = document.createElement("canvas");
  canvas.width = outputSize;
  canvas.height = outputSize;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");

  ctx.drawImage(
    image,
    cropPixels.x,
    cropPixels.y,
    cropPixels.width,
    cropPixels.height,
    0,
    0,
    outputSize,
    outputSize
  );

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) return reject(new Error("Canvas toBlob failed"));
        resolve(blob);
      },
      "image/webp",
      quality
    );
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
  });
}

/** Read a File from input[type=file] into a data URL. */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5 MB

export const ACCEPTED_IMAGE_TYPES = "image/png,image/jpeg,image/webp,image/heic";
