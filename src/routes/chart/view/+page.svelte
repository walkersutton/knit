<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import Seo from '$lib/Seo.svelte';
	import Stage from '$lib/sweater/Stage.svelte';
	import { DEFAULT_DESIGN } from '$lib/sweater/defaults';
	import type { Design } from '$lib/sweater/garment';
	import { chartDesign, designLink, editLink, GARMENTS, previewLink, readMotifHash } from '$lib/sweater/library';
	import { tileOfMotif } from '$lib/sweater/motifs';

	/** A chart that is not shared: it travels in the link's hash (#motif=…&color=…&contrast=…), so nothing is stored. */

	let chart = $state<{ motif: string; color: string; contrast: string }>();
	let garment = $state(GARMENTS[0]);
	let sharedId = $state<string>();
	let ready = $state(false);

	let design = $derived<Design | undefined>(chart && chartDesign(chart.motif, chart.color, chart.contrast, garment));
	let tile = $derived(tileOfMotif(chart?.motif));

	function read() {
		const found = readMotifHash(location.hash);
		if (!found) return false;
		chart = { motif: found.motif, color: found.color ?? DEFAULT_DESIGN.color, contrast: found.contrast ?? DEFAULT_DESIGN.contrast };
		const q = new URLSearchParams(location.hash.slice(1));
		sharedId = q.get('id') ?? undefined;
		const g = q.get('garment');
		if (g && GARMENTS.includes(g)) garment = g;
		return true;
	}

	onMount(() => {
		// Opened without a chart (a mistyped or old link): the chart library has the real ones.
		if (!read()) goto('/chart', { replaceState: true });
		ready = true;
	});

	/** Keep the link current, so copying the address shares what is on screen. */
	function pick(next: string) {
		garment = next;
		if (chart) history.replaceState(null, '', previewLink(chart.motif, chart.color, chart.contrast, next, sharedId));
	}
</script>

<svelte:window onhashchange={read} />

<Seo title="Chart on a sweater — knit" description="See a knitting chart on a 3D sweater before you cast on." path="/chart/view" noindex />

<main>
	{#if design && chart}
		<div class="stage"><Stage {design} intro={false} /></div>
		<aside>
			<h1>Chart preview</h1>
			<p class="meta">{tile.st} × {tile.rows}{tile.fine ? ' · fine' : ''}</p>
			<div class="segment" role="radiogroup" aria-label="Garment">
				{#each GARMENTS as g}
					<button type="button" role="radio" aria-checked={garment === g} onclick={() => pick(g)}>{g}</button>
				{/each}
			</div>
			<a class="use" href={designLink(chart.motif, chart.color, chart.contrast)}>Use on my sweater</a>
			<a class="btn" href={editLink(chart.motif)}>Edit chart</a>
			{#if sharedId}<a class="btn" href="/chart/{encodeURIComponent(sharedId)}">Chart details</a>{/if}
		</aside>
	{:else if !ready}
		<p class="meta">Loading…</p>
	{/if}
</main>

<style>
	main {
		--ink: #26335f;
		--muted: #5d6385;
		--line-strong: #c9bb92;
		--wash: #f3e9c9;
		--accent: #c8543e;
		--accent-deep: #8f3a2a;
		display: grid;
		grid-template-columns: minmax(0, 1fr) 280px;
		height: calc(100dvh - var(--bar));
		color: var(--ink);
		font-family: system-ui, -apple-system, 'SF Pro Text', 'Segoe UI', Roboto, sans-serif;
	}
	.stage {
		position: relative;
		min-height: 320px;
	}
	aside {
		display: flex;
		flex-direction: column;
		gap: 10px;
		padding: 24px 16px;
	}
	h1 {
		margin: 0;
		font-family: var(--display);
		font-size: 28px;
		font-weight: 600;
	}
	.meta {
		margin: 0;
		font-size: 13px;
		color: var(--muted);
	}
	.segment {
		display: flex;
		flex-wrap: wrap;
		gap: 5px;
	}
	button,
	.btn,
	.use {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-height: 40px;
		padding: 0 14px;
		border: 1.5px solid var(--line-strong);
		border-radius: 8px;
		background: #fffdf6;
		color: var(--ink);
		font: inherit;
		text-decoration: none;
		cursor: pointer;
	}
	button[aria-checked='true'] {
		border-color: var(--accent-deep);
		background: var(--wash);
		font-weight: 600;
	}
	.use {
		border-color: var(--accent-deep);
		background: var(--accent);
		color: #fff8e6;
		font-weight: 500;
	}
	button:active,
	.btn:active,
	.use:active {
		filter: brightness(0.93);
	}
	button:focus-visible,
	.btn:focus-visible,
	.use:focus-visible {
		outline: 2px solid var(--focus);
		outline-offset: 2px;
	}
	@media (hover: hover) and (pointer: fine) {
		button:hover,
		.btn:hover {
			background: var(--wash);
		}
	}
	@media (max-width: 720px) {
		main {
			grid-template-columns: minmax(0, 1fr);
			grid-template-rows: minmax(320px, 55dvh) auto;
			height: auto;
		}
	}
</style>
