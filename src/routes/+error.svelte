<script lang="ts">
	import { page } from '$app/state';
	import Logo from '$lib/Logo.svelte';
	import { SITE } from '$lib/site';

	let status = $derived(page.status);
	let path = $derived(page.url.pathname);
	let missing = $derived(status === 404);

	// A swatch of stockinette in the favicon's stitch. One column has dropped and run down,
	// leaving a ladder of bare strands where its stitches were.
	const COLS = 11;
	const ROWS = 8;
	const W = 18;
	const H = 11.5;
	const DROP = 5; // the column that runs
	const RUN = 6; // how many rows it runs before it catches
	const x = (c: number) => 18 + c * W;
	const y = (r: number) => 22 + r * H;
	const STITCH = 'M0 0C-7 -4 -10.5 -12 -9.5 -18.5C-9 -21.5 -5.5 -21.5 -4 -19C-1.5 -14.5 0 -8 0 0Z';
</script>

<svelte:head>
	<title>{missing ? 'Page not found' : 'Something went wrong'} — {SITE.name}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="page">
	<a class="mark" href="/" aria-label="knit home"><Logo size={24} /></a>
	<main>
		<svg class="swatch" viewBox="0 0 {COLS * W + 18} {y(ROWS - 1) + 10}" role="img" aria-label="A knitted swatch with one dropped stitch running down it">
			<defs>
				<g id="stitch-v"><path d={STITCH} /><path d={STITCH} transform="scale(-1 1)" /></g>
			</defs>
			<rect width="100%" height="100%" rx="10" class="ground" />
			{#each { length: ROWS }, r}
				{#each { length: COLS }, c}
					{#if c === DROP && r < RUN}
						<g class="dropped" style="--i: {r}">
							<use href="#stitch-v" transform="translate({x(c)} {y(r)}) scale(.85 .52)" />
						</g>
						<line class="rung" style="--i: {r}" x1={x(c) - 6} x2={x(c) + 6} y1={y(r) - 5} y2={y(r) - 5} />
					{:else}
						<use class="st" href="#stitch-v" transform="translate({x(c)} {y(r)}) scale(.85 .52)" />
					{/if}
				{/each}
			{/each}
		</svg>

		<p class="eyebrow">{status} · {missing ? 'Dropped stitch' : 'Snagged'}</p>
		<h1>{missing ? 'This page ran off the needle' : 'Something snagged'}</h1>
		{#if missing}
			<p class="lede">There’s nothing at <code>{path}</code>. The rest of the site is still on the needle.</p>
		{:else}
			<p class="lede">The page couldn’t load. Give it a moment and try again.</p>
		{/if}
		<p class="actions"><a class="cta" href="/design">Pick it back up</a><a class="link" href="/about">How knit works</a></p>
	</main>
</div>

<style>
	.page {
		display: flex;
		flex-direction: column;
		min-height: 100dvh;
		padding: 0 16px;
		font-size: 15px;
		line-height: 1.6;
	}
	.mark {
		align-self: flex-start;
		display: flex;
		align-items: center;
		height: 44px;
		color: var(--ink);
		font-size: 13px;
		font-weight: 600;
		text-decoration: none;
	}
	main {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		max-width: 440px;
		margin: 0 auto;
		padding: 32px 0 96px;
		text-align: center;
	}
	.swatch {
		width: min(300px, 100%);
		height: auto;
		margin-bottom: 32px;
	}
	.ground {
		fill: #465e9d;
	}
	.st,
	.dropped {
		fill: #faf3dc;
	}
	.dropped {
		transform-box: fill-box;
		transform-origin: center;
		animation: unravel 220ms cubic-bezier(0.23, 1, 0.32, 1) forwards;
		animation-delay: calc(350ms + var(--i) * 80ms);
	}
	.rung {
		stroke: #faf3dc;
		stroke-width: 1.4;
		stroke-linecap: round;
		opacity: 0;
		transform-box: fill-box;
		transform-origin: center;
		transform: scaleX(0.3);
		animation: rung 220ms cubic-bezier(0.23, 1, 0.32, 1) forwards;
		animation-delay: calc(400ms + var(--i) * 80ms);
	}
	@keyframes unravel {
		to {
			opacity: 0;
			transform: translateY(5px) scale(0.7);
		}
	}
	@keyframes rung {
		to {
			opacity: 0.75;
			transform: scaleX(1);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.dropped {
			animation: none;
			opacity: 0;
		}
		.rung {
			animation: none;
			opacity: 0.75;
			transform: none;
		}
	}
	.eyebrow {
		margin: 0 0 8px;
		color: var(--muted);
		font-size: 13px;
		font-variant-numeric: tabular-nums;
	}
	h1 {
		font-family: var(--display);
		margin: 0 0 12px;
		font-size: 28px;
		font-weight: 650;
		line-height: 1.2;
		letter-spacing: -0.01em;
		text-wrap: balance;
	}
	.lede {
		margin: 0;
		color: var(--muted);
		font-size: 17px;
		text-wrap: pretty;
	}
	code {
		padding: 1px 5px;
		border-radius: 4px;
		background: var(--wash);
		color: var(--ink);
		font: 14px ui-monospace, SFMono-Regular, Menlo, monospace;
		overflow-wrap: anywhere;
	}
	.actions {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: center;
		gap: 16px;
		margin: 28px 0 0;
	}
	.cta {
		display: inline-flex;
		align-items: center;
		height: 40px;
		padding: 0 18px;
		border-radius: 6px;
		background: var(--ink);
		color: #fff;
		font-size: 14px;
		font-weight: 500;
		text-decoration: none;
		transition: background-color 120ms ease-out, transform 120ms ease-out;
	}
	.cta:active {
		transform: scale(0.97);
	}
	.link {
		color: var(--ink);
		font-size: 14px;
	}
	a:focus-visible {
		outline: 2px solid var(--focus);
		outline-offset: 2px;
		border-radius: 4px;
	}
	@media (hover: hover) and (pointer: fine) {
		.cta:hover {
			background: #3f3f46;
		}
	}
</style>
