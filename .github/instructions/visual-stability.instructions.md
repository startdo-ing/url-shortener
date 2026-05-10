---
description: "Use when editing SSR dashboard and management-web UI files, especially anything involving cards, borders, fonts, layout, or refresh-time visual stability. Covers layout shift, flashing, and first-paint stability."
name: "Visual Stability"
applyTo:
  - "apps/management-web/src/**/*.astro"
  - "apps/management-web/src/**/*.svelte"
  - "apps/management-web/src/**/*.css"
  - "apps/management-web/src/**/*.ts"
---
# Visual Stability Rules

- Preserve first-paint stability. A UI should look the same on the first render and after the browser finishes applying styles.
- Do not introduce layout shift. Avoid any change that can alter width, height, spacing, or element position after initial paint.
- Prefer paint-only visual treatments when a decorative edge is needed. Use `box-shadow` or a pseudo-element instead of a late-resolving `border` when border timing could affect layout.
- If a border must be used, reserve its space from the start so the element box does not change during refresh.
- Avoid duplicate font loading or any stylesheet change that can change text metrics after the first frame.
- Do not hide a flashing edge by masking it unless the underlying box geometry is still stable.
- Keep SSR pages deterministic at refresh. The page should not depend on later client-side style settling to look correct.
- When changing dashboard blocks, verify the result with repeated refreshes and compare early and late screenshots or computed styles.
- If a change creates a visible flash, layout jump, or corner artifact, revert the visual workaround and fix the underlying geometry instead.
