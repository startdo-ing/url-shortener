# ADR 0004 — Portal notes Markdown render + sanitization

## Status

Accepted

## Context

**R-027** / **R-028** require GitHub-ish Markdown rendering in the portal with **no XSS** from operator notes (`notes_markdown`).

## Decision

1. **Render path:** Markdown source → **AST or HTML** → **whitelist sanitizer** → portal DOM (Preview tab + “View full” modal — **Q-004** interim: modal).
2. **Allowed constructs (v1):** paragraphs; ATX headings `#`–`###`; bold/italic; inline code + fenced code blocks; links with `rel="noopener noreferrer"` and **`http:`/`https:` only**; bullet/ordered lists; blockquotes; **GFM tables**; task list syntax rendered as static checkboxes (no script).
3. **Forbidden:** raw HTML passthrough; `javascript:` URLs; `on*` event attributes; `data:` URLs in links unless explicitly allowed later.
4. **Implementation stack (pin at F-004 implement if library differs):** use **one** supported pipeline — e.g. **markdown-it** + **markdown-it-gfm**-compatible extensions + **sanitize-html** or **DOMPurify** in **isomorphic** mode — **document exact packages in F-004 Reality Check** when shipped. This ADR states policy; package names are not binding until F-004 closes.

## Alternatives considered

1. **Plain text only** — rejected; fails PRODUCT_PLAN tables/links requirement.
2. **Render only on server to static HTML string** — acceptable; client hydration optional for modal.

## Consequences

- Golden tests: fixture markdown → **expected sanitized HTML shape** (string contains / does not contain patterns) — no snapshot churn on whitespace if possible.
