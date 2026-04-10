"use client";

import { countryFlagUrl } from "@/lib/flags";

interface CountryFlagProps {
  country: string;
  size?: number;
  className?: string;
}

export default function CountryFlag({ country, size = 24, className = "" }: CountryFlagProps) {
  const url = countryFlagUrl(country);
  if (!url) return <span className={`text-gray-500 text-xs font-mono ${className}`}>—</span>;

  return (
    <img
      src={url}
      alt={country}
      title={country}
      width={size}
      height={Math.round(size * 0.75)}
      className={`inline-block rounded-sm object-cover shadow-sm ${className}`}
      style={{ width: size, height: Math.round(size * 0.75) }}
    />
  );
}
