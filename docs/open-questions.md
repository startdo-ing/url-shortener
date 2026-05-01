# Open questions

| ID | Question | Status | Resolution |
|----|----------|--------|------------|
| Q-001 | For **paused** links, what must the redirect app return: `404`, `410`, minimal HTML body, or other? | interim | **`404`** minimal/plain, same class as unknown slug until changed. See [ARCHITECTURE.md](../ARCHITECTURE.md) § Behavioral defaults. |
| Q-002 | Same as Q-001 for **expired** links (when `expires_at` is enforced). | interim | **`404`** as Q-001. See [ARCHITECTURE.md](../ARCHITECTURE.md) § Behavioral defaults. |
| Q-003 | Should **`raw_headers`** on `click_events` be populated by default, opt-in via config, or never in v1? | interim | **Default off**; enable via explicit env flag with size/key whitelist. See [ARCHITECTURE.md](../ARCHITECTURE.md). |
| Q-004 | Notes “view full”: **modal dialog** vs **drawer** as default (both must meet focus trap + Escape closes)? | interim | **Modal** default. See [ARCHITECTURE.md](../ARCHITECTURE.md). |

When product replaces an interim decision, set `Status: decided → ADR-NNNN` or link to RELEASE notes and tighten acceptance in [REQUIREMENTS.md](./REQUIREMENTS.md).

Add new rows; never recycle ids.
