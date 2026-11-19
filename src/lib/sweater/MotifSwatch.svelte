<script lang="ts">
	import { parseCenterpiece } from './centerpiece';
	import { tileOfMotif } from './motifs';

	/**
	 * A custom chart drawn as fabric: `across` × `down` repeats of the tile, or a single tile for a
	 * thumbnail. The tile is drawn once and repeated by the browser, so a big swatch costs no more.
	 * A centerpiece ("20x11:…") is not a repeat: it is drawn once, in the middle of a patch of the
	 * main colour shaped like the swatch would be.
	 */
	let { motif, color, contrast, across = 1, down = 1, label }: { motif: string; color: string; contrast: string; across?: number; down?: number; label?: string } = $props();

	const uid = $props.id();
	let cp = $derived(parseCenterpiece(motif));
	let tile = $derived(tileOfMotif(motif));
	let TILE_ST = $derived(tile.st);
	let TILE_ROWS = $derived(tile.rows);
	let on = $derived([...motif].flatMap((c, k) => (c === '1' ? [[k % TILE_ST, Math.floor(k / TILE_ST)]] : [])));

	/** A row is about 0.8 of a stitch tall, so a centerpiece is drawn as it will knit. */
	const ROW = 0.8;
	let patch = $derived.by(() => {
		if (!cp) return null;
		const w = cp.w;
		const h = cp.h * ROW;
		// The patch has the swatch's proportions (a 12 × 16 tile, repeated), with a margin round the picture.
		const aspect = (12 * across) / (16 * down);
		const pad = Math.max(w, h) * 0.18;
		let W = w + 2 * pad;
		let H = h + 2 * pad;
		if (W / H < aspect) W = H * aspect;
		else H = W / aspect;
		const cells: [number, number][] = [];
		for (let j = 0; j < cp.h; j++) for (let i = 0; i < cp.w; i++) if (cp.cells[j * cp.w + i] === '1') cells.push([i, j]);
		return { W, H, x: (W - w) / 2, y: (H - h) / 2, cells };
	});
</script>

{#if patch}
	<svg viewBox="0 0 {patch.W} {patch.H}" shape-rendering="crispEdges" role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : 'true'}>
		<rect width={patch.W} height={patch.H} fill={color} />
		<g fill={contrast} transform="translate({patch.x} {patch.y})">
			{#each patch.cells as [x, y] (`${x}-${y}`)}<rect {x} y={y * ROW} width="1.02" height={ROW * 1.04} />{/each}
		</g>
	</svg>
{:else}
	<svg viewBox="0 0 {TILE_ST * across} {TILE_ROWS * down}" shape-rendering="crispEdges" role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : 'true'}>
		<defs>
			<pattern id="tile-{uid}" width={TILE_ST} height={TILE_ROWS} patternUnits="userSpaceOnUse">
				<rect width={TILE_ST} height={TILE_ROWS} fill={color} />
				{#each on as [x, y] (`${x}-${y}`)}<rect {x} {y} width="1" height="1" fill={contrast} />{/each}
			</pattern>
		</defs>
		<rect width={TILE_ST * across} height={TILE_ROWS * down} fill="url(#tile-{uid})" />
	</svg>
{/if}

<style>
	svg {
		display: block;
		width: 100%;
		height: auto;
	}
</style>
