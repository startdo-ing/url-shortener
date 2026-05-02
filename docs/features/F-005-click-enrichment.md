# F-005 — Click enrichment (UA · bot · GeoIP)

- **Status:** done
- **Owner:** Operator (solo)
- **Linked requirements:** R-008 (primary), **R-007**, **R-006**
- **Linked ADRs:** [ADR 0003](../adr/0003-click-enrichment-placement.md)
- **Depends on Q:** **Q-003** (`raw_headers` default off unless env)
- **Estimated slices:** 1

## Goal

Eligible redirects still satisfy **R-006** while `click_events` rows gain **deterministic UA-derived fields**, **`is_bot`**, and nullable **geo** columns when **`GEOIP_CITY_DB`** (or chosen env) is mounted (**R-008**).

## Design Notes

- **Redirect app only** mutation path UPDATE after insert (**ADR 0003**).
- **No wall-clock flaky tests** — inject frozen `Date`/`now` via DI only if enriching uses time (prefer not).

## Public Contract

### Behaviour

After minimal insert returns, async path runs:

1. Parse `user_agent` → populate `browser`, `os`, `device_type`; set `is_bot` by agreed rule (**document rule table**: list known bot substring vs library flag — freeze in Reality Check).

2. If `GEOIP_CITY_DB` readable at startup → lookup `country_code`, `region`, `city`, `latitude`, `longitude` from **`ip`**; else leave NULL.

3. **`raw_headers`:** iff `RAW_HEADERS_ENABLED=true`, store **whitelist** keys only (**max JSON 8 KiB**) per follow-up SECURITY note — else NULL.

### Env

| Variable | Meaning |
|---------|---------|
| `GEOIP_CITY_DB` | Path to GeoLite2-City `.mmdb` (optional). |
| `RAW_HEADERS_ENABLED` | `true`/`1` toggles **`raw_headers`** policy (**Q-003** interim). |

## Test List

- [ ] **R-008 matrix** fixture UA strings → deterministic columns.
- [ ] Geo fixture map IP inet → seeded fake reader (inject mock geo service).
- [ ] **R-006 invariant** persists: enrichment failure leaves redirect unchanged (integration double).

## Implementation Checklist

- [ ] Enrichment module in `apps/redirect` (+ tests with mocks).
- [ ] Ops doc: download MaxMind attribution + cron refresh (README snippet).
- [ ] CHANGELOG

## Out of Scope

- **Analytics UI views** aggregating enrichment — **F-006**.
- **ASN/network** enrichment — backlog.

## Changelog Entry (draft)

- `F-005: Async click row enrichment — UA-derived fields, bot flag, optional GeoLite2.` 

## Reality Check — bot / UA rules (frozen)

| Signal | Rule |
|--------|------|
| **`is_bot`** | **`isbot` npm** (`isbot` v5) on full `user-agent` string — primary classifier. |
| **`browser` / `os` / `device_type`** | **`ua-parser-js` v2** `UAParser(ua).getResult()` — `browser.name`, `os.name`, `device.type`; if `device.type` is empty and not a bot → **`device_type = "desktop"`**. |
| **Geo** | **`maxmind`** reader on **`GEOIP_CITY_DB`**; `country_code` = ISO-3166-1 alpha-2 from `country.iso_code`; `region` / `city` / lat-lng from MaxMind City response when present. |
| **`raw_headers`** | Allowlist in `apps/redirect/src/enrich-click.ts` (`RAW_HEADER_ALLOW`); JSON UTF-8 **≤ 8 KiB**; only when **`RAW_HEADERS_ENABLED`** truthy. |

**Ops:** GeoLite2 download + attribution + refresh cadence → [apps/redirect/README.md](../../apps/redirect/README.md).
