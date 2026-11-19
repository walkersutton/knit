<script lang="ts">
	import { onMount, tick } from 'svelte';
	import Author from '$lib/Author.svelte';
	import { patternPath } from '$lib/site';
	import Viewer from '$lib/sweater/Viewer.svelte';
	import { chartDesign, chartSize, isCenterpieceChart } from '$lib/sweater/library';
	import { designDetail } from '$lib/sweater/random';
	import { jpegStill } from '$lib/sweater/still';
	import type { Featured } from '$lib/server/likes';

	type Kind = 'chart' | 'pattern';
	/** The art box's cream; the stored JPEG is set on it so the two read as one. */
	const CREAM = '#f6edd5';

	let picks = $state<Featured>({ chart: null, pattern: null });
	/**
	 * Each favourite as a 3D sweater. The server keeps the picture once any visitor's browser has drawn it; only
	 * the first visitor after a new favourite draws it here, on a hidden scene, and sends it back to be kept.
	 */
	let pictures = $state<Record<Kind, string | null>>({ chart: null, pattern: null });
	/** The off-screen 3D scene, alive only while the pictures are being drawn. */
	let cameraOn = $state(false);
	let camera = $state<Viewer>();
	let section = $state<HTMLElement>();
	let alive = true;

	async function draw() {
		const jobs = [
			picks.pattern && !pictures.pattern && (['pattern', picks.pattern.design] as const),
			picks.chart && !pictures.chart && (['chart', chartDesign(picks.chart.motif, picks.chart.color, picks.chart.contrast)] as const)
		].filter((j) => !!j);
		if (!jobs.length) return;
		cameraOn = true;
		await tick();
		for (const [kind, design] of jobs) {
			const png = await camera?.still(design).catch(() => null);
			if (!alive) return;
			if (!png) continue;
			const image = await jpegStill(png, { width: 640, height: 400, background: CREAM, fill: 0.96 }).catch(() => null);
			if (!alive || !image) continue;
			pictures[kind] = `data:image/jpeg;base64,${image}`;
			// Keeping it is a nicety for the next visitor; this one already sees it.
			fetch('/api/featured', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ kind, image }) }).catch(() => {});
		}
		cameraOn = false;
	}

	onMount(() => {
		let io: IntersectionObserver | undefined;
		(async () => {
			try {
				const res = await fetch('/api/featured');
				if (res.ok) {
					const body: Featured & { pictures?: Record<Kind, string | null> } = await res.json();
					picks = { chart: body.chart, pattern: body.pattern };
					for (const kind of ['chart', 'pattern'] as const) {
						const image = body.pictures?.[kind];
						if (image) pictures[kind] = `data:image/jpeg;base64,${image}`;
					}
				}
			} catch {
				// The favourites are a nicety; the page is complete without them.
			}
			if (!alive || (!picks.chart && !picks.pattern)) return;
			if ((!picks.chart || pictures.chart) && (!picks.pattern || pictures.pattern)) return;
			await tick();
			// Nothing is drawn until the section is about to scroll into view.
			io = new IntersectionObserver(
				([hit]) => {
					if (!hit.isIntersecting) return;
					io?.disconnect();
					draw();
				},
				{ rootMargin: '200px' }
			);
			if (section) io.observe(section);
		})();
		return () => {
			alive = false;
			io?.disconnect();
		};
	});

	const hearts = (n: number) => `♥ ${n} ${n === 1 ? 'like' : 'likes'}`;
</script>

