export type RedirectRateLimiter = {
  /** Returns whether the hit is allowed; when blocked, `retryAfterSec` is positive. */
  check(key: string): { ok: true } | { ok: false; retryAfterSec: number };
};

export function createRedirectRateLimiter(opts: {
  windowMs: number;
  max: number;
  now: () => number;
}): RedirectRateLimiter {
  const { windowMs, max, now } = opts;
  const buckets = new Map<string, { n: number; windowStart: number }>();

  return {
    check(key: string): { ok: true } | { ok: false; retryAfterSec: number } {
      const t = now();
      let e = buckets.get(key);
      if (e == null || t - e.windowStart >= windowMs) {
        buckets.set(key, { n: 1, windowStart: t });
        return { ok: true };
      }
      if (e.n >= max) {
        const retryAfterSec = Math.max(
          1,
          Math.ceil((e.windowStart + windowMs - t) / 1000),
        );
        return { ok: false, retryAfterSec };
      }
      e = { ...e, n: e.n + 1 };
      buckets.set(key, e);
      return { ok: true };
    },
  };
}
