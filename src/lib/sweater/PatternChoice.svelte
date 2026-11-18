<script lang="ts">
	import { onMount } from 'svelte';
	import type { Design } from './garment';
	import { loadLibrary, type SavedPattern } from './library';
	import { choose } from './options';
	import { chart, chartFit, CUSTOM_PATTERN, FINE_GAUGE, FINE_TILE, PATTERNS, resizeMotif, STANDARD_TILE, TILE_ROWS, TILE_ST } from './motifs';
	import { stitchGauge } from './needles';
	import MotifSwatch from './MotifSwatch.svelte';

	let { design = $bindable(), onedit }: { design: Design; onedit: (motif: string) => void } = $props();

	const cells = (pattern: string, motif: string) => {
		const out: [number, number][] = [];
		if (pattern !== 'Solid')
			for (let j = 0; j < TILE_ROWS; j++) for (let i = 0; i < TILE_ST; i++) if (chart(pattern, i, j, motif)) out.push([i, j]);
		return out;
	};

	/** A chart drawn for finer or coarser yarn than the one chosen on the Yarn step. */
	let fit = $derived(design.pattern === CUSTOM_PATTERN ? chartFit(design.motif, stitchGauge(design)) : undefined);
	let gauge = $derived(stitchGauge(design));

	/** The knitter's own charts, from the pattern designer. */
	let saved = $state<SavedPattern[]>([]);
	onMount(() => (saved = loadLibrary().patterns));
</script>

<div class="grid" role="radiogroup" aria-label="Pattern">
	{#each PATTERNS as p (p)}
		<button type="button" class="opt" role="radio" aria-checked={design.pattern === p} onclick={() => choose(design, 'pattern', p)}>
			<svg viewBox="0 0 {TILE_ST} {TILE_ROWS}" width="36" height="48" shape-rendering="crispEdges" aria-hidden="true">
				<rect width={TILE_ST} height={TILE_ROWS} fill={design.color} />
				{#each cells(p, design.motif) as [x, y] (`${x}-${y}`)}<rect {x} {y} width="1" height="1" fill={design.contrast} />{/each}
				{#if p === CUSTOM_PATTERN && !design.motif}<text x="6" y="10" text-anchor="middle" font-size="9" fill={design.contrast}>+</text>{/if}
			</svg>
			<span>{p}</span>
		</button>
	{/each}
</div>
{#if design.pattern === CUSTOM_PATTERN}
	<div class="custom">
		{#if saved.length}
			<div class="saved" role="radiogroup" aria-label="Your patterns">
				{#each saved as p (p.id)}
					<button type="button" class="pick" role="radio" aria-checked={design.motif === p.motif} title={p.name} onclick={() => (design.motif = p.motif)}>
						<span class="thumb"><MotifSwatch motif={p.motif} color={design.color} contrast={design.contrast} /></span>
						<span class="name">{p.name}</span>
					</button>
				{/each}
			</div>
		{/if}
		{#if fit}
			<div class="nudge" role="note">
				{#if fit === 'too-fine'}
					<p>
						This is a fine chart (24 × 32) but your yarn knits at {gauge} stitches per 4 in. Fine charts suit {FINE_GAUGE} or more, so the stitches will be tiny and the floats short. Try fingering weight or a thinner needle, or
						<button type="button" onclick={() => (design.motif = resizeMotif(design.motif, STANDARD_TILE))}>use the standard size</button>.
					</p>
				{:else}
					<p>
						Your yarn knits at {gauge} stitches per 4 in, fine enough for a detailed chart, but this one is standard (12 × 16) and will look chunky.
						<button type="button" onclick={() => (design.motif = resizeMotif(design.motif, FINE_TILE))}>Redraw it as fine</button>
						to refine it in the pattern designer.
					</p>
				{/if}
				<p class="sub">This only changes the chart on this sweater, not the one saved in your patterns.</p>
			</div>
		{/if}
		<button type="button" class="edit" onclick={() => onedit(design.motif)}>Open the chart designer <span aria-hidden="true">→</span></button>
		<p class="hint">Paint your own chart full-screen, keep as many as you like, then bring one back here.</p>
	</div>
{/if}

<style>
	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(84px, 1fr));
		gap: 6px;
	}
	.opt {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 5px;
		padding: 8px 4px 6px;
		border: 1px solid var(--line-strong, var(--line));
		border-radius: 4px;
		background: var(--surface);
		box-shadow: 0 2px 0 var(--line);
		color: var(--ink);
		font: inherit;
		font-size: 0.85em;
		font-weight: 500;
		cursor: pointer;
		transition: background-color 120ms ease-out, border-color 120ms ease-out, transform 120ms ease-out;
	}
	svg {
		border-radius: 2px;
	}
	.opt:active {
		transform: translateY(2px);
		box-shadow: none;
	}
	.opt:focus-visible,
	.pick:focus-visible,
	.edit:focus-visible {
		outline: 2px solid var(--focus);
		outline-offset: 2px;
	}
	.opt[aria-checked='true'] {
		border-color: #465e9d;
		background: #465e9d;
		color: var(--on-ink);
		box-shadow: 0 2px 0 rgb(70 94 157 / 0.55);
		font-weight: 600;
	}
	.custom {
		display: grid;
		gap: 8px;
		margin-top: 10px;
		padding: 10px;
		border: 1px solid var(--line);
		border-radius: 6px;
		background: var(--wash);
	}
	.saved {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}
	.pick {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 3px;
		width: 64px;
		padding: 5px 4px 4px;
		border: 1px solid var(--line-strong, var(--line));
		border-radius: 4px;
		background: var(--surface);
		color: var(--ink);
		font: inherit;
		font-size: 11px;
		cursor: pointer;
	}
	.pick[aria-checked='true'] {
		border-color: #465e9d;
		background: #465e9d;
		color: var(--on-ink);
		font-weight: 600;
	}
	.thumb {
		width: 27px;
		overflow: hidden;
		border-radius: 2px;
	}
	.name {
		max-width: 100%;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.edit {
		justify-self: start;
		padding: 0;
		border: 0;
		background: none;
		color: var(--accent-deep, var(--ink));
		font: inherit;
		font-weight: 600;
		cursor: pointer;
	}
	.nudge {
		display: grid;
		gap: 4px;
		padding: 8px 10px;
		border: 1px solid #b88a1c;
		border-radius: 4px;
		background: #fbf0cf;
		color: var(--ink);
		font-size: 12px;
	}
	.nudge p {
		margin: 0;
	}
	.nudge .sub {
		color: var(--muted);
	}
	.nudge button {
		padding: 0;
		border: 0;
		background: none;
		color: var(--accent-deep, var(--ink));
		font: inherit;
		font-weight: 600;
		text-decoration: underline;
		cursor: pointer;
	}
	.nudge button:focus-visible {
		outline: 2px solid var(--focus);
		outline-offset: 2px;
	}
	.hint {
		margin: 0;
		color: var(--muted);
		font-size: 12px;
	}
	@media (hover: hover) and (pointer: fine) {
		.opt:not([aria-checked='true']):hover,
		.pick:not([aria-checked='true']):hover {
			background: var(--wash);
			border-color: var(--ink);
		}
		.edit:hover {
			text-decoration: underline;
		}
	}
</style>
