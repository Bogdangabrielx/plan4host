export type CountryOption = { code: string; name: string; tz: string };

export const COUNTRIES: CountryOption[] = [
  { code: "RO", name: "Romania",            tz: "Europe/Bucharest" },
  { code: "GB", name: "United Kingdom",     tz: "Europe/London" },
  { code: "IE", name: "Ireland",            tz: "Europe/Dublin" },
  { code: "FR", name: "France",             tz: "Europe/Paris" },
  { code: "DE", name: "Germany",            tz: "Europe/Berlin" },
  { code: "ES", name: "Spain",              tz: "Europe/Madrid" },
  { code: "PT", name: "Portugal",           tz: "Europe/Lisbon" },
  { code: "IT", name: "Italy",              tz: "Europe/Rome" },
  { code: "NL", name: "Netherlands",        tz: "Europe/Amsterdam" },
  { code: "BE", name: "Belgium",            tz: "Europe/Brussels" },
  { code: "PL", name: "Poland",             tz: "Europe/Warsaw" },
  { code: "GR", name: "Greece",             tz: "Europe/Athens" },
  { code: "BG", name: "Bulgaria",           tz: "Europe/Sofia" },
  { code: "HU", name: "Hungary",            tz: "Europe/Budapest" },
  { code: "CZ", name: "Czechia",            tz: "Europe/Prague" },
  { code: "SK", name: "Slovakia",           tz: "Europe/Bratislava" },
  { code: "AT", name: "Austria",            tz: "Europe/Vienna" },
  { code: "SE", name: "Sweden",             tz: "Europe/Stockholm" },
  { code: "NO", name: "Norway",             tz: "Europe/Oslo" },
  { code: "FI", name: "Finland",            tz: "Europe/Helsinki" },
  { code: "DK", name: "Denmark",            tz: "Europe/Copenhagen" },
  { code: "CH", name: "Switzerland",        tz: "Europe/Zurich" },
  { code: "TR", name: "Türkiye",            tz: "Europe/Istanbul" },
  { code: "US", name: "United States",      tz: "America/New_York" }, // default la capital/timezone popular
  { code: "CA", name: "Canada",             tz: "America/Toronto" },
  { code: "AU", name: "Australia",          tz: "Australia/Sydney" },
  { code: "NZ", name: "New Zealand",        tz: "Pacific/Auckland" },
  // adaugi ușor aici alte țări după nevoie
];

export function findCountry(code?: string) {
  return COUNTRIES.find(c => c.code === code);
}
