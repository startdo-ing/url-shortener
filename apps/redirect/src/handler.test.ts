import { describe, expect, test, beforeEach } from "bun:test";
import { handleRedirectRequest } from "./handler";
import type { ClickInsert, LinkRow, RedirectDeps } from "./types";

const ID = "550e8400-e29b-41d4-a716-446655440000";

async function flushMicrotasks(): Promise<void> {
  await new Promise<void>((r) => queueMicrotask(() => r()));
}

class FakeDeps implements RedirectDeps {
  links = new Map<string, LinkRow>();
  clicks: ClickInsert[] = [];
  insertThrows = false;
  trustProxyHops = 0;
  frozen = new Date("2026-05-01T12:00:00.000Z");

  constructor() {
    this.links.set("go", {
      id: ID,
      slug: "go",
      destination_url: "https://example.com/target",
      redirect_type: 302,
      status: "active",
      expires_at: null,
    });
  }

  now(): Date {
    return this.frozen;
  }

  async findLinkBySlug(slug: string): Promise<LinkRow | null> {
    return this.links.get(slug) ?? null;
  }

  async insertClick(p: ClickInsert): Promise<void> {
    if (this.insertThrows) throw new Error("R-006 insert fail");
    this.clicks.push(p);
  }
}

describe("R-003 + R-002 — path shape", () => {
  let d: FakeDeps;
  beforeEach(() => {
    d = new FakeDeps();
  });

  test("R-003: given multi-segment path, when GET, then 404", async () => {
    const res = await handleRedirectRequest(new Request("http://h/ab/cd"), "10.0.0.1", d);
    expect(res.status).toBe(404);
    await flushMicrotasks();
    expect(d.clicks.length).toBe(0);
  });

  test('R-003: given slug with space decoded, when GET, then 404', async () => {
    const res = await handleRedirectRequest(new Request("http://h/oops%20x"), "10.0.0.1", d);
    expect(res.status).toBe(404);
  });

  test("R-002: given unknown grammatical slug, when GET, then 404 Not Found", async () => {
    const res = await handleRedirectRequest(new Request("http://h/noSuch"), "10.0.0.1", d);
    expect(res.status).toBe(404);
    const txt = await res.text();
    expect(txt).toBe("Not Found");
    expect(txt.toLowerCase()).not.toContain("postgres");
    await flushMicrotasks();
    expect(d.clicks.length).toBe(0);
  });

  test("healthz deterministic 200 ok", async () => {
    const res = await handleRedirectRequest(new Request("http://h/healthz"), "10.0.0.1", d);
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("ok");
  });

  test("GET / root → 404 (no slug)", async () => {
    const res = await handleRedirectRequest(new Request("http://h/"), "10.0.0.1", d);
    expect(res.status).toBe(404);
  });

  test("POST /go → 404", async () => {
    const res = await handleRedirectRequest(
      new Request("http://h/go", { method: "POST" }),
      "10.0.0.1",
      d,
    );
    expect(res.status).toBe(404);
  });
});

describe("R-001 — redirect tempo", () => {
  let d: FakeDeps;
  beforeEach(() => {
    d = new FakeDeps();
  });

  test("R-001: active 302 ⇒ Location destination", async () => {
    const res = await handleRedirectRequest(new Request("http://h/go"), "10.0.0.1", d);
    expect(res.status).toBe(302);
    expect(res.headers.get("Location")).toBe("https://example.com/target");
    await flushMicrotasks();
    expect(d.clicks.length).toBe(1);
  });

  test("R-001: active 301", async () => {
    d.links.set("perm", {
      id: ID,
      slug: "perm",
      destination_url: "https://x.example/p",
      redirect_type: 301,
      status: "active",
      expires_at: null,
    });
    const res = await handleRedirectRequest(new Request("http://h/perm"), "10.0.0.1", d);
    expect(res.status).toBe(301);
    expect(res.headers.get("Location")).toBe("https://x.example/p");
    await flushMicrotasks();
    expect(d.clicks.length).toBe(1);
  });
});

