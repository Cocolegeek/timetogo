import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Voyou — Ton complice de voyage";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "flex-start",
          padding: "80px",
          background:
            "radial-gradient(ellipse 80% 60% at 20% 0%, #4f6bff33 0%, transparent 60%), radial-gradient(ellipse 70% 50% at 100% 100%, #8b5cf633 0%, transparent 60%), #0a0c14",
          color: "#ffffff",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "20px",
            marginBottom: "32px",
          }}
        >
          <div
            style={{
              fontSize: "44px",
              filter: "drop-shadow(0 4px 16px rgba(79,107,255,0.4))",
            }}
          >
            ✈️
          </div>
          <div
            style={{
              fontSize: "28px",
              fontWeight: 500,
              color: "#a0a8c0",
              letterSpacing: "0.02em",
            }}
          >
            voyou.app
          </div>
        </div>

        <div
          style={{
            fontSize: "180px",
            fontWeight: 900,
            lineHeight: 0.95,
            letterSpacing: "-0.04em",
            background:
              "linear-gradient(135deg, #ffffff 0%, #c5cdfa 50%, #b794ff 100%)",
            backgroundClip: "text",
            color: "transparent",
            marginBottom: "32px",
          }}
        >
          Voyou
        </div>

        <div
          style={{
            fontSize: "40px",
            fontWeight: 500,
            color: "#d4d8e8",
            lineHeight: 1.2,
            maxWidth: "900px",
            letterSpacing: "-0.01em",
          }}
        >
          Ton complice de voyage — Budget, planning et menus sans embrouilles.
        </div>

        <div
          style={{
            display: "flex",
            gap: "16px",
            marginTop: "48px",
          }}
        >
          {["Budget partagé", "Planning", "Menus"].map((tag) => (
            <div
              key={tag}
              style={{
                display: "flex",
                padding: "12px 24px",
                borderRadius: "999px",
                border: "1px solid rgba(255,255,255,0.15)",
                background: "rgba(255,255,255,0.05)",
                color: "#e0e4f0",
                fontSize: "22px",
                fontWeight: 500,
              }}
            >
              {tag}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size },
  );
}
