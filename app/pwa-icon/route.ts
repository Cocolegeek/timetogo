import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const size = Number(searchParams.get("size") ?? "512");
  const clampedSize = size === 192 ? 192 : 512;
  const radius = Math.round(clampedSize * 0.22);
  const fontSize = Math.round(clampedSize * 0.5);

  return new ImageResponse(
    (
      <div
        style={{
          width: clampedSize,
          height: clampedSize,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #6366f1 0%, #7c3aed 100%)",
          borderRadius: `${radius}px`,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: `${fontSize}px`,
            fontWeight: 900,
            fontFamily: "system-ui, -apple-system, sans-serif",
            color: "white",
            letterSpacing: "-12px",
            lineHeight: 1,
          }}
        >
          V
        </div>
      </div>
    ),
    { width: clampedSize, height: clampedSize },
  );
}
