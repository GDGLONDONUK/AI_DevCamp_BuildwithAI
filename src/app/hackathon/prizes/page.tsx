"use client";

import Image from "next/image";
import { DEFAULT_HACKATHON_PRIZES } from "@/lib/hackathonContent";

export default function HackathonPrizesPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-8">
      <div className="text-center">
        <h1 className="hh-title mb-3" style={{ fontSize: "clamp(2.2rem, 7vw, 3.5rem)" }}>
          Prizes
        </h1>
        <p className="text-gray-400">
          Build something amazing — these prizes await the best projects. Claim them in person on
          event day.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {DEFAULT_HACKATHON_PRIZES.map((p) => (
          <div
            key={p.id}
            className={`rounded-2xl border bg-white/[0.03] p-4 flex flex-col items-center text-center ${
              p.featured ? "border-yellow-500/40" : "border-white/10"
            }`}
          >
            <div className="relative w-full h-40 mb-3">
              <Image
                src={p.imageSrc}
                alt={p.name}
                fill
                className="object-contain"
                sizes="(max-width: 640px) 100vw, 50vw"
              />
            </div>
            <p className="text-white font-semibold">{p.name}</p>
            {p.featured && (
              <span className="mt-1 text-xs font-mono text-yellow-300">Featured</span>
            )}
          </div>
        ))}
      </div>

      <div className="rounded-2xl border-2 border-amber-400/40 bg-amber-500/10 p-6 text-center">
        <p className="text-amber-100 font-bold text-lg">
          Prizes are handed out live on event day — be there in person to claim yours.
        </p>
        <p className="text-amber-200/90 text-sm mt-2">
          Show up, win big. No mail, no exceptions.
        </p>
      </div>
    </div>
  );
}
