import { MapPin } from "lucide-react";

const COUNTRIES = [
  "Afghanistan","Albania","Algeria","Andorra","Angola","Argentina","Armenia","Australia",
  "Austria","Azerbaijan","Bahrain","Bangladesh","Belarus","Belgium","Bolivia","Bosnia and Herzegovina",
  "Brazil","Bulgaria","Cambodia","Cameroon","Canada","Chile","China","Colombia","Costa Rica",
  "Croatia","Cuba","Cyprus","Czech Republic","Denmark","Ecuador","Egypt","Estonia","Ethiopia",
  "Finland","France","Georgia","Germany","Ghana","Greece","Guatemala","Honduras","Hungary",
  "India","Indonesia","Iran","Iraq","Ireland","Israel","Italy","Jamaica","Japan","Jordan",
  "Kazakhstan","Kenya","Kuwait","Latvia","Lebanon","Libya","Lithuania","Luxembourg","Malaysia",
  "Malta","Mexico","Moldova","Morocco","Myanmar","Nepal","Netherlands","New Zealand","Nigeria",
  "North Macedonia","Norway","Oman","Pakistan","Panama","Paraguay","Peru","Philippines","Poland",
  "Portugal","Qatar","Romania","Russia","Rwanda","Saudi Arabia","Serbia","Singapore","Slovakia",
  "Slovenia","South Africa","South Korea","Spain","Sri Lanka","Sudan","Sweden","Switzerland",
  "Syria","Taiwan","Tanzania","Thailand","Tunisia","Turkey","Uganda","Ukraine",
  "United Arab Emirates","United Kingdom","United States","Uruguay","Uzbekistan",
  "Venezuela","Vietnam","Yemen","Zimbabwe",
];

interface LocationPickerProps {
  city: string;
  country: string;
  onCityChange: (v: string) => void;
  onCountryChange: (v: string) => void;
  cityError?: string;
  countryError?: string;
}

export default function LocationPicker({
  city,
  country,
  onCityChange,
  onCountryChange,
  cityError,
  countryError,
}: LocationPickerProps) {
  return (
    <div className="space-y-3">
      {/* City */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1.5">
          City <span className="text-red-400">*</span>
        </label>
        <div className="relative">
          <MapPin size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            value={city}
            onChange={(e) => onCityChange(e.target.value)}
            placeholder="e.g. London"
            className={`w-full bg-white/5 border rounded-xl px-4 py-3 pl-9 text-white placeholder:text-gray-600 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 transition-all ${
              cityError ? "border-red-500" : "border-white/10"
            }`}
          />
        </div>
        {cityError && <p className="text-xs text-red-400 mt-1">{cityError}</p>}
      </div>

      {/* Country */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1.5">
          Country <span className="text-red-400">*</span>
        </label>
        <select
          value={country}
          onChange={(e) => onCountryChange(e.target.value)}
          className={`w-full bg-gray-900 border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 transition-all appearance-none cursor-pointer ${
            country ? "text-white" : "text-gray-600"
          } ${countryError ? "border-red-500" : "border-white/10"}`}
        >
          <option value="" disabled className="text-gray-600">Select your country</option>
          {COUNTRIES.map((c) => (
            <option key={c} value={c} className="text-white bg-gray-900">{c}</option>
          ))}
        </select>
        {countryError && <p className="text-xs text-red-400 mt-1">{countryError}</p>}
      </div>

      {/* Preview */}
      {(city || country) && (
        <p className="font-mono text-xs text-green-400/60 pl-1">
          📍 {[city, country].filter(Boolean).join(", ")}
        </p>
      )}
    </div>
  );
}
