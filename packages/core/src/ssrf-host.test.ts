import { describe, expect, test } from "bun:test";
import { isSsrfBlockedUrl } from "./ssrf-host";

function u(href: string): URL {
  return new URL(href);
}

describe("isSsrfBlockedUrl — R-024", () => {
  test("blocks 127.0.0.1", () => {
    expect(isSsrfBlockedUrl(u("http://127.0.0.1/"))).toBe(true);
  });
  test("blocks 10.0.0.1", () => {
    expect(isSsrfBlockedUrl(u("http://10.0.0.1/x"))).toBe(true);
  });
  test("blocks 192.168.1.1", () => {
    expect(isSsrfBlockedUrl(u("https://192.168.1.1/"))).toBe(true);
  });
  test("blocks 172.16.0.1", () => {
    expect(isSsrfBlockedUrl(u("http://172.16.0.1/"))).toBe(true);
  });
  test("blocks 169.254.1.1 link-local", () => {
    expect(isSsrfBlockedUrl(u("http://169.254.1.1/"))).toBe(true);
  });
  test("blocks localhost hostname", () => {
    expect(isSsrfBlockedUrl(u("http://localhost/path"))).toBe(true);
  });
  test("blocks ::1", () => {
    expect(isSsrfBlockedUrl(u("http://[::1]/"))).toBe(true);
  });
  test("blocks fc00:: ULA", () => {
    expect(isSsrfBlockedUrl(u("http://[fc00::1]/"))).toBe(true);
  });
  test("blocks ::ffff:10.0.0.1 mapped", () => {
    expect(isSsrfBlockedUrl(u("http://[::ffff:10.0.0.1]/"))).toBe(true);
  });
  test("allows public https", () => {
    expect(isSsrfBlockedUrl(u("https://example.com/"))).toBe(false);
  });
});
