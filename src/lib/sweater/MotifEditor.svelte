<script lang="ts">
	import { flipH, flipV, invert, isOn, lineCells, mirror, paint, shift } from './chartEdit';
	import { blankMotif, TILE_ROWS, TILE_ST } from './motifs';

	/**
	 * The paintable chart. It only edits `motif`; nothing else on the page re-renders while you paint,
	 * which keeps a drag in step with the pointer.
	 */
	let { motif = $bindable(), color, contrast }: { motif: string; color: string; contrast: string } = $props();

	// ── Undo: one entry per stroke or tool, newest last ──
	let past = $state<string[]>([]);
	let future = $state<string[]>([]);
	function commit(next: string, before = motif) {
		if (next === before) return;
		past = [...past.slice(-99), before];
		future = [];
		motif = next;
	}
	export function undo() {
		const prev = past.at(-1);
		if (prev === undefined) return;
		future = [motif, ...future];
		past = past.slice(0, -1);
		motif = prev;
	}
	export function redo() {
		const next = future[0];
		if (next === undefined) return;
		past = [...past, motif];
		future = future.slice(1);
		motif = next;
	}
	export const canUndo = () => past.length > 0;
	export const canRedo = () => future.length > 0;
	export function apply(tool: 'left' | 'right' | 'up' | 'down' | 'mirror' | 'flipH' | 'flipV' | 'invert' | 'clear') {
		const ops = {
			left: () => shift(motif, -1, 0),
			right: () => shift(motif, 1, 0),
			up: () => shift(motif, 0, -1),
			down: () => shift(motif, 0, 1),
			mirror: () => mirror(motif),
			flipH: () => flipH(motif),
			flipV: () => flipV(motif),
			invert: () => invert(motif),
			clear: () => blankMotif()
		};
		commit(ops[tool]());
	}

	// ── Painting: the first cell decides whether this stroke paints or erases ──
	let svg = $state<SVGSVGElement>();
	let stroke: { on: boolean; before: string; last: [number, number] } | null = null;

	function cellAt(e: PointerEvent): [number, number] {
		const r = svg!.getBoundingClientRect();
		const i = Math.floor(((e.clientX - r.left) / r.width) * TILE_ST);
		const j = Math.floor(((e.clientY - r.top) / r.height) * TILE_ROWS);
		return [Math.min(TILE_ST - 1, Math.max(0, i)), Math.min(TILE_ROWS - 1, Math.max(0, j))];
	}
	function down(e: PointerEvent) {
		if (e.button !== 0) return;
		e.preventDefault();
		svg!.setPointerCapture(e.pointerId);
		const [i, j] = cellAt(e);
		cursor = [i, j];
		stroke = { on: !isOn(motif, i, j), before: motif, last: [i, j] };
		motif = paint(motif, [[i, j]], stroke.on);
	}
	function move(e: PointerEvent) {
		if (!stroke) return;
		const [i, j] = cellAt(e);
		const [li, lj] = stroke.last;
		if (i === li && j === lj) return;
		motif = paint(motif, lineCells(li, lj, i, j), stroke.on);
		stroke.last = [i, j];
		cursor = [i, j];
	}
	function up() {
		if (!stroke) return;
		const { before } = stroke;
		stroke = null;
		const after = motif;
		motif = before;
		commit(after, before);
	}

	// ── Keyboard: arrows move a cursor, Space or Enter toggles the stitch under it ──
	let cursor = $state<[number, number]>([0, 0]);
	let focused = $state(false);
	function key(e: KeyboardEvent) {
		const [i, j] = cursor;
		const moves: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
		if (moves[e.key]) {
			e.preventDefault();
			const [dx, dy] = moves[e.key];
			cursor = [(i + dx + TILE_ST) % TILE_ST, (j + dy + TILE_ROWS) % TILE_ROWS];
		} else if (e.key === ' ' || e.key === 'Enter') {
			e.preventDefault();
			commit(paint(motif, [[i, j]], !isOn(motif, i, j)));
		}
	}

	let cells = $derived(Array.from({ length: TILE_ROWS * TILE_ST }, (_, k) => motif[k] === '1'));
</script>

<svg
	bind:this={svg}
	class="grid"
	viewBox="0 0 {TILE_ST} {TILE_ROWS}"
	shape-rendering="crispEdges"
	role="grid"
	tabindex="0"
	aria-label="Pattern chart, {TILE_ST} stitches by {TILE_ROWS} rows. Click or drag to paint; arrow keys and Space work too."
	onpointerdown={down}
	onpointermove={move}
	onpointerup={up}
	onpointercancel={up}
	onlostpointercapture={up}
	onkeydown={key}
	onfocus={() => (focused = true)}
	onblur={() => (focused = false)}
>
	<rect width={TILE_ST} height={TILE_ROWS} fill={color} />
	{#each cells as on, k (k)}
		{#if on}<rect x={k % TILE_ST} y={Math.floor(k / TILE_ST)} width="1" height="1" fill={contrast} />{/if}
	{/each}
	<g class="lines" aria-hidden="true">
		{#each { length: TILE_ST + 1 } as _, i (i)}<line x1={i} y1="0" x2={i} y2={TILE_ROWS} class:major={i % 4 === 0} />{/each}
		{#each { length: TILE_ROWS + 1 } as _, j (j)}<line x1="0" y1={j} x2={TILE_ST} y2={j} class:major={j % 4 === 0} />{/each}
	</g>
	{#if focused}<rect class="cursor" x={cursor[0] + 0.06} y={cursor[1] + 0.06} width="0.88" height="0.88" />{/if}
</svg>

<style>
	.grid {
		display: block;
		width: 100%;
		height: 100%;
		border-radius: 6px;
		cursor: crosshair;
		touch-action: none;
		user-select: none;
		-webkit-user-select: none;
		-webkit-tap-highlight-color: transparent;
	}
	.grid:focus-visible {
		outline: 2px solid var(--focus);
		outline-offset: 3px;
	}
	line {
		stroke: rgb(0 0 0 / 0.22);
		stroke-width: 0.03;
		shape-rendering: geometricPrecision;
	}
	line.major {
		stroke: rgb(0 0 0 / 0.42);
		stroke-width: 0.05;
	}
	.cursor {
		fill: none;
		stroke: var(--focus);
		stroke-width: 0.12;
		shape-rendering: geometricPrecision;
	}
</style>
