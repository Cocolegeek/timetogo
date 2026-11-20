import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Voyou — Rejoins la bande";
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
          alignItems: "center",
          gap: 64,
          padding: "0 96px",
          background: "#F6F6F9",
          color: "#15171C",
          fontFamily: "sans-serif",
        }}
      >
        <svg width="260" height="260" viewBox="0 0 512 512">
          <rect width="512" height="512" rx="150" fill="#FFC83D" />
          <g fill="none" stroke="#15171C" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="174" cy="214" r="54" strokeWidth="36" />
            <circle cx="338" cy="214" r="54" strokeWidth="36" />
            <circle cx="190" cy="212" r="17" fill="#15171C" stroke="none" />
            <circle cx="354" cy="212" r="17" fill="#15171C" stroke="none" />
            <path d="M228 270 L256 314 L284 270 M256 314 C254 366 308 394 364 366" strokeWidth="34" />
          </g>
        </svg>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ fontSize: 112, fontWeight: 800, letterSpacing: -4, lineHeight: 1 }}>Voyou</div>
          <div style={{ fontSize: 44, fontWeight: 600, lineHeight: 1.15, maxWidth: 640 }}>
            Les voyages entre potes, sans embrouilles.
          </div>
          <div style={{ fontSize: 30, color: "#5F6270" }}>Budget partagé · Planning · Menus</div>
        </div>
      </div>
    ),
    { ...size }
  );
}