describe("R-004 — paused / expired", () => {
  let d: FakeDeps;

  beforeEach(() => {
    d = new FakeDeps();
    d.links.set("zzz", {
      id: ID,
      slug: "zzz",
      destination_url: "https://z.zz",
      redirect_type: 302,
      status: "paused",
      expires_at: null,
    });
    d.links.set("exp", {
      id: "550e8400-e29b-41d4-a716-446655440001",
      slug: "exp",
      destination_url: "https://e.ex",
      redirect_type: 302,
      status: "active",
      expires_at: new Date("2026-05-01T12:00:00.000Z"),
    });
  });

  test("R-004: paused → 404", async () => {
    const res = await handleRedirectRequest(new Request("http://h/zzz"), "127.0.0.1", d);
    expect(res.status).toBe(404);
    await flushMicrotasks();
    expect(d.clicks.length).toBe(0);
  });

  test("R-004: expires_at <= now ⇒ 404", async () => {
    d.links.set("exp", {
      id: "550e8400-e29b-41d4-a716-446655440001",
      slug: "exp",
      destination_url: "https://e.ex",
      redirect_type: 302,
      status: "active",
      expires_at: new Date(d.frozen.getTime() - 1),
    });
    const res = await handleRedirectRequest(new Request("http://h/exp"), "127.0.0.1", d);
    expect(res.status).toBe(404);
    await flushMicrotasks();
    expect(d.clicks.length).toBe(0);
  });
});

describe("R-006 invariant — redirect not gated on insert", () => {
  let d: FakeDeps;
  beforeEach(() => {
    d = new FakeDeps();
    d.insertThrows = true;
  });

  test("R-006: insertThrows ⇒ same 302 Location as happy path semantics", async () => {
    const good = await handleRedirectRequest(new Request("http://h/go"), "10.5.5.5", new FakeDeps());
    const bad = await handleRedirectRequest(new Request("http://h/go"), "10.5.5.5", d);
    expect(bad.status).toBe(good.status);
    expect(bad.headers.get("Location")).toBe(good.headers.get("Location"));
    await flushMicrotasks();
  });
});

describe("R-007 — click payload wiring", () => {
  let d: FakeDeps;
  beforeEach(() => {
    d = new FakeDeps();
  });

  test("R-007: given headers and direct IP, when redirect, then click row captures fields", async () => {
    const req = new Request("http://h/go", {
      headers: {
        referer: "https://src.example/",
        "user-agent": "TestBot/1.0",
        "accept-language": "en;q=0.9",
      },
    });
    const res = await handleRedirectRequest(req, "198.51.100.88", d);
    expect(res.status).toBe(302);
    await flushMicrotasks();
    expect(d.clicks.length).toBe(1);
    const c = d.clicks[0]!;
    expect(c.linkId).toBe(ID);
    expect(c.ip).toBe("198.51.100.88");
    expect(c.referrer).toBe("https://src.example/");
    expect(c.userAgent).toBe("TestBot/1.0");
    expect(c.acceptLanguage).toBe("en;q=0.9");
  });
});

describe("TRUST_PROXY_HOPS edge — synthetic XFF", () => {
  test("golden: hops=1 takes first XFF", async () => {
    const d = new FakeDeps();
    d.trustProxyHops = 1;
    const req = new Request("http://h/go", {
      headers: { "x-forwarded-for": "198.51.100.2, 10.0.0.1" },
    });
    await handleRedirectRequest(req, "10.0.0.1", d);
    await flushMicrotasks();
    expect(d.clicks[0]?.ip).toBe("198.51.100.2");
  });

  test("empty XFF falls back direct", async () => {
    const d = new FakeDeps();
    d.trustProxyHops = 1;
    await handleRedirectRequest(new Request("http://h/go"), "10.0.0.2", d);
    await flushMicrotasks();
    expect(d.clicks[0]?.ip).toBe("10.0.0.2");
  });
});
