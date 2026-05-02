import { describe, expect, test } from "bun:test";
import { jsonUnauthorized } from "./v1-http";

describe("v1-http — R-033", () => {
  test("jsonUnauthorized stable body", async () => {
    const res = jsonUnauthorized();
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toEqual({ error: "unauthorized" });
  });
});
