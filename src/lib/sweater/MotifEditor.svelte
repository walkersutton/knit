<script lang="ts">
	import type { Design } from './garment';
	import { blankMotif, longestFloat, starterMotif, TILE_ROWS, TILE_ST, validMotif } from './motifs';

	let { design = $bindable() }: { design: Design } = $props();

	const CELL = 22;
	let motif = $derived(validMotif(design.motif) ? design.motif : blankMotif());
	let float = $derived(longestFloat('Custom', motif));
	let paint = $state<boolean | null>(null);

	const at = (i: number, j: number) => motif[j * TILE_ST + i] === '1';
	function set(i: number, j: number, on: boolean) {
		const k = j * TILE_ST + i;
		if ((motif[k] === '1') === on) return;
		design.motif = motif.slice(0, k) + (on ? '1' : '0') + motif.slice(k + 1);
	}
	function down(e: PointerEvent, i: number, j: number) {
		e.preventDefault();
		paint = !at(i, j);
		set(i, j, paint);
	}
	/** Dragging across the grid keeps painting whatever the first cell turned into. */
	function move(e: PointerEvent) {
		if (paint === null) return;
		const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
		if (el?.dataset.i !== undefined) set(Number(el.dataset.i), Number(el.dataset.j), paint);
	}
	function shift(dx: number, dy: number) {
		let s = '';
		for (let j = 0; j < TILE_ROWS; j++)
			for (let i = 0; i < TILE_ST; i++) s += motif[((j - dy + TILE_ROWS) % TILE_ROWS) * TILE_ST + ((i - dx + TILE_ST) % TILE_ST)];
		design.motif = s;
	}
	function mirror() {
		let s = '';
		for (let j = 0; j < TILE_ROWS; j++) for (let i = 0; i < TILE_ST; i++) s += motif[j * TILE_ST + (i < TILE_ST / 2 ? i : TILE_ST - 1 - i)];
		design.motif = s;
	}
	function invert() {
		design.motif = [...motif].map((c) => (c === '1' ? '0' : '1')).join('');
	}
</script>

<svelte:window onpointerup={() => (paint = null)} onpointercancel={() => (paint = null)} />

<div class="editor">
	<p class="hint">Click or drag to paint stitches in your pattern colour. The grid repeats across the whole sweater, so edges wrap round.</p>
	<div class="board" onpointermove={move} role="application" aria-label="Pattern grid, {TILE_ST} stitches by {TILE_ROWS} rows" style:touch-action="none">
		<svg viewBox="0 0 {TILE_ST * CELL} {TILE_ROWS * CELL}" width={TILE_ST * CELL} height={TILE_ROWS * CELL}>
			{#each { length: TILE_ROWS } as _, j (j)}
				{#each { length: TILE_ST } as _, i (i)}
					<!-- svelte-ignore a11y_no_static_element_interactions -->
					<rect data-i={i} data-j={j} x={i * CELL} y={j * CELL} width={CELL} height={CELL} fill={at(i, j) ? design.contrast : design.color} stroke="rgba(0,0,0,0.28)" stroke-width="0.6" onpointerdown={(e) => down(e, i, j)} />
				{/each}
			{/each}
		</svg>
	</div>
	<div class="tools">
		<button type="button" onclick={() => shift(-1, 0)} aria-label="Shift left">←</button>
		<button type="button" onclick={() => shift(1, 0)} aria-label="Shift right">→</button>
		<button type="button" onclick={() => shift(0, -1)} aria-label="Shift up">↑</button>
		<button type="button" onclick={() => shift(0, 1)} aria-label="Shift down">↓</button>
		<button type="button" onclick={mirror}>Mirror</button>
		<button type="button" onclick={invert}>Invert</button>
		<button type="button" onclick={() => (design.motif = blankMotif())}>Clear</button>
		<button type="button" onclick={() => (design.motif = starterMotif())}>Reset</button>
	</div>
	{#if float > 5}
		<p class="warn">Some stitches carry the yarn behind for {float} sts. Floats over 5 sts can snag, so the pattern will tell you to catch them.</p>
	{/if}
</div>

<style>
	.editor {
		margin-top: 10px;
		display: grid;
		gap: 8px;
	}
	.hint,
	.warn {
		margin: 0;
		font-size: 0.85em;
		color: var(--muted, inherit);
	}
	.warn {
		color: #8a5a00;
	}
	.board {
		justify-self: start;
		max-width: 100%;
		border: 1px solid var(--line-strong, var(--line));
		border-radius: 4px;
		overflow: hidden;
		line-height: 0;
	}
	svg {
		display: block;
		max-width: 100%;
		height: auto;
		cursor: crosshair;
		user-select: none;
	}
	.tools {
		display: flex;
		flex-wrap: wrap;
		gap: 5px;
	}
	.tools button {
		min-height: 32px;
		padding: 0 10px;
		border: 1px solid var(--line-strong, var(--line));
		border-radius: 4px;
		background: var(--surface);
		color: var(--ink);
		font: inherit;
		cursor: pointer;
	}
	.tools button:focus-visible {
		outline: 2px solid var(--focus);
		outline-offset: 2px;
	}
</style>
