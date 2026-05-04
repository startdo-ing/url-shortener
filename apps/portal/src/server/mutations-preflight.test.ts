import { describe, expect, test } from "bun:test";
import {
  parseExpiresAtForm,
  postgresUniqueViolation,
  preflightCreateLink,
  preflightUpdateLink,
  type CreateLinkInput,
  type UpdateLinkInput,
} from "./mutations";

const baseLink: CreateLinkInput = {
  destination_url: "https://ok.example/page",
  slugField: "myslug",
  redirect_type: 302,
  status: "active",
  display_title: null,
  notes_markdown: null,
  expires_at: null,
};

describe("preflightCreateLink — R-005 / R-020 / R-021 adjunct", () => {
  test("R-005: javascript destination rejected before DB", () => {
    expect(
      preflightCreateLink({
        ...baseLink,
        destination_url: "javascript:alert(1)",
      }),
    ).toBe("invalid_destination");
  });

  test("R-020: empty slug field passes (random path); non-empty slug must parse", () => {
    expect(preflightCreateLink({ ...baseLink, slugField: "" })).toBeNull();
    expect(preflightCreateLink({ ...baseLink, slugField: "bad slug" })).toBe("invalid_slug");
    expect(preflightCreateLink(baseLink)).toBeNull();
  });
});

describe("preflightUpdateLink — R-022", () => {
  const upd: UpdateLinkInput = {
    ...baseLink,
    id: "550e8400-e29b-41d4-a716-446655440000",
  };

  test("valid update preflight clears", () => {
    expect(preflightUpdateLink(upd)).toBeNull();
  });

  test("invalid slug shape rejected", () => {
    expect(preflightUpdateLink({ ...upd, slugField: "x y" })).toBe("invalid_slug");
  });

  test("redirect type normalization still governed by destination rules", () => {
    expect(preflightUpdateLink({ ...upd, destination_url: "data:text/plain,hi" })).toBe("invalid_destination");
  });
});

describe("postgresUniqueViolation — R-021", () => {
  test("23505 ⇒ unique violation mapping", () => {
    expect(postgresUniqueViolation({ code: "23505" })).toBe(true);
    expect(postgresUniqueViolation({ code: "42703" })).toBe(false);
    expect(postgresUniqueViolation(new Error("nope"))).toBe(false);
  });
});

describe("parseExpiresAtForm — editable expiry (R-022)", () => {
  test("parses UTC and blank", () => {
    expect(parseExpiresAtForm("")).toBeNull();
    expect(parseExpiresAtForm(null)).toBeNull();
    expect(parseExpiresAtForm("2026-01-15T00:00:00.000Z")).toBeInstanceOf(Date);
    expect(parseExpiresAtForm("nope")).toBe("invalid");
  });
});
