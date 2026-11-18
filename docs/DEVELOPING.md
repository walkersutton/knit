# Developing knit

This is the technical guide. For what knit is and how to use it, see the [README](../README.md).

## Getting started

You need [Node.js](https://nodejs.org) 20 or later and [pnpm](https://pnpm.io).

```sh
git clone https://github.com/walkersutton/knit.git
cd knit
pnpm install
pnpm dev
```

Then open <http://localhost:5173>.

### Account sync setup

Account sync uses a Vercel server runtime and Neon Postgres. `DATABASE_URL` is injected by the Vercel Neon integration (for local dev, `vercel env pull .env.local`); run `db/schema.sql` against it once. `PUBLIC_ORIGIN` and the Ravelry client ID and secret live in the dotenvx-encrypted `.env.production`, which is committed: set them with `pnpm exec dotenvx set NAME value -f .env.production`. The private key is in `.env.keys` (gitignored) and in Vercel as `DOTENV_PRIVATE_KEY_PRODUCTION`; the server decrypts the file at runtime (`src/lib/server/env.ts`). Register `{PUBLIC_ORIGIN}/auth/ravelry/callback` as the Ravelry app's callback URL. For local sign-in, register `http://localhost:5173/auth/ravelry/callback` as an additional callback and set `PUBLIC_ORIGIN=http://localhost:5173` in `.env.local`.

Ravelry access tokens are used server-side only to read the Ravelry account identity and are not stored. knit stores an opaque session token hash and each account's saved designs, charts and progress in Postgres. The browser continues to store a local copy for offline use.

| Command | What it does |
| --- | --- |
| `pnpm dev` | Start the development server |
| `pnpm check` | Run Svelte and TypeScript checks |
| `pnpm test` | Run the Vitest suite |
| `pnpm build` | Build the production site |
| `pnpm preview` | Serve the production build locally |

## How it works

One function, `measure()`, turns a design into finished measurements. The 3D model and the written pattern both read from it, so the pattern always describes the garment on screen.

```
Design ──► measure() ──┬──► buildGarment() ──► Three.js viewer
                       └──► writePattern() ──► pattern view, print, progress
```

Everything is computed in the browser, and every page is prerendered to static HTML.

### Project layout

```
src/
├── lib/
│   ├── sweater/
│   │   ├── garment.ts       Design type, measurements and 3D geometry
│   │   ├── pattern.ts       Written pattern and yarn estimates
│   │   ├── needles.ts       Needle sizes, gauge and picking from the sizes you own
│   │   ├── options.ts       Every choice the designer offers
│   │   ├── yarn.ts          Procedural stitch textures and colourwork charts
│   │   ├── viewer.ts        Three.js scene, camera and controls
│   │   ├── progress.ts      Step tracking and saved state
│   │   ├── learn.ts         Beginner view: tutorials and spelled-out shorthand
│   │   └── *.svelte         Designer and pattern components
│   ├── server/              Database, sign-in and sharing code, and og.ts (link-preview images)
│   ├── Seo.svelte           Meta tags and structured data
│   └── site.ts              Site-wide constants
├── routes/
│   ├── +page.svelte         The landing page
│   ├── design/              The sweater designer
│   ├── pattern/, chart/     Catalogues of shared patterns and charts
│   ├── people/              Public knitter pages
│   ├── og/                  Link-preview images
│   ├── sitemap.xml/         Sitemap built from the database
│   └── about/               How it works and FAQ
└── service-worker.ts        Offline support
```

### Tech stack

[SvelteKit](https://svelte.dev/docs/kit) with Svelte 5, [TypeScript](https://www.typescriptlang.org), [Three.js](https://threejs.org), [Vite](https://vite.dev) and [Vitest](https://vitest.dev).

## Preview images, sitemap and `llms.txt`

- Shared patterns, charts and knitter pages each get their own link-preview image, drawn on request at `/og/pattern/{id}.png`, `/og/chart/{id}.png` and `/og/people/{username}.png` (`src/lib/server/og.ts`, using satori and resvg). The site-wide image is `static/og.png`; regenerate it with `OG_OUT=static pnpm exec vitest run src/lib/server/og.test.ts` and rename `site.png` to `og.png`.
- Page titles, descriptions, canonical links and preview images are set by `src/lib/Seo.svelte`.
- `/sitemap.xml` is built on request from the database and lists every shared pattern, chart and knitter.
- `static/llms.txt` is a short plain-text summary of the site for AI assistants. Update it when features change.

## Contributing

Issues and pull requests are welcome. Corrections from knitters are especially useful: if a pattern gives a stitch count or instruction that does not work on the needles, please [open an issue](https://github.com/walkersutton/knit/issues) with the design you chose.

Before opening a pull request:

1. Run `pnpm check` and `pnpm test`.
2. Add or update tests when you change anything in `src/lib/sweater/`. The suite writes patterns for a wide range of designs and checks that the stitch counts add up.
3. Keep sweater logic in `src/lib/sweater/` and route UI in `src/routes/`.
