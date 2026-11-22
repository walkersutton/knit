<script lang="ts">
	import Author from '$lib/Author.svelte';
	import MotifSwatch from './MotifSwatch.svelte';
	import { ago } from './browse';

	export type BrowseItem = {
		id: string;
		href: string;
		name: string;
		author: string;
		authorPhoto: string | null;
		detail: string;
		likes: number;
		createdAt: string;
		alt: string;
		/** What stands in for the picture until it is drawn: a chart's cells, or just the two yarns. */
		fallback: { motif?: string; color: string; contrast: string };
	};

	/** One shared chart or pattern: a big picture on a cream panel, the title (which opens it), the knitter, and a line of detail. */
	let { item: c, picture, n = 0, onnear }: { item: BrowseItem; picture?: string; n?: number; onnear?: (id: string) => void } = $props();

	/** Says so once the card is on screen or a screenful away, which is when its picture is worth drawing. */
	function near(node: HTMLElement) {
		if (typeof IntersectionObserver === 'undefined') {
			onnear?.(c.id);
			return;
		}
		const watch = new IntersectionObserver(
			(seen) => {
				if (!seen.some((s) => s.isIntersecting)) return;
				onnear?.(c.id);
				watch.disconnect();
			},
			{ rootMargin: '600px 0px' }
		);
		watch.observe(node);
		return { destroy: () => watch.disconnect() };
	}
</script>

<li style:--n={Math.min(n, 8)} use:near>
	<span class="frame">
		{#if picture}
			<img src={picture} alt={c.alt} />
		{:else if c.fallback.motif}
			<span class="flat"><MotifSwatch motif={c.fallback.motif} color={c.fallback.color} contrast={c.fallback.contrast} across={2} down={1} /></span>
		{:else}
			<span class="flat duo" aria-hidden="true"><i style:background={c.fallback.color}></i><i style:background={c.fallback.contrast}></i></span>
		{/if}
	</span>
	<a class="open" href={c.href}>{c.name}</a>
	<span class="by">by <Author name={c.author} photo={c.authorPhoto} /></span>
	<span class="meta">{c.detail}</span>
	<span class="meta">♥ {c.likes} · {ago(c.createdAt)}</span>
</li>

<style>
	li {
		position: relative;
		display: flex;
		flex-direction: column;
		gap: 3px;
		animation: rise 320ms cubic-bezier(0.23, 1, 0.32, 1) backwards;
		animation-delay: calc(var(--n) * 30ms);
		transition: transform 160ms cubic-bezier(0.23, 1, 0.32, 1);
	}
	li:active {
		transform: scale(0.985);
	}
	@keyframes rise {
		from {
			opacity: 0;
			transform: translateY(8px);
		}
	}
	.frame {
		display: grid;
		place-items: center;
		aspect-ratio: 4 / 5;
		margin-bottom: 12px;
		padding: 6%;
		border-radius: 16px;
		background: var(--wash);
		transition: transform 220ms cubic-bezier(0.23, 1, 0.32, 1), box-shadow 220ms cubic-bezier(0.23, 1, 0.32, 1);
	}
	img {
		display: block;
		width: 100%;
		height: 100%;
		object-fit: contain;
		animation: fade 240ms ease-out;
	}
	@keyframes fade {
		from {
			opacity: 0;
		}
	}
	.flat {
		display: block;
		width: 46%;
		overflow: hidden;
		border-radius: 8px;
		opacity: 0.55;
	}
	.duo {
		display: flex;
		aspect-ratio: 1;
	}
	.duo i {
		flex: 1;
	}
	/* The title link covers the whole card; the author link sits above it so both can be clicked. */
	.open {
		color: var(--ink);
		font-size: 17px;
		font-weight: 700;
		overflow-wrap: anywhere;
		text-decoration: none;
	}
	.open::after {
		content: '';
		position: absolute;
		inset: 0;
		border-radius: 16px;
	}
	.open:focus-visible {
		outline: none;
	}
	li:has(.open:focus-visible) .frame {
		outline: 2px solid var(--focus);
		outline-offset: 3px;
	}
	.by {
		position: relative;
		z-index: 1;
		align-self: flex-start;
		max-width: 100%;
		color: var(--muted);
		font-size: 14px;
	}
	.meta {
		color: var(--muted);
		font-size: 13px;
	}
	@media (hover: hover) and (pointer: fine) {
		li:hover .frame {
			transform: translateY(-3px);
			box-shadow: 0 10px 24px #1a234418;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		li,
		img {
			animation: none;
		}
		.frame {
			transition: none;
		}
	}
</style>
