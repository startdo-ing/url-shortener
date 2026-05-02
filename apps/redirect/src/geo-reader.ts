import maxmind, { type CityResponse, type Reader } from "maxmind";

let _cityReader: Reader<CityResponse> | null | undefined;

/** Lazy-open GeoLite2-City `.mmdb` from `GEOIP_CITY_DB`; `null` if unset or unreadable. */
export async function getCityReader(): Promise<Reader<CityResponse> | null> {
  if (_cityReader !== undefined) return _cityReader;
  const path = process.env.GEOIP_CITY_DB?.trim();
  if (!path) {
    _cityReader = null;
    return null;
  }
  try {
    _cityReader = await maxmind.open<CityResponse>(path);
  } catch {
    _cityReader = null;
  }
  return _cityReader;
}

/** Test hook — do not use in production paths. */
export function resetCityReaderForTests(): void {
  _cityReader = undefined;
}
