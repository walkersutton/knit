<h1 align="center">Knit It</h1>

<p align="center">
  Design a sweater in 3D. Get the written knitting pattern.
</p>

<p align="center">
  <a href="https://knit.walkersutton.com"><strong>knit.walkersutton.com</strong></a>
  ·
  <a href="https://knit.walkersutton.com/about">How it works</a>
  ·
  <a href="https://github.com/walkersutton/knit/issues">Report a bug</a>
</p>

<p align="center">
  <a href="https://knit.walkersutton.com">
    <img src="docs/screenshot.png" alt="The Knit It designer: garment options on the left, a 3D model of a blue raglan sweater on the right, and yarn, needle, gauge and skill estimates below" width="900">
  </a>
</p>

Knit It is a free sweater designer whose pattern calculations run in the browser. Pick a garment, size, fit, neckline, sleeves, edge finishes and yarn, watch a 3D model update with every choice, and get a written top-down raglan or set-in pattern with the stitch counts worked out for that exact design. An optional Ravelry sign-in syncs saved designs, charts and knitting progress across devices.

## Features

- **Live 3D preview.** A Three.js model with procedural stitch textures, rebuilt as you change the design. Drag to rotate.
- **Written patterns.** Materials, gauge, finished measurements in cm and inches, and step-by-step instructions with the stitch count after every shaping step.
- **Sized to your yarn.** Fingering, DK, worsted and bulky weights, with yardage and skein estimates per colour.
- **Uses the needles you own.** Tell it which sizes you have and the pattern is rewritten for the closest workable needle and its gauge, keeping the finished size the same.
- **Colourwork.** Solid, stripes or Fair Isle, with a chart.
- **Saved designs and charts.** Keep named sweater designs and custom colourwork charts in your library.
- **Beginner view.** Every abbreviation written out, tips on the steps that trip people up, and links to free tutorials at the step where you first need each technique.
- **Progress tracking.** Tick off steps and count rounds. The 3D model grows to show the fabric you have knitted so far.
- **Works offline.** A service worker keeps the whole app on the device, and your design and place are saved in the browser.
- **Optional account sync.** Sign in with Ravelry to sync saved sweater designs, charts and knitting progress across devices.
- **Print or save as PDF.**

### What you can design

| | |
| --- | --- |
| Garments | Sweater, T-shirt, cardigan, slipover |
| Made for | Adult, junior, kid, baby, in XS to XL |
| Fit | Fitted, relaxed, oversized; cropped, regular or long body |
| Necklines | Crew, V-neck, boat, I-cord, mock neck, turtleneck |
| Sleeves | Short, 3/4 or full; straight, balloon or puff |
| Edges | Ribbed (1×1, 2×2, 2×1, twisted), folded hem, rolled edge, I-cord |
| Fabric | Solid, stripes or Fair Isle in 12 colours |

Every garment comes with a full written pattern: raglan or set-in for sleeved garments, and set-in shoulders with rolled armhole edges for slipovers.

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

Ravelry access tokens are used server-side only to read the Ravelry account identity and are not stored. Knit It stores an opaque session token hash and each account's saved designs, charts and progress in Postgres. The browser continues to store a local copy for offline use.

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
│   ├── Seo.svelte           Meta tags and structured data
│   └── site.ts              Site-wide constants
├── routes/
│   ├── +page.svelte         The landing page
│   ├── design/              The sweater designer
│   └── about/               How it works and FAQ
└── service-worker.ts        Offline support
```

### Tech stack

[SvelteKit](https://svelte.dev/docs/kit) with Svelte 5, [TypeScript](https://www.typescriptlang.org), [Three.js](https://threejs.org), [Vite](https://vite.dev) and [Vitest](https://vitest.dev).

## Contributing

Issues and pull requests are welcome. Corrections from knitters are especially useful: if a pattern gives a stitch count or instruction that does not work on the needles, please [open an issue](https://github.com/walkersutton/knit/issues) with the design you chose.

Before opening a pull request:

1. Run `pnpm check` and `pnpm test`.
2. Add or update tests when you change anything in `src/lib/sweater/`. The suite writes patterns for a wide range of designs and checks that the stitch counts add up.
3. Keep sweater logic in `src/lib/sweater/` and route UI in `src/routes/`.
