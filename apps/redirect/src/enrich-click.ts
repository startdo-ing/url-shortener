import maxmind, { type CityResponse, type Reader } from "maxmind";
import { isbot } from "isbot";
import { UAParser } from "ua-parser-js";

const RAW_HEADER_ALLOW = [
  "cf-ipcountry",
  "cf-ray",
  "cf-connecting-ip",
  "x-forwarded-for",
  "x-forwarded-proto",
  "accept",
  "accept-encoding",
] as const;

const RAW_HEADERS_MAX_BYTES = 8 * 1024;

function rawHeadersEnabled(): boolean {
  const v = (process.env.RAW_HEADERS_ENABLED ?? "").trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

/** Whitelisted request headers → plain object; capped JSON UTF-8 size (F-005 / Q-003). */
export function rawHeadersFromRequest(headers: Headers): Record<string, string> | null {
  if (!rawHeadersEnabled()) return null;
  const out: Record<string, string> = {};
  for (const name of RAW_HEADER_ALLOW) {
    const val = headers.get(name);
    if (val != null && val.trim() !== "") {
      out[name.toLowerCase()] = val.length > 4000 ? `${val.slice(0, 4000)}…` : val;
    }
  }
  if (Object.keys(out).length === 0) return null;
  const rec: Record<string, string> = { ...out };
  const enc = new TextEncoder();
  for (;;) {
    const encoded = JSON.stringify(rec);
    if (enc.encode(encoded).length <= RAW_HEADERS_MAX_BYTES) return rec;
    const keys = Object.keys(rec);
    if (keys.length === 0) return null;
    const k = keys[keys.length - 1]!;
    if (rec[k]!.length > 64) rec[k] = rec[k]!.slice(0, rec[k]!.length - 64);
    else delete rec[k];
  }
}

/** R-008 — `isbot` for bot flag; `ua-parser-js` for browser / OS / device_type. */
export function uaEnrichmentFields(userAgent: string | null): {
  browser: string | null;
  os: string | null;
  device_type: string | null;
  is_bot: boolean;
} {
  const ua = userAgent ?? "";
  const bot = isbot(ua);
  const p = new UAParser(ua).getResult();
  const browser = p.browser?.name?.trim() ? p.browser.name.trim() : null;
  const os = p.os?.name?.trim() ? p.os.name.trim() : null;
  let device_type: string | null = p.device?.type?.trim() ? p.device.type.trim() : null;
  if (!device_type && !bot) device_type = "desktop";
  return { browser, os, device_type, is_bot: bot };
}

export function extractGeoFromCityRecord(city: CityResponse | null): {
  country_code: string | null;
  region: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
} | null {
  if (!city?.country?.iso_code) return null;
  const cc = city.country.iso_code.toUpperCase().slice(0, 2);
  if (cc.length !== 2) return null;
  const region = city.subdivisions?.[0]?.iso_code ?? city.subdivisions?.[0]?.names?.en ?? null;
  const cityName = city.city?.names?.en ?? null;
  const latitude = city.location?.latitude ?? null;
  const longitude = city.location?.longitude ?? null;
  return {
    country_code: cc,
    region: region ? String(region).slice(0, 256) : null,
    city: cityName ? String(cityName).slice(0, 256) : null,
    latitude,
    longitude,
  };
}

export async function geoFieldsForIp(
  ip: string | null,
  reader: Reader<CityResponse> | null,
): Promise<{
  country_code: string | null;
  region: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
} | null> {
  if (!ip || !reader) return null;
  if (!maxmind.validate(ip)) return null;
  const rec = reader.get(ip);
  return extractGeoFromCityRecord(rec);
}
