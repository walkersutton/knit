<script lang="ts">
	import Seo from '$lib/Seo.svelte';
	import YourWork from '$lib/sweater/YourWork.svelte';
	import { onMount, tick, untrack } from 'svelte';
	import ChartCard from '$lib/sweater/ChartCard.svelte';
	import Viewer from '$lib/sweater/Viewer.svelte';
	import { chartDesign, GARMENTS } from '$lib/sweater/library';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	// ── Each chart knitted into the garment the knitter picks ──
	const GARMENT_KEY = 'knit-it:chart-garment:v1';
	let garment = $state('Sweater');
	/** Drawn pictures, by garment and chart; a chart keeps its picture while it is on the page. */
	let pictures = $state<Record<string, string>>({});
	const key = (g: string, id: string) => `${g}|${id}`;
	/** The off-screen 3D scene, alive only while there are pictures to draw. */
	let cameraOn = $state(false);
	let camera = $state<Viewer>();
	let mounted = $state(false);
	let alive = true;
	let run = 0;

	onMount(() => {
		try {
			const saved = localStorage.getItem(GARMENT_KEY);
			if (saved && GARMENTS.includes(saved)) garment = saved;
		} catch {
			// No storage: the sweater it is.
		}
		mounted = true;
		return () => {
			alive = false;
			Object.values(pictures).forEach((u) => URL.revokeObjectURL(u));
		};
	});

	function pick(next: string) {
		garment = next;
		try {
			localStorage.setItem(GARMENT_KEY, next);
		} catch {
			// The choice just isn't remembered.
		}
	}

	/** Draw, one at a time, every chart on the page not yet drawn on this garment. A newer call takes over. */
	async function draw(g: string, charts: typeof data.charts) {
		const mine = ++run;
		const todo = charts.filter((c) => !pictures[key(g, c.id)]);
		if (!todo.length) return;
		cameraOn = true;
		await tick();
		for (const c of todo) {
			if (!alive || mine !== run) return;
			const blob = await camera?.still(chartDesign(c.motif, c.color, c.contrast, g)).catch(() => null);
			if (!alive) return;
			if (blob) pictures[key(g, c.id)] = URL.createObjectURL(blob);
		}
		if (mine === run) cameraOn = false;
	}
	$effect(() => {
		const [g, charts] = [garment, data.charts];
		// Only a new garment or a new page of charts starts drawing again, not each picture as it lands.
		if (mounted) untrack(() => draw(g, charts));
	});

	/** The same search, a page along. */
	const href = (page: number) => {
		const p = new URLSearchParams();
		if (data.q) p.set('q', data.q);
		if (data.size) p.set('size', data.size);
		if (page) p.set('page', String(page));
		const s = p.toString();
		return s ? `?${s}` : '?';
	};
	let filtered = $derived(Boolean(data.q || data.size));
</script>

<Seo title="Colourwork charts — knit" description="Browse two-colour knitting charts shared by knitters, and put any of them on your own sweater with a free written pattern." path="/chart" />

