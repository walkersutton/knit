# Knit Club

## Project

Knit Club is a SvelteKit app for exploring sweater designs. It uses Svelte 5, TypeScript, Three.js, Vite, and pnpm.

## Commands

- `pnpm dev` — start the development server
- `pnpm check` — run Svelte and TypeScript checks
- `pnpm test` — run Vitest tests
- `pnpm build` — build the app

## Guidance

- Follow the existing Svelte 5 and TypeScript patterns in `src/`.
- Keep sweater design and rendering logic in `src/lib/sweater/`; the route UI lives in `src/routes/`.
- Update or add focused tests when changing sweater logic.
- Do not edit generated files under `.svelte-kit/`.
- Use pnpm for package management and keep `pnpm-lock.yaml` in sync with dependency changes.

## Buttons

- Every action button or button-styled link uses the shared stitched style in `src/lib/stitch.css`: add `class="stitch"` (footer blue, for the main action) with `quiet` (cream, secondary), `danger` (destructive), `sm` (compact) and `block` (full width). Do not write one-off button CSS in a component.
- The big designer calls to action (the "New chart/pattern" buttons, and Get my pattern, Print and Save under the model) use `class="chunk"` instead: the home page's "Start designing" look, scaled down, with `quiet`, `danger`, `sm` and `block` too.
- A stitched button grows slightly on hover and its stitching marches; a chunky one sinks when pressed. Change either in `stitch.css` so every button follows.
- Radios, segmented options, swatches, tabs and icon-only controls are not action buttons and keep their own styles. So do the hero CTAs (home, error and About pages, and the Roll button), which are the chunky terracotta style.
- Motion rules for hover: gate it with `@media (hover: hover) and (pointer: fine)`, use `transform`, ease-out and under 300ms, and honour `prefers-reduced-motion`.
