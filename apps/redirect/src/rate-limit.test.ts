import { describe, expect, test } from "bun:test";
import { createRedirectRateLimiter } from "./rate-limit";

describe("createRedirectRateLimiter", () => {
  test("allows up to max hits in a window", () => {
    let t = 1_000_000;
    const lim = createRedirectRateLimiter({ windowMs: 10_000, max: 3, now: () => t });
    expect(lim.check("a")).toEqual({ ok: true });
    expect(lim.check("a")).toEqual({ ok: true });
    expect(lim.check("a")).toEqual({ ok: true });
    const b = lim.check("a");
    expect(b.ok).toBe(false);
    if (!b.ok) expect(b.retryAfterSec).toBeGreaterThanOrEqual(1);
  });

  test("resets after window elapses", () => {
    let t = 0;
    const lim = createRedirectRateLimiter({ windowMs: 1000, max: 1, now: () => t });
    expect(lim.check("x")).toEqual({ ok: true });
    expect(lim.check("x").ok).toBe(false);
    t += 1001;
    expect(lim.check("x")).toEqual({ ok: true });
  });

  test("keys are independent", () => {
    const lim = createRedirectRateLimiter({ windowMs: 60_000, max: 1, now: () => 5 });
    expect(lim.check("i1")).toEqual({ ok: true });
    expect(lim.check("i2")).toEqual({ ok: true });
  });
});