<main>
	<p class="eyebrow">Shared by knitters</p>
	<div class="head">
		<h1>Charts</h1>
		<a class="stitch new" href="/design#tool=chart">Design a new chart</a>
	</div>
	<YourWork kind="chart" />
	<div class="shown">
		<span id="shown-on">Show on</span>
		<div class="seg" role="radiogroup" aria-labelledby="shown-on">
			{#each GARMENTS as g (g)}
				<button type="button" role="radio" aria-checked={garment === g} onclick={() => pick(g)}>{g}</button>
			{/each}
		</div>
	</div>
	<form role="search" method="get">
		<input type="search" name="q" value={data.q} placeholder="Search by name or knitter" aria-label="Search charts" />
		<select name="size" aria-label="Chart size">
			<option value="">All charts</option>
			{#each data.sizes as s (s.value)}<option value={s.value} selected={s.value === data.size}>{s.label}</option>{/each}
		</select>
		<button type="submit" class="stitch">Search</button>
	</form>

	{#if data.unavailable}
		<p class="empty">The chart library is not available right now. Try again in a little while.</p>
	{:else if !data.charts.length}
		<p class="empty">
			{#if filtered}Nothing matches that. <a href="/chart">See every chart</a>.{:else}Nobody has shared a chart yet. <a href="/design#tool=chart">Draw one</a> and be the first.{/if}
		</p>
	{:else}
		<ul>
			{#each data.charts as c (c.id)}
				<ChartCard chart={c} garment={mounted ? garment : undefined} picture={pictures[key(garment, c.id)]} />
			{/each}
		</ul>
		<nav class="pages" aria-label="More charts">
			{#if data.page > 0}<a href={href(data.page - 1)} rel="prev">← Newer</a>{/if}
			{#if data.more}<a href={href(data.page + 1)} rel="next">Older →</a>{/if}
		</nav>
	{/if}
	{#if cameraOn}
		<!-- An off-screen camera that draws the garments; never shown, and gone once they are drawn. -->
		<div class="camera" aria-hidden="true"><Viewer bind:this={camera} onview={() => {}} intro={false} /></div>
	{/if}
</main>

<style>
	main {
		--ink: #26335f;
		--muted: #5d6385;
		--line-strong: #c9bb92;
		--surface: #fbf5e4;
		--wash: #f3e9c9;
		--accent: #c8543e;
		--accent-deep: #8f3a2a;
		max-width: 912px;
		flex: 1;
		margin: 0 auto;
		padding: 24px 16px 64px;
		color: var(--ink);
		font-family: system-ui, -apple-system, 'SF Pro Text', 'Segoe UI', Roboto, sans-serif;
	}
	.eyebrow {
		margin: 0 0 6px;
		color: var(--accent-deep);
		font-size: 12px;
		font-weight: 600;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}
	.head {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		margin-bottom: 20px;
	}
	h1 {
		margin: 0;
		font-family: var(--display);
		font-size: 36px;
		font-weight: 600;
	}
	.shown {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 8px 12px;
		margin-bottom: 12px;
		color: var(--muted);
		font-size: 13px;
		font-weight: 500;
	}
	.seg {
		display: flex;
		flex-wrap: wrap;
		padding: 2px;
		border: 1px solid var(--line-strong);
		border-radius: 9px;
		background: var(--wash);
	}
	.seg button {
		height: 32px;
		padding: 0 12px;
		border: 0;
		border-radius: 7px;
		background: none;
		color: var(--ink);
		font: inherit;
		font-weight: 500;
		cursor: pointer;
		transition: background-color 120ms ease-out;
	}
	.seg button[aria-checked='true'] {
		background: #fffdf6;
		box-shadow: 0 1px 2px rgb(38 51 95 / 0.2);
	}
	.camera {
		position: absolute;
		left: -10000px;
		top: 0;
		width: 240px;
		height: 276px;
		pointer-events: none;
	}
	form {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		margin-bottom: 24px;
	}
	input,
	select {
		height: 40px;
		border: 1.5px solid var(--line-strong);
		border-radius: 8px;
		background: #fffdf6;
		color: var(--ink);
		font: inherit;
	}
	input {
		flex: 1 1 240px;
		padding: 0 12px;
	}
	select {
		padding: 0 10px;
	}
	.stitch {
		height: 40px;
	}
	input:focus-visible,
	select:focus-visible,
	button:focus-visible,
	.pages a:focus-visible {
		outline: 2px solid var(--focus);
		outline-offset: 2px;
	}
	ul {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
		gap: 12px;
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.empty {
		color: var(--muted);
	}
	.empty a,
	.pages a {
		color: var(--link, #3d5aa8);
	}
	.pages {
		display: flex;
		justify-content: space-between;
		margin-top: 24px;
	}
	@media (hover: hover) and (pointer: fine) {
		.seg button[aria-checked='false']:hover {
			background: rgb(255 253 246 / 0.6);
		}
	}
</style>
