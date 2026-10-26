"use client";

import Image from "next/image";
import { DEFAULT_HACKATHON_PRIZES } from "@/lib/hackathonContent";

function PrizeImage({ src, alt }: { src: string; alt: string }) {
  const isSvg = src.endsWith(".svg");
  if (isSvg) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt={alt} className="h-40 w-full object-contain" />
    );
  }
  return (
    <div className="relative w-full h-40">
      <Image
        src={src}
        alt={alt}
        fill
        className="object-contain"
        sizes="(max-width: 640px) 100vw, 50vw"
      />
    </div>
  );
}

export default function HackathonPrizesPage() {
  const inPerson = DEFAULT_HACKATHON_PRIZES.filter(
    (p) => (p.audience || "in-person") === "in-person" || p.audience === "all"
  );
  const online = DEFAULT_HACKATHON_PRIZES.filter((p) => p.audience === "online");

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-10">
      <div className="text-center">
        <h1 className="hh-title mb-3" style={{ fontSize: "clamp(2.2rem, 7vw, 3.5rem)" }}>
          Prizes
        </h1>
        <p className="text-gray-400 max-w-xl mx-auto">
          Build something amazing. Physical prizes are claimed in person on event day; online
          attendees compete for a single Amazon voucher.
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-[#ffb347]">In person</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {inPerson.map((p) => (
            <div
              key={p.id}
              className={`rounded-2xl border bg-white/[0.03] p-4 flex flex-col items-center text-center ${
                p.featured ? "border-yellow-500/40" : "border-white/10"
              }`}
            >
              <div className="w-full mb-3">
                <PrizeImage src={p.imageSrc} alt={p.name} />
              </div>
              <p className="text-white font-semibold">{p.name}</p>
              {p.featured && (
                <span className="mt-1 text-xs font-mono text-yellow-300">Featured</span>
              )}
            </div>
          ))}
        </div>
        <div className="rounded-2xl border-2 border-amber-400/40 bg-amber-500/10 p-5 text-center">
          <p className="text-amber-100 font-bold">
            Physical prizes are handed out live — be there in person to claim yours.
          </p>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-[#ffb347]">Online</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {online.map((p) => (
            <div
              key={p.id}
              className="rounded-2xl border border-yellow-500/40 bg-white/[0.03] p-4 flex flex-col items-center text-center sm:col-span-2 sm:max-w-md sm:mx-auto w-full"
            >
              <div className="w-full mb-3">
                <PrizeImage src={p.imageSrc} alt={p.name} />
              </div>
              <p className="text-white font-semibold">{p.name}</p>
              {p.note && (
                <p className="mt-2 text-sm text-gray-400 max-w-sm">{p.note}</p>
              )}
              <span className="mt-2 text-xs font-mono text-yellow-300">1 voucher · online only</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
