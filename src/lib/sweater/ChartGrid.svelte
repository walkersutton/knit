<script lang="ts">
	import { tileOfMotif } from './motifs';

	/**
	 * One repeat of a chart drawn as a knitter reads it: a square per stitch with grid lines, a
	 * heavier line every `every` stitches and rows, and row numbers up the right (row 1 at the bottom).
	 */
	let { motif, color, contrast, label, every = 4 }: { motif: string; color: string; contrast: string; label?: string; every?: number } = $props();

	let tile = $derived(tileOfMotif(motif));
	let st = $derived(tile.st);
	let rows = $derived(tile.rows);
	let on = $derived([...motif].flatMap((c, k) => (c === '1' ? [[k % st, Math.floor(k / st)]] : [])));
	/** Room on the right for the row numbers, in stitches. */
	const GUTTER = 1.6;
	let numbered = $derived(Array.from({ length: rows }, (_, j) => rows - j).filter((n) => n === 1 || n % every === 0));
</script>

<svg viewBox="-0.1 -0.1 {st + GUTTER + 0.2} {rows + 0.2}" role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : 'true'}>
	<rect width={st} height={rows} fill={color} />
	<g fill={contrast} shape-rendering="crispEdges">
		{#each on as [x, y] (`${x}-${y}`)}<rect {x} {y} width="1" height="1" />{/each}
	</g>
	<g class="lines" fill="none">
		{#each { length: st + 1 } as _, i (i)}<line x1={i} y1="0" x2={i} y2={rows} class:major={i % every === 0} />{/each}
		{#each { length: rows + 1 } as _, j (j)}<line x1="0" y1={j} x2={st} y2={j} class:major={(rows - j) % every === 0} />{/each}
	</g>
	<g class="nums">
		{#each numbered as n (n)}<text x={st + 0.35} y={rows - n + 0.72}>{n}</text>{/each}
	</g>
</svg>

<style>
	svg {
		display: block;
		width: 100%;
		height: auto;
	}
	.lines line {
		stroke: rgb(38 51 95 / 0.22);
		stroke-width: 0.04;
	}
	.lines line.major {
		stroke: rgb(38 51 95 / 0.5);
		stroke-width: 0.07;
	}
	.nums text {
		fill: var(--muted, #5d6385);
		font: 500 0.62px system-ui, sans-serif;
		font-variant-numeric: tabular-nums;
	}
</style>
