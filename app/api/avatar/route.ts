import { createAvatar } from "@dicebear/core";
import { lorelei, notionists, openPeeps, pixelArt, thumbs } from "@dicebear/collection";
import { SEED_PATTERN, isAvatarStyle, type AvatarStyleId } from "@/lib/avatar-styles";

const STYLES = { lorelei, notionists, openPeeps, pixelArt, thumbs } satisfies Record<AvatarStyleId, unknown>;

const BACKGROUNDS = ["cfdde8", "e9e1d3", "c5d3bf", "d99c82", "d9d3ec", "f4c7a8", "f0be4c"];

/** GET ?style=lorelei&seed=abc → image SVG (la même graine donne toujours le même avatar, mis en cache longtemps). */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const style = searchParams.get("style");
  const seed = searchParams.get("seed") ?? "";
  if (!isAvatarStyle(style) || !SEED_PATTERN.test(seed)) {
    return new Response("Invalid avatar", { status: 400 });
  }
  const svg = createAvatar(STYLES[style] as typeof lorelei, { seed, backgroundColor: BACKGROUNDS }).toString();
  return new Response(svg, {
    headers: {
      "content-type": "image/svg+xml",
      "cache-control": "public, max-age=31536000, immutable",
      "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
    },
  });
}
