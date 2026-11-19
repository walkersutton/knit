<script lang="ts">
	import Author from '$lib/Author.svelte';
	import MotifSwatch from './MotifSwatch.svelte';
	import { chartSize, isCenterpieceChart, previewLink } from './library';

	/** One shared chart in a list: the title opens it, the author's name opens their page. */
	let { chart: c }: { chart: { id: string; name: string; motif: string; color: string; contrast: string; author: string; authorPhoto: string | null } } = $props();
	// A centerpiece has no 3D preview of its own, so it opens on its page.
	let href = $derived(isCenterpieceChart(c.motif) ? `/chart/${c.id}` : previewLink(c.motif, c.color, c.contrast, undefined, c.id));
</script>

<li>
	<span class="thumb"><MotifSwatch motif={c.motif} color={c.color} contrast={c.contrast} across={2} down={1} /></span>
	<span class="text">
		<a class="open" {href}>{c.name}</a>
		<span>{chartSize(c.motif)}</span>
		<span class="by">by <Author name={c.author} photo={c.authorPhoto} /></span>
	</span>
</li>

<style>
	.thumb {
		flex: none;
		width: 72px;
		align-self: flex-start;
		overflow: hidden;
		border-radius: 6px;
		box-shadow: 0 0 0 1px rgb(38 51 95 / 0.15);
	}
	li {
		position: relative;
		display: flex;
		gap: 12px;
		height: 100%;
		padding: 14px;
		border: 1px solid var(--line-strong);
		border-radius: 12px;
		background: var(--surface);
		transition: background-color 120ms ease-out, transform 160ms cubic-bezier(0.23, 1, 0.32, 1);
	}
	li:active {
		transform: scale(0.98);
	}
	/* The title link covers the whole card; the author link sits above it so both can be clicked. */
	.open {
		color: var(--ink);
		font-size: 15px;
		font-weight: 700;
		overflow-wrap: anywhere;
		text-decoration: none;
	}
	.open::after {
		content: "";
		position: absolute;
		inset: 0;
		border-radius: 12px;
	}
	li:has(.open:focus-visible) {
		outline: 2px solid var(--focus);
		outline-offset: 2px;
	}
	.text {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 2px;
		min-width: 0;
		font-size: 13px;
		color: var(--muted);
	}
	.by {
		position: relative;
		z-index: 1;
		max-width: 100%;
	}
	@media (hover: hover) and (pointer: fine) {
		li:hover {
			background: var(--wash);
		}
	}
</style>
