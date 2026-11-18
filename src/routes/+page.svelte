<script lang="ts">
	import Featured from '$lib/Featured.svelte';
	import Members from '$lib/Members.svelte';
	import Seo from '$lib/Seo.svelte';
	import Roll from '$lib/sweater/Roll.svelte';
	import { SITE } from '$lib/site';
	import { yarn } from '$lib/yarn.svelte';

	const title = 'knit — Custom sweater pattern generator with 3D preview';
	const description =
		'Design a sweater, cardigan or tee in 3D, then get a free written top-down raglan or set-in knitting pattern sized to your yarn weight, gauge and measurements.';
	const jsonLd = {
		'@context': 'https://schema.org',
		'@type': 'WebApplication',
		name: SITE.name,
		url: SITE.url + '/design',
		description,
		image: SITE.image,
		applicationCategory: 'DesignApplication',
		operatingSystem: 'Any',
		browserRequirements: 'Requires JavaScript and WebGL',
		isAccessibleForFree: true,
		offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
		featureList: [
			'Live 3D sweater preview',
			'Written top-down raglan and set-in knitting patterns with stitch counts',
			'Sweaters, T-shirts, cardigans and slipovers',
			'Adult, junior, kid and baby sizes from XS to XL, or a custom fit from your own measurements',
			'Fingering, DK, worsted and bulky yarn weights',
			'Yarn yardage, skein and needle size estimates',
			'Patterns written for the needle sizes you already own',
			'Stripes and Fair Isle colourwork with a chart',
			'Beginner view with plain-language steps, tips and links to tutorials',
			'Tick off steps and count rounds, with your place saved in the browser or synced across devices',
			'3D model that grows as you read through the pattern',
			'Print or save the pattern as a PDF'
		]
	};

	// The same swatch as the 404 page, knitted in row by row. The needle cursor knits the stitches it passes in the
	// colour of the yarn on it.
	const COLS = 11;
	const ROWS = 8;
	const W = 18;
	const H = 11.5;
	const x = (c: number) => 18 + c * W;
	const y = (r: number) => 22 + r * H;
	const VW = COLS * W + 18;
	const VH = y(ROWS - 1) + 10;
	const STITCH = 'M0 0C-7 -4 -10.5 -12 -9.5 -18.5C-9 -21.5 -5.5 -21.5 -4 -19C-1.5 -14.5 0 -8 0 0Z';
	const BASE = '#faf3dc';
	const REACH = 22;

	let fills = $state<string[]>(Array(COLS * ROWS).fill(BASE));

	function knit(e: PointerEvent) {
		// A mouse knits whenever it is over the swatch; a finger only while it is down.
		if (e.pointerType !== 'mouse' && e.buttons === 0) return;
		const r = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
		const px = ((e.clientX - r.left) / r.width) * VW;
		const py = ((e.clientY - r.top) / r.height) * VH;
		for (let rr = 0; rr < ROWS; rr++)
			for (let c = 0; c < COLS; c++) {
				if (Math.hypot(x(c) - px, y(rr) - 5 - py) < REACH) fills[rr * COLS + c] = yarn.color;
			}
	}
	function unravel() {
		fills = Array(COLS * ROWS).fill(BASE);
	}

	const perks = [
		{ label: 'Free', tone: 'mustard' },
		{ label: 'Optional account', tone: 'sage' },
		{ label: 'Runs in your browser', tone: 'sky' }
	];
	const steps = [
		{ n: 1, tone: 'clay', h: 'Design it', p: 'Pick the garment, fit, neckline and yarn. A 3D model follows every choice.' },
		{ n: 2, tone: 'mustard', h: 'Get the pattern', p: 'A written top-down raglan or set-in with stitch counts, yardage and needle sizes worked out for you.' },
		{ n: 3, tone: 'sage', h: 'Knit along', p: 'Tick off steps as you go. The model grows to match your place.' }
	];
</script>

<Seo {title} {description} path="/" {jsonLd} />

