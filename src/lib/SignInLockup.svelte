<script lang="ts">
	import Logo from '$lib/Logo.svelte';
	import mark from '$lib/ravelry-mark.svg?raw';
	// knit and Ravelry joined by a thread that draws itself, then the Ravelry ball pops in as it arrives.
	let { size = 48 }: { size?: number } = $props();
</script>

<div class="lock" role="img" aria-label="knit and Ravelry, connected" style="--s:{size}px">
	<span class="end l"><Logo {size} word={false} /></span>
	<svg class="thread" viewBox="0 0 150 32" fill="none" aria-hidden="true">
		<path d="M0 17C26 17 34 5 58 5C80 5 80 27 60 23C44 20 58 8 82 11C110 15 120 17 150 17" pathLength="1" />
	</svg>
	<span class="end r">{@html mark}</span>
</div>

<style>
	.lock { --out: cubic-bezier(0.23, 1, 0.32, 1); display: flex; align-items: center; justify-content: center; }
	.end { display: inline-flex; width: var(--s); height: var(--s); flex: none; }
	.end.l { animation: pop 260ms var(--out) both; }
	.end.r { color: #ee6e62; animation: pop 260ms var(--out) 520ms both; }
	.end.r :global(svg) { width: 100%; height: 100%; }
	@keyframes pop { from { opacity: 0; transform: scale(0.8); } }
	/* A one-shot decorative stroke, so animating the dash offset is fine. */
	.thread { width: 150px; height: 32px; margin: 0 -2px; overflow: visible; }
	.thread path { stroke: #c8543e; stroke-width: 2.5; stroke-linecap: round; stroke-dasharray: 1; animation: draw 520ms var(--out) 180ms both; }
	@keyframes draw { from { stroke-dashoffset: 1; } }
	@media (prefers-reduced-motion: reduce) { .end, .thread path { animation: none; } }
</style>
