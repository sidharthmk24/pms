import {
  type CountryCode,
  getCountries,
  getCountryCallingCode,
  AsYouType,
  isValidPhoneNumber,
  parsePhoneNumber,
  type PhoneNumber,
} from "libphonenumber-js";

export interface CountryInfo {
  code: CountryCode;
  name: string;
  dialCode: string;
  flag: string;
}

// Convert ISO 3166-1 alpha-2 code to Flag Emoji
export function getFlagEmoji(countryCode: string): string {
  const codePoints = countryCode
    .toUpperCase()
    .split("")
    .map((char) => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

// Country display names in English
const countryNames = new Intl.DisplayNames(["en"], { type: "region" });

// Priority countries for quick access (India and Gulf / common NRI countries)
export const PRIORITY_COUNTRIES: CountryCode[] = [
  "IN", // India (+91)
  "AE", // UAE (+971)
  "SA", // Saudi Arabia (+966)
  "QA", // Qatar (+974)
  "OM", // Oman (+968)
  "KW", // Kuwait (+965)
  "BH", // Bahrain (+973)
  "US", // USA (+1)
  "GB", // UK (+44)
  "CA", // Canada (+1)
  "AU", // Australia (+61)
  "SG", // Singapore (+65)
  "MY", // Malaysia (+60)
  "DE", // Germany (+49)
];

// Build complete list of all international countries supported by libphonenumber-js
export const ALL_COUNTRIES: CountryInfo[] = getCountries()
  .map((code: CountryCode) => {
    let name: string = code;
    try {
      name = countryNames.of(code) || code;
    } catch {
      name = code;
    }
    return {
      code,
      name,
      dialCode: `+${getCountryCallingCode(code)}`,
      flag: getFlagEmoji(code),
    };
  })
  .sort((a, b) => {
    const aPriority = PRIORITY_COUNTRIES.indexOf(a.code);
    const bPriority = PRIORITY_COUNTRIES.indexOf(b.code);
    if (aPriority !== -1 && bPriority !== -1) return aPriority - bPriority;
    if (aPriority !== -1) return -1;
    if (bPriority !== -1) return 1;
    return a.name.localeCompare(b.name);
  });

/**
 * Format a phone string in real-time as user types
 */
export function formatPhoneNumberAsYouType(value: string, defaultCountry: CountryCode = "IN"): string {
  if (!value) return "";
  const formatter = new AsYouType(defaultCountry);
  return formatter.input(value);
}

/**
 * Validate phone number using libphonenumber-js
 */
export function validatePhoneNumber(value: string, defaultCountry: CountryCode = "IN"): boolean {
  if (!value || !value.trim()) return false;
  try {
    return isValidPhoneNumber(value.trim(), defaultCountry);
  } catch {
    return false;
  }
}

/**
 * Parse phone number and return E.164 string (e.g. "+919876543210") or original trimmed
 */
export function parseAndFormatE164(value: string, defaultCountry: CountryCode = "IN"): string {
  if (!value || !value.trim()) return "";
  try {
    const parsed: PhoneNumber | undefined = parsePhoneNumber(value.trim(), defaultCountry);
    if (parsed && parsed.isValid()) {
      return parsed.number; // E.164 formatted string
    }
  } catch {
    // fallback
  }
  return value.trim();
}
