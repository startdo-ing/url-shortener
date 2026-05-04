/**
 * Lightweight doc/product constraints so `R-*` coverage stays explicit.
 */
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const repoRoot = new URL("../../../../", import.meta.url);

describe("R-032 / R-031 — archived product constraints", () => {
  test("ARCHITECTURE still anchors two-app split", () => {
    const txt = readFileSync(new URL("ARCHITECTURE.md", repoRoot), "utf8");
    expect(txt.includes("portal") || txt.includes("Redirect")).toBe(true);
  });

  test("design.md retains palette tokens (**R-031** baseline)", () => {
    const txt = readFileSync(new URL("design.md", repoRoot), "utf8");
    expect(txt).toContain("#0F1112");
    expect(txt).toContain("#00A36C");
  });
});

describe("R-025 — list reads persistence only", () => {
  test("db loader has no outbound fetch() (**R-025** invariant)", () => {
    const p = new URL("./db.ts", import.meta.url);
    const txt = readFileSync(p, "utf8");
    expect(txt.includes("fetch(")).toBe(false);
  });
});

describe("R-023 — destructive retirement", () => {
  test("deleteLink executes DELETE RETURNING (**R-023** clause)", () => {
    const p = new URL("./mutations.ts", import.meta.url);
    const txt = readFileSync(p, "utf8");
    expect(txt).toContain("DELETE FROM links");
    expect(txt).toContain("RETURNING id");
  });
});
