# F-004 — Portal Markdown notes (Write / Preview / modal)

- **Status:** done
- **Owner:** Operator (solo)
- **Linked requirements:** R-027, R-028, R-022, R-031
- **Linked ADRs:** [ADR 0004](../adr/0004-notes-markdown-sanitization.md), [ADR 0001](../adr/0001-monorepo-two-apps-postgres.md)
- **Depends on Q:** **Q-004** (interim modal — already pinned in ARCHITECTURE)
- **Estimated slices:** 1–2

## Goal

`notes_markdown` supports **Write** + **Preview** on create/edit (**R-027**) with sanitized HTML; index shows **plain excerpt clamp** (**R-028**); **“View full”** opens **modal** with full sanitized markdown, focus trap, Escape dismiss (**Q-004** interim).

## Consistency Invariant Check

- [x] Policies in ADR-0004; Q-004 interim is `decided` at architecture layer.

## Design Notes

- **Svelte islands** acceptable for modal + toggle tab state; SSR initial HTML must still render excerpt without hydration when possible (progressive enhancement optional).
- **64KB soft cap:** reject server-side POST with explicit error banner if exceeding cap.

## Public Contract

### UX

- Tabs or toggle: **`Write`** | **`Preview`** on `/links/new` and `/links/[id]/edit`.
- **Preview** renders **same pipeline** as modal body.
- **List row:** excerpt = first **~280 chars** of whitespace-stripped markdown **or** plaintext strip helper — freeze in implement; **`line-clamp: 3`** per PRODUCT_PLAN.
- **`View full`** link per row opens modal (**client component** acceptable); **Escape** closes; focus returns trigger.

### Modal a11y

- `role="dialog"` `aria-modal="true"` `aria-labelledby` heading “Notes”; initial focus trap; restore focus on close.

## Test List

- [ ] **R-027** — XSS-markdown fixtures: `<script>` / `onclick=` stripped in output golden assertions.
- [ ] **R-027** — GFM **table** fixture renders stable structure markers.
- [ ] **R-028** — excerpt visual/DOM clamps (deterministic markup).
- [ ] Modal open/close **keyboard** (Playwright-lite or `@testing-library` if introduced — defer choice to implement Reality Check notes).

## Implementation Checklist

- [ ] Select concrete markdown + sanitizer libs; pin in **`package.json`** and repeat policy in Reality Check (**ADR 0004**).
- [ ] Svelte modal + excerpt component
- [ ] Extend forms from F-002
- [ ] Workflow 07 / CHANGELOG

## Out of Scope

- Unfurl / analytics — shipped in **F-003**, **F-006**.
- Collaboration / versioning of notes — never.

## Changelog Entry (draft)

- `F-004: Markdown notes with preview + accessible full-note modal + list excerpts.`

## Reality Check (pinned stack)

Portal: **`markdown-it@14`** (`html: false`, images disabled) + **`markdown-it-task-lists`** (`enabled: false` → static disabled checkboxes) + **`sanitize-html@2`** allowlist / `http`+`https` links only, `rel`+`target` on anchors. Shared helpers: `apps/portal/src/lib/render-notes.ts`. UI: `NotesEditor.svelte`, `NotesModalRoot.svelte`.
