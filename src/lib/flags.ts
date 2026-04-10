const COUNTRY_TO_CODE: Record<string, string> = {
  "Afghanistan": "AF", "Albania": "AL", "Algeria": "DZ", "Andorra": "AD",
  "Angola": "AO", "Argentina": "AR", "Armenia": "AM", "Australia": "AU",
  "Austria": "AT", "Azerbaijan": "AZ", "Bahrain": "BH", "Bangladesh": "BD",
  "Belarus": "BY", "Belgium": "BE", "Bolivia": "BO", "Bosnia and Herzegovina": "BA",
  "Brazil": "BR", "Bulgaria": "BG", "Cambodia": "KH", "Cameroon": "CM",
  "Canada": "CA", "Chile": "CL", "China": "CN", "Colombia": "CO",
  "Costa Rica": "CR", "Croatia": "HR", "Cuba": "CU", "Cyprus": "CY",
  "Czech Republic": "CZ", "Denmark": "DK", "Ecuador": "EC", "Egypt": "EG",
  "Estonia": "EE", "Ethiopia": "ET", "Finland": "FI", "France": "FR",
  "Georgia": "GE", "Germany": "DE", "Ghana": "GH", "Greece": "GR",
  "Guatemala": "GT", "Honduras": "HN", "Hungary": "HU", "India": "IN",
  "Indonesia": "ID", "Iran": "IR", "Iraq": "IQ", "Ireland": "IE",
  "Israel": "IL", "Italy": "IT", "Jamaica": "JM", "Japan": "JP",
  "Jordan": "JO", "Kazakhstan": "KZ", "Kenya": "KE", "Kuwait": "KW",
  "Latvia": "LV", "Lebanon": "LB", "Libya": "LY", "Lithuania": "LT",
  "Luxembourg": "LU", "Malaysia": "MY", "Malta": "MT", "Mexico": "MX",
  "Moldova": "MD", "Morocco": "MA", "Myanmar": "MM", "Nepal": "NP",
  "Netherlands": "NL", "New Zealand": "NZ", "Nigeria": "NG",
  "North Macedonia": "MK", "Norway": "NO", "Oman": "OM", "Pakistan": "PK",
  "Panama": "PA", "Paraguay": "PY", "Peru": "PE", "Philippines": "PH",
  "Poland": "PL", "Portugal": "PT", "Qatar": "QA", "Romania": "RO",
  "Russia": "RU", "Rwanda": "RW", "Saudi Arabia": "SA", "Serbia": "RS",
  "Singapore": "SG", "Slovakia": "SK", "Slovenia": "SI",
  "South Africa": "ZA", "South Korea": "KR", "Spain": "ES",
  "Sri Lanka": "LK", "Sudan": "SD", "Sweden": "SE", "Switzerland": "CH",
  "Syria": "SY", "Taiwan": "TW", "Tanzania": "TZ", "Thailand": "TH",
  "Tunisia": "TN", "Turkey": "TR", "Uganda": "UG", "Ukraine": "UA",
  "United Arab Emirates": "AE", "United Kingdom": "GB", "United States": "US",
  "Uruguay": "UY", "Uzbekistan": "UZ", "Venezuela": "VE", "Vietnam": "VN",
  "Yemen": "YE", "Zimbabwe": "ZW",
};

export function countryCode(country: string): string | null {
  return COUNTRY_TO_CODE[country]?.toLowerCase() ?? null;
}

export function countryFlagUrl(country: string): string | null {
  const code = countryCode(country);
  if (!code) return null;
  return `https://flagcdn.com/w40/${code}.png`;
}
