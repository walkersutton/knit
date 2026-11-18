<script lang="ts">
	import Author from '$lib/Author.svelte';
	import type { Design } from './garment';
	import { designDetail } from './random';

	/** One shared pattern in a list: the title opens it, the author's name opens their page. */
	let { pattern: p }: { pattern: { id: string; name: string; design: Design; author: string; authorPhoto: string | null } } = $props();
</script>

<li>
	<span class="swatch" aria-hidden="true"><i style:background={p.design.color}></i><i style:background={p.design.contrast}></i></span>
	<span class="text">
		<a class="open" href="/pattern/{p.id}">{p.name}</a>
		<span>{designDetail(p.design)}</span>
		<span class="by">by <Author name={p.author} photo={p.authorPhoto} /></span>
	</span>
</li>

<style>
	.swatch {
		display: flex;
		flex: none;
		width: 44px;
		height: 44px;
		overflow: hidden;
		border-radius: 10px;
		box-shadow: 0 0 0 1px rgb(38 51 95 / 0.15);
	}
	.swatch i {
		flex: 1;
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
