# Redirect app (`apps/redirect`)

Bun HTTP service: slug lookup, redirect, async `click_events` insert + enrichment (**F-005**).

## GeoLite2 (optional)

1. Register at [MaxMind](https://www.maxmind.com/en/geolite2/signup) (GeoLite2 is free; attribution required).
2. Download **GeoLite2 City** as **MMDB** and set `GEOIP_CITY_DB` to the absolute path of `GeoLite2-City.mmdb`.
3. Refresh the DB on a schedule you trust (MaxMind updates periodically); restart redirect workers after replacing the file.

If `GEOIP_CITY_DB` is unset or unreadable, geo columns on `click_events` stay `NULL`.

## `raw_headers`

When `RAW_HEADERS_ENABLED` is `true`/`1`/`yes`, a small allowlisted subset of request headers is stored as JSON (max 8 KiB UTF-8). Default is off (**Q-003**).
