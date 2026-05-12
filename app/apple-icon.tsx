import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #6366f1 0%, #7c3aed 100%)",
          borderRadius: "40px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "90px",
            fontWeight: 900,
            fontFamily: "system-ui, -apple-system, sans-serif",
            color: "white",
            letterSpacing: "-3px",
            lineHeight: 1,
          }}
        >
          V
        </div>
      </div>
    ),
    { ...size },
  );
}
