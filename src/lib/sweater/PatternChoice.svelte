<script lang="ts">
	import type { Design } from './garment';
	import { choose } from './options';
	import { chart, CUSTOM_PATTERN, PATTERNS, TILE_ROWS, TILE_ST } from './motifs';
	import MotifEditor from './MotifEditor.svelte';

	let { design = $bindable() }: { design: Design } = $props();

	const cells = (pattern: string, motif: string) => {
		const out: [number, number][] = [];
		if (pattern !== 'Solid')
			for (let j = 0; j < TILE_ROWS; j++) for (let i = 0; i < TILE_ST; i++) if (chart(pattern, i, j, motif)) out.push([i, j]);
		return out;
	};
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
	<MotifEditor bind:design />
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
	.opt:focus-visible {
		outline: 2px solid var(--focus);
		outline-offset: 2px;
	}
	.opt[aria-checked='true'] {
		border-color: #b88a1c;
		background: #e8bd53;
		box-shadow: 0 2px 0 rgb(184 138 28 / 0.55);
		font-weight: 600;
	}
	@media (hover: hover) and (pointer: fine) {
		.opt:not([aria-checked='true']):hover {
			background: var(--wash);
			border-color: var(--ink);
		}
	}
</style>
