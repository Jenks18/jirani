import { ImageResponse } from "next/og";

export const alt = "Jirani — community safety, by neighbors";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#0a3d26",
          color: "#faf8f3",
          padding: 80,
          fontFamily: "serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20, fontSize: 36 }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: "#faf8f3", display: "flex" }} />
          <span>Jirani · Majirani Wetu</span>
        </div>
        <div style={{ fontSize: 84, lineHeight: 1.05, display: "flex" }}>Safer streets start with neighbors who speak up.</div>
        <div style={{ fontSize: 28, color: "#e8b13a", display: "flex" }}>A program of The 6.25 Movement</div>
      </div>
    ),
    size
  );
}
