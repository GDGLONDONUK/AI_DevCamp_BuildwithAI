import Image from "next/image";
import { Camera, ExternalLink } from "lucide-react";
import type { GooglePhotosPreview } from "@/lib/googlePhotosAlbum";

export default function EventPhotosSection({
  photos,
  compact,
}: {
  photos: GooglePhotosPreview;
  compact?: boolean;
}) {
  const shown = photos.thumbs.slice(0, compact ? 6 : 12);

  return (
    <section aria-labelledby="event-photos-heading" className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <p className="font-mono text-xs tracking-[0.2em] text-amber-300 mb-1">RECAP</p>
          <h2 id="event-photos-heading" className="text-2xl sm:text-3xl font-bold text-white">
            Photos from the day
          </h2>
          <p className="mt-1 text-sm text-[var(--hh-muted)] max-w-xl">
            Shared album for Encode Hub — add your shots and clips. Organisers moderate
            anything that shouldn’t stay.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href={photos.albumUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full bg-[linear-gradient(135deg,var(--hh-pumpkin-2),var(--hh-pumpkin))] text-[#1a0b00] font-bold px-4 py-2 text-sm"
          >
            <Camera size={16} aria-hidden />
            Add photos
            <ExternalLink size={14} aria-hidden />
          </a>
          <a
            href={photos.albumUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hh-badge inline-flex items-center gap-2"
          >
            Open album
          </a>
        </div>
      </div>

      {shown.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
          {shown.map((src, i) => (
            <a
              key={`${src}-${i}`}
              href={photos.albumUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`hh-winner-card relative overflow-hidden rounded-xl border border-[var(--hh-line)] bg-[var(--hh-card)] ${
                i === 0 ? "col-span-2 row-span-2 min-h-[220px] sm:min-h-[280px]" : "min-h-[120px] sm:min-h-[140px]"
              }`}
            >
              <Image
                src={src}
                alt=""
                fill
                className="object-cover"
                sizes={i === 0 ? "(max-width: 640px) 100vw, 50vw" : "25vw"}
              />
            </a>
          ))}
        </div>
      ) : (
        <a
          href={photos.albumUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block rounded-2xl border border-[var(--hh-line)] bg-[var(--hh-card)] p-8 text-center hover:border-amber-400/40"
        >
          <Camera size={28} className="mx-auto mb-3 text-amber-300" aria-hidden />
          <p className="text-white font-semibold">{photos.title}</p>
          <p className="mt-1 text-sm text-[var(--hh-muted)]">
            Open the shared album to browse or add photos and videos.
          </p>
        </a>
      )}
    </section>
  );
}
