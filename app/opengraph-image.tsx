import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Voyou — Rejoins la bande";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://voyou.app";

export default async function OpengraphImage() {
  const iconUrl = `${SITE_URL}/icons/icon.png`;

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          alignItems: "center",
          padding: "0 90px",
          gap: "70px",
          background:
            "radial-gradient(ellipse 70% 60% at 25% 30%, rgba(99,102,241,0.30) 0%, transparent 60%), radial-gradient(ellipse 60% 50% at 85% 90%, rgba(139,92,246,0.25) 0%, transparent 60%), #0a0c14",
          color: "#ffffff",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        {/* ── Logo oYo ── */}
        <div
          style={{
            display: "flex",
            width: 280,
            height: 280,
            borderRadius: 60,
            overflow: "hidden",
            flexShrink: 0,
            boxShadow:
              "0 30px 80px -20px rgba(99,102,241,0.55), 0 0 0 1px rgba(255,255,255,0.06)",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={iconUrl}
            alt="Voyou"
            width={280}
            height={280}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </div>

        {/* ── Texte ── */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 18,
            flex: 1,
            minWidth: 0,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              fontSize: 24,
              fontWeight: 700,
              color: "#a5b4fc",
              textTransform: "uppercase",
              letterSpacing: "0.18em",
            }}
          >
            <span>✈️</span>
            <span>voyou.app</span>
          </div>

          <div
            style={{
              fontSize: 96,
              fontWeight: 900,
              lineHeight: 1,
              letterSpacing: "-0.04em",
              background:
                "linear-gradient(135deg, #ffffff 0%, #c5cdfa 50%, #b794ff 100%)",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            Rejoins la bande
          </div>

          <div
            style={{
              fontSize: 32,
              fontWeight: 500,
              color: "#d4d8e8",
              lineHeight: 1.3,
              letterSpacing: "-0.01em",
              marginTop: 6,
            }}
          >
            Budget, planning, menus — voyages entre potes sans embrouilles.
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
