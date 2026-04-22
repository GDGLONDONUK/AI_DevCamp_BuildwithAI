"use client";

import { useEffect, useRef } from "react";
import type { UserMapPoint } from "@/types";
import "leaflet/dist/leaflet.css";

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function UsersLocationMap({ points }: { points: UserMapPoint[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    if (points.length === 0) {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      return;
    }

    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !containerRef.current) return;

      delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })
        ._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        iconRetinaUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        shadowUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }

      const el = containerRef.current;
      const map = L.map(el).setView([points[0]!.lat, points[0]!.lon], 3);
      mapRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      const latLngs = points.map(
        (p) => [p.lat, p.lon] as [number, number]
      );
      const bounds = L.latLngBounds(latLngs);

      for (const p of points) {
        const m = L.marker([p.lat, p.lon]).addTo(map);
        const st = p.userStatus
          ? `<div class="text-xs opacity-70 mt-1">${escapeHtml(
              p.userStatus
            )}</div>`
          : "";
        m.bindPopup(
          `<div class="text-sm"><strong>${escapeHtml(
            p.displayName
          )}</strong><div class="text-xs opacity-80">${escapeHtml(
            p.email
          )}</div><div class="mt-1">${escapeHtml(
            p.label
          )}</div>${st}</div>`
        );
      }

      if (points.length > 0) {
        map.fitBounds(bounds, { padding: [48, 48], maxZoom: 12 });
      }
    })();

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [points]);

  return (
    <div
      ref={containerRef}
      className="h-[min(70vh,560px)] w-full min-h-[360px] rounded-xl border border-white/10 relative z-0"
    />
  );
}
