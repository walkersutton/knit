<script lang="ts">
	import { onMount, tick } from 'svelte';
	import Author from '$lib/Author.svelte';
	import { patternPath } from '$lib/site';
	import MotifSwatch from '$lib/sweater/MotifSwatch.svelte';
	import Viewer from '$lib/sweater/Viewer.svelte';
	import { designName } from '$lib/sweater/random';
	import { jpegStill } from '$lib/sweater/still';
	import type { Featured, FeaturedChart, FeaturedPattern } from '$lib/server/likes';

	/** The art box's cream; the stored JPEG is set on it so the two read as one. */
	const CREAM = '#f6edd5';

	let picks = $state<Featured>({ patterns: [], charts: [], centerpieces: [] });
	/**
	 * Each favourite pattern as a 3D garment, by pattern id. The server keeps a picture once any visitor's browser
	 * has drawn it; only the first visitor after a new favourite draws it here, on a hidden scene, and sends it back.
	 * Charts and centerpieces need no picture: they are shown as the chart itself.
	 */
	let pictures = $state<Record<string, string>>({});
	/** The off-screen 3D scene, alive only while the pictures are being drawn. */
	let cameraOn = $state(false);
	let camera = $state<Viewer>();
	let section = $state<HTMLElement>();
	let alive = true;

	const missing = () => picks.patterns.filter((p) => !pictures[p.id]);

	async function draw() {
		const todo = missing();
		if (!todo.length) return;
		cameraOn = true;
		await tick();
		for (const p of todo) {
			const png = await camera?.still(p.design).catch(() => null);
			if (!alive) return;
			if (!png) continue;
			// Cropped to the garment and square, so it fills its shelf card.
			const image = await jpegStill(png, { width: 480, height: 480, background: CREAM, fill: 0.88, trim: true }).catch(() => null);
			if (!alive || !image) continue;
			pictures[p.id] = `data:image/jpeg;base64,${image}`;
			// Keeping it is a nicety for the next visitor; this one already sees it.
			fetch('/api/featured', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: p.id, image }) }).catch(() => {});
		}
		cameraOn = false;
	}

	onMount(() => {
		let io: IntersectionObserver | undefined;
		(async () => {
			try {
				const res = await fetch('/api/featured');
				if (res.ok) {
					const body: Featured & { pictures?: Record<string, string | null> } = await res.json();
					picks = { patterns: body.patterns ?? [], charts: body.charts ?? [], centerpieces: body.centerpieces ?? [] };
					for (const [id, image] of Object.entries(body.pictures ?? {})) if (image) pictures[id] = `data:image/jpeg;base64,${image}`;
				}
			} catch {
				// The favourites are a nicety; the page is complete without them.
			}
			if (!alive || !missing().length) return;
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

	let any = $derived(picks.patterns.length + picks.charts.length + picks.centerpieces.length > 0);
	let shelves = $derived([
		{ label: 'Charts', blurb: 'Repeats to knit all over', items: picks.charts, all: '/chart', tone: '#f4d5c3' },
		{ label: 'Centerpieces', blurb: 'One picture on the front', items: picks.centerpieces, all: '/chart', tone: '#f6e2a4' }
	]);
</script>

{#snippet card(href: string, name: string, item: FeaturedPattern | FeaturedChart, art: import('svelte').Snippet)}
	<li class="card">
		<div class="art">{@render art()}</div>
		<a class="open" {href}>{name}</a>
		<span class="meta"><span class="by"><Author name={item.author} photo={item.authorPhoto} /></span></span>
		<span class="meta">{hearts(item.likes)}</span>
	</li>
{/snippet}

{#if any}
	<section class="featured" aria-labelledby="featured-h" bind:this={section}>
		<h2 id="featured-h">Community favourites</h2>
		{#if picks.patterns.length}
			<div class="shelf" style="--tint: #d7e4d3">
				<div class="head">
					<h3>Patterns<span>Whole garments, ready to knit</span></h3>
					<a href="/patterns">See all</a>
				</div>
				<ol class="rail" aria-label="Favourite patterns">
					{#each picks.patterns as p (p.id)}
						{#snippet art()}
							{#if pictures[p.id]}
								<img src={pictures[p.id]} alt="{p.name}: {designName(p.design).toLowerCase()}" />
							{:else}
								<div class="waiting" role="img" aria-label="{p.name}, being drawn"></div>
							{/if}
						{/snippet}
						{@render card(patternPath(p), p.name, p, art)}
					{/each}
				</ol>
			</div>
		{/if}
		{#each shelves as s (s.label)}
			{#if s.items.length}
				<div class="shelf" style="--tint: {s.tone}">
					<div class="head">
						<h3>{s.label}<span>{s.blurb}</span></h3>
						<a href={s.all}>See all</a>
					</div>
					<ol class="rail" aria-label="Favourite {s.label.toLowerCase()}">
						{#each s.items as c (c.id)}
							{#snippet art()}
								<MotifSwatch motif={c.motif} color={c.color} contrast={c.contrast} across={3} down={2} label="{c.name}, as a chart" />
							{/snippet}
							{@render card(`/chart/${c.id}`, c.name, c, art)}
						{/each}
					</ol>
				</div>
			{/if}
		{/each}
		{#if cameraOn}
			<!-- An off-screen camera that draws the garments; never shown, and gone once they are drawn. -->
			<div class="camera" aria-hidden="true"><Viewer bind:this={camera} onview={() => {}} intro={false} /></div>
		{/if}
	</section>
{/if}

<style>
	.featured {
		position: relative;
		max-width: 912px;
		width: 100%;
		margin: 0 auto;
		padding: 0 0 48px;
		color: #26335f;
	}
	h2 {
		margin: 0 0 8px;
		padding: 0 16px;
		font-family: var(--display);
		font-size: 22px;
		font-weight: 600;
		line-height: 1.2;
		text-align: center;
	}
	.shelf {
		margin-top: 16px;
	}
	.head {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 12px;
		padding: 0 16px 8px;
	}
	h3 {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 4px 10px;
		margin: 0;
		font-family: var(--display);
		font-size: 18px;
		font-weight: 600;
	}
	h3 span {
		color: #5d6385;
		font-family: system-ui, -apple-system, sans-serif;
		font-size: 13px;
		font-weight: 400;
	}
	.head a {
		flex: none;
		color: #26335f;
		font-size: 14px;
		font-weight: 500;
	}
	/* Five to a row on a wide screen; on a narrow one the row scrolls sideways, a card at a time. */
	.rail {
		display: grid;
		grid-auto-flow: column;
		grid-auto-columns: minmax(160px, calc((100% - 4 * 12px - 32px) / 5));
		gap: 12px;
		margin: 0;
		padding: 4px 16px 10px;
		overflow-x: auto;
		overscroll-behavior-x: contain;
		scroll-snap-type: x mandatory;
		scroll-padding-inline: 16px;
		scrollbar-width: thin;
		list-style: none;
	}
	.card {
		position: relative;
		display: flex;
		flex-direction: column;
		gap: 2px;
		padding: 8px 8px 10px;
		border-radius: 14px;
		background: var(--tint);
		scroll-snap-align: start;
		transition: transform 160ms cubic-bezier(0.23, 1, 0.32, 1);
	}
	.art {
		display: grid;
		place-items: center;
		aspect-ratio: 1;
		margin-bottom: 6px;
		overflow: hidden;
		border-radius: 10px;
		background: #f6edd5;
		box-shadow: 0 0 0 1px rgb(38 51 95 / 0.15);
	}
	.art > :global(*) {
		display: block;
		width: 100%;
		height: 100%;
	}
	.art img {
		object-fit: cover;
		animation: in 200ms ease-out;
	}
	@keyframes in {
		from {
			opacity: 0;
		}
	}
	.camera {
		position: absolute;
		left: -10000px;
		top: 0;
		width: 360px;
		height: 414px;
		pointer-events: none;
	}
	.open {
		color: inherit;
		font-family: var(--display);
		font-size: 16px;
		font-weight: 600;
		line-height: 1.25;
		text-decoration: none;
		overflow-wrap: anywhere;
	}
	/* The title link covers the card; the author link sits above it so both can be clicked. */
	.open::after {
		content: '';
		position: absolute;
		inset: 0;
		border-radius: 14px;
	}
	.meta {
		color: #3f4770;
		font-size: 13px;
	}
	.by {
		position: relative;
		z-index: 1;
	}
	.card:has(.open:focus-visible) {
		outline: 3px solid var(--focus);
		outline-offset: 3px;
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
		.art img {
			animation: none;
		}
	}
</style>
