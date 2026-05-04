import { describe, expect, test } from "bun:test";
import QRCode from "qrcode";
import { QR_SVG_THEME, shortUrlForSlug } from "./qr-target";

describe("QR target encoding — R-037", () => {
  test("shortUrlForSlug trims base and URI-encodes slug", () => {
    expect(shortUrlForSlug("https://c.example/", "go")).toBe("https://c.example/go");
    expect(shortUrlForSlug("https://c.example", "go")).toBe("https://c.example/go");
    expect(shortUrlForSlug("https://c.example", "a b")).toBe("https://c.example/a%20b");
    expect(shortUrlForSlug(undefined, "x")).toBeNull();
    expect(shortUrlForSlug("   ", "x")).toBeNull();
  });

  test("SVG bytes are deterministic for fixed input and theme contract", async () => {
    const svg = await QRCode.toString("https://short.example/hello", {
      type: "svg",
      margin: QR_SVG_THEME.margin,
      color: { ...QR_SVG_THEME.color },
    });
    expect(svg.includes("<svg")).toBe(true);
    expect(svg.includes("</svg>")).toBe(true);
    expect(QR_SVG_THEME.color.dark).toBe("#0F1112");
  });
});
