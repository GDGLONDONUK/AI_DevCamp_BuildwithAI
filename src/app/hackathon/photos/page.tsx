import type { Metadata } from "next";
import { loadHackathonPublicContent } from "@/lib/server/hackathonPublicContent";
import { loadGooglePhotosPreview } from "@/lib/server/googlePhotosPreview";
import EventPhotosSection from "@/components/hackathon/EventPhotosSection";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Event photos — AI DevCamp 2026 Agentic Hackathon",
  description:
    "Shared Google Photos album from the AI DevCamp 2026 Halloween Hack at Encode Hub. Add your photos and videos; organisers moderate the album.",
};

export default async function HackathonPhotosPage() {
  const content = await loadHackathonPublicContent();
  const photos = await loadGooglePhotosPreview(
    content.photosAlbumUrl,
    content.photosAlbumTitle
  );

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16 space-y-10">
      <header className="text-center space-y-3">
        <p className="font-mono text-sm tracking-[0.22em] text-amber-300">
          🎃 31 OCT 2026 · ENCODE HUB
        </p>
        <h1 className="hh-title" style={{ fontSize: "clamp(2.6rem, 8vw, 4.6rem)" }}>
          Photos
        </h1>
        <p className="text-[var(--hh-muted)] max-w-2xl mx-auto">
          One album for the day. Sign in with a Google account to add photos or short videos.
          Organisers remove anything that shouldn’t stay.
        </p>
      </header>
      <EventPhotosSection photos={photos} />
    </div>
  );
}
