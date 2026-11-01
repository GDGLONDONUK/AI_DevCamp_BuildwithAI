import { ImageResponse } from "next/og";
import { loadPublicWinnerByPermalink, isRankedWinner } from "@/lib/server/publicWinners";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "AI DevCamp 2026 Agentic Hackathon project";
export const revalidate = 300;

export default async function Image({
  params,
}: {
  params: Promise<{ hackathonId: string; projectId: string }>;
}) {
  const { projectId } = await params;
  let card: Awaited<ReturnType<typeof loadPublicWinnerByPermalink>> = null;
  try {
    card = await loadPublicWinnerByPermalink(projectId);
  } catch {
    card = null;
  }
  const title = card?.title || "Hackathon project";
  const builders = card && "builders" in card ? card.builders : "";
  const badge = card && isRankedWinner(card) ? card.placementLabel : "Project";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "linear-gradient(135deg, #052e16 0%, #111827 55%, #1f2937 100%)",
          color: "white",
          padding: "64px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div
            style={{
              display: "flex",
              fontSize: 28,
              color: "#fcd34d",
              fontWeight: 700,
              letterSpacing: 1,
            }}
          >
            {badge}
          </div>
          <div style={{ display: "flex", fontSize: 64, fontWeight: 800, lineHeight: 1.1, maxWidth: 1040 }}>
            {title.slice(0, 80)}
          </div>
          <div style={{ display: "flex", fontSize: 32, color: "#d1d5db" }}>{builders.slice(0, 80)}</div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 24, color: "#86efac" }}>
          <span>AI DevCamp × GDG London</span>
          <span>Agentic Hackathon 2026</span>
        </div>
      </div>
    ),
    { ...size }
  );
}
