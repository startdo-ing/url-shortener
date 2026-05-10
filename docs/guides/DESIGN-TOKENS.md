# Design Tokens Guide

## Source of truth: `design.md`

All visual decisions — colors, typography, spacing, border-radius, and component defaults — live in [`design.md`](../../design.md) at the project root. That file is maintained with [designdotmd](https://designdotmd.com) and uses a YAML front-matter block to declare the token values, followed by prose that explains the rationale.

When the visual language changes, edit `design.md` first. Then update `apps/management-web/app/ui/styles.ts` to match.

---

## How tokens are applied

The token pipeline is:

```
design.md (source)
  └─> styles.ts (CSS custom properties + base styles)
        └─> document.tsx (injected as <style> into every page)
```

### `styles.ts`

Exports a single `globalStyles` string (a CSS template literal). It defines:

1. **CSS custom properties** on `:root` — every token from `design.md` becomes a `--prefixed-name` variable.
2. **Base styles** — reset, typography, form elements, buttons, badges, layout shell, and data table.

No CSS bundler, preprocessor, or build step is required. The string is injected server-side by `document.tsx`.

---

## Token reference

Tokens map from `design.md` keys to CSS custom properties:

### Colors

| `design.md` key    | CSS variable           | Value       | Use                                |
|--------------------|------------------------|-------------|------------------------------------|
| `colors.primary`   | `--color-primary`      | `#191918`   | Headings, body text                |
| `colors.secondary` | `--color-secondary`    | `#706A60`   | Labels, borders, metadata          |
| `colors.tertiary`  | `--color-tertiary`     | `#B55C4D`   | Primary action (one per screen)    |
| `colors.neutral`   | `--color-neutral`      | `#F7F6F3`   | Page background                    |
| `colors.surface`   | `--color-surface`      | `#FFFFFF`   | Cards, inputs, header background   |
| `colors.on-primary`| `--color-on-primary`   | `#FFFFFF`   | Text on tertiary backgrounds       |

### Typography

| `design.md` key          | CSS variable                  | Value      |
|--------------------------|-------------------------------|------------|
| `typography.body.fontSize`   | `--font-size-body`        | `0.95rem`  |
| `typography.h1.fontSize`     | `--font-size-h1`          | `2rem`     |
| `typography.display.fontSize`| `--font-size-display`     | `3.5rem`   |
| `typography.label.fontSize`  | `--font-size-label`       | `0.72rem`  |

### Spacing

| `design.md` key  | CSS variable      | Value   |
|------------------|-------------------|---------|
| `spacing.sm`     | `--spacing-sm`    | `8px`   |
| `spacing.md`     | `--spacing-md`    | `16px`  |
| `spacing.lg`     | `--spacing-lg`    | `32px`  |

### Border radius

| `design.md` key  | CSS variable      | Value   |
|------------------|-------------------|---------|
| `rounded.sm`     | `--rounded-sm`    | `4px`   |
| `rounded.md`     | `--rounded-md`    | `6px`   |
| `rounded.lg`     | `--rounded-lg`    | `10px`  |

---

## Using tokens in components

Always use CSS custom properties. Never hardcode colour or spacing values in component TSX.

```tsx
// Good — references the token
<div style={{ color: "var(--color-secondary)", padding: "var(--spacing-md)" }}>

// Bad — hardcodes a value that can't be updated from design.md
<div style={{ color: "#8C877D", padding: "16px" }}>
```

For the common patterns (cards, banners, badges, tables), use the utility class names defined in `styles.ts` rather than inline styles:

```tsx
<div className="card">...</div>
<p className="banner banner--error">{errorMessage}</p>
<span className="badge badge--verified">Verified</span>
<div className="row-actions">...</div>
```

---

## Updating the token theme

1. Edit `design.md` — change the YAML front-matter values.
2. Open `apps/management-web/app/ui/styles.ts`.
3. Update the corresponding CSS custom property in the `:root` block.
4. Run `bun run check-all` to confirm no breakage.

No build step is needed. Refresh the browser to see the change.

---

## Design rules (from `design.md`)

- **Use `--color-tertiary` for exactly one interactive action per screen.** Reserve it for the primary CTA button. Secondary destructive actions use `button[data-variant="secondary"]`.
- **Let `--color-neutral` carry the composition.** White space and the warm beige background are not empty — they are the design.
- **No gradients.** The system is flat by design.
- **No alternate accent colours.** If a second accent is needed, update `design.md` first and get agreement before adding it here.
