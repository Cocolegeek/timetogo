import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Voyou — Ton complice de voyage";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0a0c14 0%, #12102a 50%, #0a0c14 100%)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Background orbs */}
        <div
          style={{
            position: "absolute",
            top: -120,
            left: -100,
            width: 600,
            height: 600,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(99,102,241,0.25) 0%, transparent 70%)",
            filter: "blur(60px)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -80,
            right: -80,
            width: 500,
            height: 500,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(139,92,246,0.20) 0%, transparent 70%)",
            filter: "blur(60px)",
          }}
        />

        {/* Card */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 28,
            padding: "64px 80px",
            borderRadius: 40,
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            backdropFilter: "blur(20px)",
            maxWidth: 900,
            width: "100%",
          }}
        >
          {/* Wordmark */}
          <div
            style={{
              fontSize: 108,
              fontWeight: 900,
              fontFamily: "system-ui, -apple-system, sans-serif",
              background: "linear-gradient(135deg, #818cf8 0%, #a78bfa 50%, #c084fc 100%)",
              backgroundClip: "text",
              color: "transparent",
              letterSpacing: "-4px",
              lineHeight: 1,
            }}
          >
            voYou
          </div>

          {/* Tagline */}
          <div
            style={{
              fontSize: 32,
              fontWeight: 500,
              color: "rgba(255,255,255,0.65)",
              fontFamily: "system-ui, -apple-system, sans-serif",
              letterSpacing: "-0.5px",
              textAlign: "center",
            }}
          >
            Ton complice de voyage ✈️
          </div>

          {/* Feature pills */}
          <div style={{ display: "flex", gap: 16, marginTop: 8 }}>
            {["Planning", "Budget partagé", "Menus"].map((label) => (
              <div
                key={label}
                style={{
                  display: "flex",
                  padding: "10px 24px",
                  borderRadius: 999,
                  background: "rgba(99,102,241,0.15)",
                  border: "1px solid rgba(99,102,241,0.30)",
                  color: "#a5b4fc",
                  fontSize: 22,
                  fontWeight: 600,
                  fontFamily: "system-ui, -apple-system, sans-serif",
                }}
              >
                {label}
              </div>
            ))}
          </div>
        </div>

        {/* Domain badge */}
        <div
          style={{
            position: "absolute",
            bottom: 40,
            right: 60,
            color: "rgba(255,255,255,0.30)",
            fontSize: 22,
            fontFamily: "system-ui, -apple-system, sans-serif",
            fontWeight: 500,
          }}
        >
          voyou.app
        </div>
      </div>
    ),
    { ...size }
  );
}
