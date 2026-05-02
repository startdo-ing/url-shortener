/**
 * R-024 / ADR-0002 — block private / loopback hosts using URL hostname only (no DNS).
 */

function parseIPv4(host: string): [number, number, number, number] | null {
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host);
  if (!m) return null;
  const a = [Number(m[1]), Number(m[2]), Number(m[3]), Number(m[4])];
  if (a.some((x) => x > 255 || !Number.isInteger(x))) return null;
  return [a[0], a[1], a[2], a[3]];
}

function isIPv4Blocked(octets: [number, number, number, number]): boolean {
  const [a, b] = octets;
  if (a === 127) return true;
  if (a === 10) return true;
  if (a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 192 && b === 168) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  return false;
}

/** Expand common IPv6 forms to 8×16-bit pieces; null if unparseable. */
function expandIPv6Hextets(host: string): number[] | null {
  const h = host.toLowerCase();
  const parts = h.split("::");
  if (parts.length > 2) return null;
  const left = parts[0] ? parts[0].split(":").filter((s) => s.length > 0) : [];
  const right = parts[1] ? parts[1].split(":").filter((s) => s.length > 0) : [];
  const missing = 8 - left.length - right.length;
  if (missing < 0) return null;
  const merged = [...left, ...Array(missing).fill("0"), ...right];
  if (merged.length !== 8) return null;
  const nums = merged.map((s) => {
    const n = parseInt(s, 16);
    return Number.isFinite(n) && n >= 0 && n <= 0xffff ? n : NaN;
  });
  if (nums.some(Number.isNaN)) return null;
  return nums;
}

function isIPv6Blocked(host: string): boolean {
  const h = host.toLowerCase();
  const v4map = /::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i.exec(h);
  if (v4map) {
    const v4 = parseIPv4(v4map[1]);
    return v4 ? isIPv4Blocked(v4) : false;
  }
  const v4hex = /^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/i.exec(h);
  if (v4hex) {
    const hi = parseInt(v4hex[1], 16);
    const lo = parseInt(v4hex[2], 16);
    if (!Number.isFinite(hi) || !Number.isFinite(lo)) return false;
    const octets: [number, number, number, number] = [
      (hi >> 8) & 0xff,
      hi & 0xff,
      (lo >> 8) & 0xff,
      lo & 0xff,
    ];
    return isIPv4Blocked(octets);
  }
  const hextets = expandIPv6Hextets(h);
  if (!hextets) return false;
  const isLoopback = hextets[7] === 1 && hextets.slice(0, 7).every((x) => x === 0);
  if (isLoopback) return true;
  if ((hextets[0] & 0xfe00) === 0xfc00) return true;
  return false;
}

/**
 * True if the URL's hostname must not be fetched (SSRF policy v1).
 */
export function isSsrfBlockedUrl(url: URL): boolean {
  const hostname = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (hostname === "localhost") return true;
  const v4 = parseIPv4(hostname);
  if (v4) return isIPv4Blocked(v4);
  if (hostname.includes(":")) return isIPv6Blocked(hostname);
  return false;
}
