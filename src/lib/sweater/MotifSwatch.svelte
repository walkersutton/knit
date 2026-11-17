<script lang="ts">
	import { tileOfMotif } from './motifs';

	/**
	 * A custom chart drawn as fabric: `across` × `down` repeats of the tile, or a single tile for a
	 * thumbnail. The tile is drawn once and repeated by the browser, so a big swatch costs no more.
	 */
	let { motif, color, contrast, across = 1, down = 1, label }: { motif: string; color: string; contrast: string; across?: number; down?: number; label?: string } = $props();

	const uid = $props.id();
	let tile = $derived(tileOfMotif(motif));
	let TILE_ST = $derived(tile.st);
	let TILE_ROWS = $derived(tile.rows);
	let on = $derived([...motif].flatMap((c, k) => (c === '1' ? [[k % TILE_ST, Math.floor(k / TILE_ST)]] : [])));
</script>

<svg viewBox="0 0 {TILE_ST * across} {TILE_ROWS * down}" shape-rendering="crispEdges" role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : 'true'}>
	<defs>
		<pattern id="tile-{uid}" width={TILE_ST} height={TILE_ROWS} patternUnits="userSpaceOnUse">
			<rect width={TILE_ST} height={TILE_ROWS} fill={color} />
			{#each on as [x, y] (`${x}-${y}`)}<rect {x} {y} width="1" height="1" fill={contrast} />{/each}
		</pattern>
	</defs>
	<rect width={TILE_ST * across} height={TILE_ROWS * down} fill="url(#tile-{uid})" />
</svg>

<style>
	svg {
		display: block;
		width: 100%;
		height: auto;
	}
</style>
