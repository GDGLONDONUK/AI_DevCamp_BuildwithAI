import { ImageResponse } from "next/og";
import { loadCertificateShare } from "@/lib/server/publicCertified";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Certified — AI DevCamp September 2026";
export const revalidate = 300;

export default async function Image({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = await params;
  const cert = await loadCertificateShare(publicId);
  const name = cert?.name || "AI DevCamp graduate";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "linear-gradient(160deg, #052e16 0%, #0f172a 100%)",
          color: "white",
          padding: "64px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", fontSize: 28, color: "#86efac", fontWeight: 700 }}>
          CERTIFIED — AI DEVCAMP SEPTEMBER 2026
        </div>
        <div style={{ display: "flex", fontSize: 64, fontWeight: 800, lineHeight: 1.1 }}>
          {name.slice(0, 60)}
        </div>
        <div style={{ display: "flex", fontSize: 28, color: "#bbf7d0" }}>
          GDG London · Google ADK · Attendance ≥ 60%
        </div>
      </div>
    ),
    { ...size }
  );
}
