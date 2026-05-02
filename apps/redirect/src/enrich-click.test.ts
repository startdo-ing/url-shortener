import { afterEach, describe, expect, test } from "bun:test";
import type { CityResponse } from "maxmind";
import type { Reader } from "maxmind";
import {
  extractGeoFromCityRecord,
  geoFieldsForIp,
  rawHeadersFromRequest,
  uaEnrichmentFields,
} from "./enrich-click";

describe("uaEnrichmentFields — R-008", () => {
  test("Chrome desktop UA", () => {
    const ua =
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
    const r = uaEnrichmentFields(ua);
    expect(r.is_bot).toBe(false);
    expect(r.browser?.toLowerCase()).toContain("chrome");
    expect(r.os?.toLowerCase()).toContain("windows");
    expect(r.device_type).toBe("desktop");
  });

  test("Googlebot flagged bot", () => {
    const ua = "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)";
    const r = uaEnrichmentFields(ua);
    expect(r.is_bot).toBe(true);
  });

  test("mobile Safari", () => {
    const ua =
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
    const r = uaEnrichmentFields(ua);
    expect(r.is_bot).toBe(false);
    expect(r.device_type).toBe("mobile");
  });
});

describe("rawHeadersFromRequest — Q-003", () => {
  const prev = process.env.RAW_HEADERS_ENABLED;

  afterEach(() => {
    process.env.RAW_HEADERS_ENABLED = prev;
  });

  test("off by default", () => {
    delete process.env.RAW_HEADERS_ENABLED;
    const h = new Headers({ accept: "text/html", "x-forwarded-for": "1.2.3.4" });
    expect(rawHeadersFromRequest(h)).toBe(null);
  });

  test("when enabled, collects whitelist only", () => {
    process.env.RAW_HEADERS_ENABLED = "true";
    const h = new Headers({
      accept: "text/html",
      "x-forwarded-for": "9.9.9.9",
      "x-evil": "nope",
      "cf-ipcountry": "US",
    });
    const o = rawHeadersFromRequest(h)!;
    expect(o.accept).toBe("text/html");
    expect(o["x-forwarded-for"]).toBe("9.9.9.9");
    expect(o["cf-ipcountry"]).toBe("US");
    expect(o["x-evil"]).toBeUndefined();
  });
});

describe("extractGeoFromCityRecord", () => {
  test("maps GeoIP2-style city payload", () => {
    const city = {
      country: { iso_code: "de" },
      subdivisions: [{ iso_code: "BE", names: { en: "Berlin" } }],
      city: { names: { en: "Berlin" } },
      location: { latitude: 52.52, longitude: 13.405 },
    } as unknown as CityResponse;
    const g = extractGeoFromCityRecord(city);
    expect(g?.country_code).toBe("DE");
    expect(g?.region).toBe("BE");
    expect(g?.city).toBe("Berlin");
    expect(g?.latitude).toBe(52.52);
    expect(g?.longitude).toBe(13.405);
  });
});

describe("geoFieldsForIp with mock reader", () => {
  test("returns null when reader is null", async () => {
    expect(await geoFieldsForIp("8.8.8.8", null)).toBe(null);
  });

  test("uses reader.get when present", async () => {
    const stub: Pick<Reader<CityResponse>, "get"> = {
      get(ip: string) {
        if (ip !== "1.1.1.1") return null;
        return {
          country: { iso_code: "AU" },
          subdivisions: [],
          city: { names: { en: "Sydney" } },
          location: { latitude: -33.8, longitude: 151.2 },
        } as CityResponse;
      },
    };
    const g = await geoFieldsForIp("1.1.1.1", stub as Reader<CityResponse>);
    expect(g?.country_code).toBe("AU");
    expect(g?.city).toBe("Sydney");
  });
});
