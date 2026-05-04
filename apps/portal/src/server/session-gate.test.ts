import { describe, expect, test } from "bun:test";
import { sessionAuthBypassPath } from "./session-gate";

describe("sessionAuthBypassPath — R-034", () => {
  test("portal management HTML is gated unless authed later in middleware stack", () => {
    expect(sessionAuthBypassPath("/")).toBe(false);
    expect(sessionAuthBypassPath("/analytics")).toBe(false);
    expect(sessionAuthBypassPath("/links/new")).toBe(false);
  });

  test("/api/v1 stays reachable for Bearer auth (**R-033** joint)", () => {
    expect(sessionAuthBypassPath("/api/v1/links")).toBe(true);
  });

  test("login plumbing and astro assets bypass session", () => {
    expect(sessionAuthBypassPath("/login")).toBe(true);
    expect(sessionAuthBypassPath("/login/reset")).toBe(true);
    expect(sessionAuthBypassPath("/api/login")).toBe(true);
    expect(sessionAuthBypassPath("/api/logout")).toBe(true);
    expect(sessionAuthBypassPath("/_astro/foo.js")).toBe(true);
  });
});
