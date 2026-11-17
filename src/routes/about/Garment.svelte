<script lang="ts">
	import { contrastFor, garmentPaths, tiles, TILE_ROWS, TILE_ST } from './content';

	let { garment, color, pattern = 'Solid', size = 72 }: { garment: string; color: string; pattern?: string; size?: number } = $props();

	const uid = `g${Math.random().toString(36).slice(2, 8)}`;
	const CELL = 1.7;
	let d = $derived(garmentPaths[garment]);
	let cells = $derived(tiles[pattern] ?? []);
</script>

<svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true">
	<defs>
		<pattern id={uid} width={TILE_ST * CELL} height={TILE_ROWS * CELL} patternUnits="userSpaceOnUse" x="4" y="4">
			{#each cells as [i, j] (`${i}-${j}`)}<rect x={i * CELL} y={j * CELL} width={CELL + 0.02} height={CELL + 0.02} fill={contrastFor(color)} />{/each}
		</pattern>
	</defs>
	<path {d} fill={color} stroke="#18181b" stroke-opacity=".7" stroke-width="1.5" stroke-linejoin="round" />
	{#if cells.length}<path {d} fill="url(#{uid})" />{/if}
	<path {d} fill="none" stroke="#18181b" stroke-opacity=".7" stroke-width="1.5" stroke-linejoin="round" />
	{#if garment === 'Cardigan'}
		<path d="M32 18V56" stroke="#18181b" stroke-opacity=".5" stroke-width="1.2" />
		{#each [28, 38, 48] as y (y)}<circle cx="35.5" cy={y} r="1.3" fill="#18181b" fill-opacity=".55" />{/each}
	{/if}
</svg>

<style>
	svg {
		display: block;
		flex: none;
	}
	path:first-of-type {
		transition: fill 200ms ease-out;
	}
	@media (prefers-reduced-motion: reduce) {
		path:first-of-type {
			transition: none;
		}
	}
</style>
