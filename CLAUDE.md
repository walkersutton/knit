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