<div class="page">
	<main>
		<h1>
			<button type="button" class="patch" onclick={unravel} aria-label="knit. Unravel the swatch below.">
				<span>kn<strong>it</strong></span>
			</button>
		</h1>
		<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
		<svg
			class="swatch"
			viewBox="0 0 {VW} {VH}"
			role="img"
			aria-label="A swatch of knitted stockinette. Move over it to knit it in colour."
			onpointermove={knit}
			onpointerdown={knit}
		>
			<defs>
				<g id="stitch-v"><path d={STITCH} /><path d={STITCH} transform="scale(-1 1)" /></g>
			</defs>
			<rect width="100%" height="100%" rx="10" class="ground" />
			{#each { length: ROWS }, r}
				{#each { length: COLS }, c}
					<g class="st" style="--i: {ROWS - 1 - r}; --j: {c}; fill: {fills[r * COLS + c]}">
						<use href="#stitch-v" transform="translate({x(c)} {y(r)}) scale(.85 .52)" />
					</g>
				{/each}
			{/each}
		</svg>
		<p class="hint">
			<span class="coarse">Drag across the swatch to knit it</span>
		</p>

		<ul class="perks">
			{#each perks as p (p.label)}<li class={p.tone}>{p.label}</li>{/each}
		</ul>
		<h2 class="tagline">Design a sweater, then <em>knit it</em></h2>
		<p class="lede">Shape it in 3D, pick your yarn, and get a written pattern with every stitch count worked out.</p>
		<p class="actions"><a class="cta" href="/design">Start designing</a><a class="link" href="/about">How knit works</a></p>
	</main>

	<Roll />

	<section class="steps" aria-label="How it works">
		<ol>
			{#each steps as s (s.n)}
				<li class={s.tone}>
					<span class="num">{s.n}</span>
					<h2>{s.h}</h2>
					<p>{s.p}</p>
				</li>
			{/each}
		</ol>
	</section>

	<Featured />

	<Members />
</div>

<style>
	.page {
		--ink: #26335f;
		--muted: #5d6385;
		--line: #e6dcc0;
		color: var(--ink);
		font-size: 15px;
		line-height: 1.6;
	}
	.steps {
		max-width: 912px;
		width: 100%;
		margin: 0 auto;
		padding: 0 16px;
	}
	main {
		display: flex;
		flex-direction: column;
		align-items: center;
		max-width: 520px;
		margin: 0 auto;
		padding: 24px 16px 64px;
		text-align: center;
	}
	.swatch {
		width: min(360px, 100%);
		height: auto;
		margin-bottom: 4px;
		filter: drop-shadow(0 6px 0 #2f3f73) drop-shadow(0 10px 16px rgb(38 51 95 / 0.25));
		touch-action: pan-y;
	}
	.ground {
		fill: #465e9d;
	}
	.st {
		transform-box: fill-box;
		transform-origin: center;
		opacity: 0;
		transform: translateY(5px) scale(0.7);
		animation: cast 260ms cubic-bezier(0.23, 1, 0.32, 1) forwards;
		animation-delay: calc(150ms + var(--i) * 70ms + var(--j) * 12ms);
		transition: fill 220ms ease-out;
	}
	@keyframes cast {
		to {
			opacity: 1;
			transform: none;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.st {
			animation: none;
			opacity: 1;
			transform: none;
			transition: none;
		}
	}
	.hint {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 12px;
		min-height: 44px;
		margin: 12px 0 8px;
		color: var(--muted);
		font-size: 13px;
	}
	.coarse {
		display: none;
	}
	@media (pointer: coarse) {
		.coarse {
			display: inline;
		}
	}
	.perks {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 8px;
		margin: 0 0 20px;
		padding: 0;
		list-style: none;
	}
	.perks li {
		padding: 2px 12px;
		border-radius: 999px;
		font-size: 13px;
		font-weight: 600;
	}
	.mustard {
		--tint: #f6e2a4;
		--solid: #e8bd53;
	}
	.sage {
		--tint: #d7e4d3;
		--solid: #78917a;
	}
	.sky {
		--tint: #d3e3f2;
		--solid: #9dbfe0;
	}
	.clay {
		--tint: #f4d5c3;
		--solid: #d99172;
	}
	.perks li {
		background: var(--tint);
	}
	main h1 {
		margin: 0 0 32px;
		font: inherit;
	}
	.patch {
		display: block;
		margin: 0;
		padding: 12px;
		border: 0;
		color: inherit;
		cursor: pointer;
		-webkit-tap-highlight-color: transparent;
		transition:
			transform 160ms cubic-bezier(0.23, 1, 0.32, 1),
			box-shadow 160ms cubic-bezier(0.23, 1, 0.32, 1);
		border-radius: 14px;
		background: #c8543e;
		box-shadow:
			0 3px 0 #8f3a2a,
			0 8px 14px rgb(143 58 42 / 0.25);
		font-family: var(--display);
		font-size: clamp(52px, 15vw, 84px);
		font-weight: 500;
		line-height: 1;
		letter-spacing: -0.02em;
		transform: rotate(-2deg);
		animation: iron 300ms cubic-bezier(0.23, 1, 0.32, 1) both;
	}
	@media (hover: hover) {
		.patch:hover {
			transform: rotate(-3deg) translateY(-2px);
			box-shadow:
				0 5px 0 #8f3a2a,
				0 12px 18px rgb(143 58 42 / 0.3);
		}
	}
	.patch:active {
		transform: rotate(-2deg) translateY(2px) scale(0.97);
		box-shadow:
			0 1px 0 #8f3a2a,
			0 3px 6px rgb(143 58 42 / 0.2);
	}
	.patch:focus-visible {
		outline: 3px solid var(--focus);
		outline-offset: 4px;
	}
	.patch span {
		display: block;
		padding: 10px 26px 16px;
		border: 3px dashed #faf3dc;
		border-radius: 8px;
		color: #fff8e6;
	}
	.patch strong {
		font-weight: 750;
	}
	@keyframes iron {
		from {
			opacity: 0;
			transform: rotate(-2deg) scale(1.1);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.patch {
			animation: none;
		}
	}
	.tagline {
		margin: 0 0 14px;
		font-family: var(--display);
		font-size: clamp(24px, 6vw, 30px);
		font-weight: 700;
		line-height: 1.2;
		letter-spacing: -0.015em;
		text-wrap: balance;
	}
	.tagline em {
		color: #c8543e;
		font-style: normal;
		text-decoration: underline wavy #e8bd53;
		text-decoration-thickness: 4px;
		text-underline-offset: 8px;
		text-decoration-skip-ink: none;
	}
	.lede {
		margin: 0;
		color: var(--muted);
		font-size: 18px;
		text-wrap: pretty;
	}
	.actions {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: center;
		gap: 20px;
		margin: 32px 0 0;
	}
	.cta {
		display: inline-flex;
		align-items: center;
		height: 52px;
		padding: 0 28px;
		border-radius: 14px;
		background: #c8543e;
		box-shadow: 0 4px 0 #8f3a2a;
		color: #fff8e6;
		font-family: var(--display);
		font-size: 19px;
		font-weight: 600;
		text-decoration: none;
		transition: transform 120ms ease-out, box-shadow 120ms ease-out;
	}
	.cta:active {
		transform: translateY(3px);
		box-shadow: 0 1px 0 #8f3a2a;
	}
	.link {
		color: var(--ink);
		font-size: 14px;
		font-weight: 500;
	}
	.steps {
		padding-bottom: 56px;
	}
	ol {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
		gap: 16px;
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.steps li {
		padding: 20px;
		border-radius: 18px;
		background: var(--tint);
	}
	.num {
		display: inline-grid;
		place-items: center;
		width: 32px;
		height: 32px;
		border-radius: 50%;
		background: var(--solid);
		color: #26335f;
		font-family: var(--display);
		font-size: 16px;
		font-weight: 700;
	}
	h2 {
		margin: 12px 0 4px;
		font-family: var(--display);
		font-size: 22px;
		font-weight: 600;
		line-height: 1.2;
	}
	.steps li p {
		margin: 0;
		color: #3f4770;
		text-wrap: pretty;
	}
	a:focus-visible {
		outline: 2px solid var(--focus);
		outline-offset: 2px;
		border-radius: 4px;
	}
	@media (hover: hover) and (pointer: fine) {
		.cta:hover {
			background: #d0604a;
		}
	}
</style>
