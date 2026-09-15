import { Country, State, City, type ICountry, type IState, type ICity } from "country-state-city";

export interface PlaceResult {
  city: string;
  state: string;
  country: string;
  formatted: string;
}

// Popular Kerala districts & major editorial hubs
export const POPULAR_KERALA_DISTRICTS = [
  "Kozhikode, Kerala",
  "Ernakulam / Kochi, Kerala",
  "Thiruvananthapuram, Kerala",
  "Thrissur, Kerala",
  "Kannur, Kerala",
  "Malappuram, Kerala",
  "Palakkad, Kerala",
  "Kollam, Kerala",
  "Kottayam, Kerala",
  "Alappuzha, Kerala",
  "Wayanad, Kerala",
  "Kasaragod, Kerala",
  "Pathanamthitta, Kerala",
  "Idukki, Kerala",
];

// Popular diaspora hubs
export const POPULAR_DIASPORA_HUBS = [
  "Dubai, UAE",
  "Abu Dhabi, UAE",
  "Sharjah, UAE",
  "Doha, Qatar",
  "Riyadh, Saudi Arabia",
  "Muscat, Oman",
  "Kuwait City, Kuwait",
  "Manama, Bahrain",
  "Bengaluru, Karnataka",
  "Chennai, Tamil Nadu",
  "Mumbai, Maharashtra",
  "New Delhi, Delhi",
  "London, UK",
];

export function getCountriesList(): ICountry[] {
  return Country.getAllCountries();
}

export function getStatesList(countryCode: string = "IN"): IState[] {
  return State.getStatesOfCountry(countryCode);
}

export function getCitiesList(countryCode: string = "IN", stateCode: string = "KL"): ICity[] {
  return City.getCitiesOfState(countryCode, stateCode);
}

/**
 * Fast search for cities and states by keyword
 */
export function searchPlaces(query: string, maxResults: number = 20): PlaceResult[] {
  const q = query.trim().toLowerCase();
  if (!q || q.length < 2) return [];

  const results: PlaceResult[] = [];
  const seen = new Set<string>();

  // 1. Search in Kerala first (primary audience)
  const keralaCities = City.getCitiesOfState("IN", "KL") || [];
  for (const c of keralaCities) {
    if (c.name.toLowerCase().includes(q)) {
      const formatted = `${c.name}, Kerala`;
      if (!seen.has(formatted)) {
        seen.add(formatted);
        results.push({
          city: c.name,
          state: "Kerala",
          country: "India",
          formatted,
        });
        if (results.length >= maxResults) return results;
      }
    }
  }

  // 2. Search in all Indian States & Cities
  const indiaStates = State.getStatesOfCountry("IN") || [];
  for (const s of indiaStates) {
    // If state matches query
    if (s.name.toLowerCase().includes(q)) {
      const formatted = `${s.name}, India`;
      if (!seen.has(formatted)) {
        seen.add(formatted);
        results.push({
          city: "",
          state: s.name,
          country: "India",
          formatted,
        });
        if (results.length >= maxResults) return results;
      }
    }

    const stateCities = City.getCitiesOfState("IN", s.isoCode) || [];
    for (const c of stateCities) {
      if (c.name.toLowerCase().includes(q)) {
        const formatted = `${c.name}, ${s.name}`;
        if (!seen.has(formatted)) {
          seen.add(formatted);
          results.push({
            city: c.name,
            state: s.name,
            country: "India",
            formatted,
          });
          if (results.length >= maxResults) return results;
        }
      }
    }
  }

  // 3. Search in Gulf & Key International Countries (AE, QA, SA, OM, KW, BH, US, GB, SG, MY, AU, CA)
  const intlCountries = ["AE", "QA", "SA", "OM", "KW", "BH", "GB", "US", "SG", "MY", "AU", "CA"];
  for (const countryCode of intlCountries) {
    const country = Country.getCountryByCode(countryCode);
    if (!country) continue;
    const states = State.getStatesOfCountry(countryCode) || [];
    for (const s of states) {
      const cities = City.getCitiesOfState(countryCode, s.isoCode) || [];
      for (const c of cities) {
        if (c.name.toLowerCase().includes(q)) {
          const formatted = `${c.name}, ${country.name}`;
          if (!seen.has(formatted)) {
            seen.add(formatted);
            results.push({
              city: c.name,
              state: s.name,
              country: country.name,
              formatted,
            });
            if (results.length >= maxResults) return results;
          }
        }
      }
    }
  }

  return results;
}