{#if picks.chart || picks.pattern}
	<section class="featured" aria-labelledby="featured-h" bind:this={section}>
		<h2 id="featured-h">Community favourites</h2>
		<div class="cards">
			{#if picks.chart}
				{@const chart = picks.chart}
				<div class="card chart">
					<div class="art sweater">
						{#if pictures.chart}
							<img src={pictures.chart} alt={isCenterpieceChart(chart.motif) ? `${chart.name}, a centerpiece on the front of a sweater` : `A sweater knitted all over in ${chart.name}`} />
						{:else}
							<div class="waiting" role="img" aria-label="{chart.name}, being drawn as a sweater"></div>
						{/if}
					</div>
					<p class="kind">Favourite {isCenterpieceChart(chart.motif) ? 'centerpiece' : 'chart'}</p>
					<h3><a class="open" href="/chart/{chart.id}">{chart.name}</a></h3>
					<p class="meta">{chartSize(chart.motif)} · by <span class="by"><Author name={chart.author} photo={chart.authorPhoto} /></span> · {hearts(chart.likes)}</p>
				</div>
			{/if}
			{#if picks.pattern}
				{@const pattern = picks.pattern}
				<div class="card pattern">
					<div class="art sweater">
						{#if pictures.pattern}
							<img src={pictures.pattern} alt="{pattern.name}, a sweater in {pattern.design.color} with {pattern.design.contrast} trim" />
						{:else}
							<div class="waiting" role="img" aria-label="{pattern.name}, being drawn as a sweater"></div>
						{/if}
					</div>
					<p class="kind">Favourite pattern</p>
					<h3><a class="open" href={patternPath(pattern)}>{pattern.name}</a></h3>
					<p class="detail">{designDetail(pattern.design)}</p>
					<p class="meta">by <span class="by"><Author name={pattern.author} photo={pattern.authorPhoto} /></span> · {hearts(pattern.likes)}</p>
				</div>
			{/if}
		</div>
		{#if cameraOn}
			<!-- An off-screen camera that draws the sweaters; never shown, and gone once they are drawn. -->
			<div class="camera" aria-hidden="true"><Viewer bind:this={camera} onview={() => {}} intro={false} /></div>
		{/if}
	</section>
{/if}

<style>
	.featured {
		max-width: 760px;
		width: 100%;
		margin: 0 auto;
		padding: 0 16px 48px;
		color: #26335f;
		text-align: center;
	}
	h2 {
		margin: 0 0 16px;
		font-family: var(--display);
		font-size: 22px;
		font-weight: 600;
		line-height: 1.2;
	}
	.cards {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
		gap: 16px;
	}
	.card {
		position: relative;
		display: flex;
		flex-direction: column;
		gap: 4px;
		padding: 16px;
		border-radius: 18px;
		color: inherit;
		text-align: left;
		transition: transform 160ms cubic-bezier(0.23, 1, 0.32, 1);
	}
	.chart {
		background: #f4d5c3;
	}
	.pattern {
		background: #d7e4d3;
	}
	.art {
		overflow: hidden;
		margin-bottom: 8px;
		border-radius: 10px;
		box-shadow: 0 0 0 1px rgb(38 51 95 / 0.15);
	}
	.sweater {
		background: #f6edd5;
		padding: 8px;
	}
	.sweater img {
		display: block;
		width: 100%;
		height: 200px;
		object-fit: contain;
	}
	/* Holds the picture's place, so the card does not jump when the sweater arrives. */
	.waiting {
		height: 200px;
	}
	.camera {
		position: absolute;
		left: -10000px;
		top: 0;
		width: 360px;
		height: 414px;
		pointer-events: none;
	}
	.kind {
		margin: 0;
		color: #8f3a2a;
		font-size: 12px;
		font-weight: 600;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}
	h3 {
		margin: 0;
		font-family: var(--display);
		font-size: 20px;
		font-weight: 600;
		overflow-wrap: anywhere;
	}
	.detail,
	.meta {
		margin: 0;
		color: #3f4770;
		font-size: 14px;
	}
	/* The title link covers the card; the author link sits above it so both can be clicked. */
	.open {
		color: inherit;
		text-decoration: none;
	}
	.open::after {
		content: '';
		position: absolute;
		inset: 0;
		border-radius: 18px;
	}
	.by {
		position: relative;
		z-index: 1;
	}
	.card:has(.open:focus-visible) {
		outline: 3px solid var(--focus);
		outline-offset: 4px;
	}
	@media (hover: hover) and (pointer: fine) {
		.card:hover {
			transform: translateY(-3px);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.card {
			transition: none;
		}
	}
</style>
