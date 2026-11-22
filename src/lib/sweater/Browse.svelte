<script lang="ts">
	import type { Snippet } from 'svelte';
	import BrowseCard, { type BrowseItem } from './BrowseCard.svelte';
	import type { Facet, Sort } from './browse';

	/**
	 * The shared catalogue of charts or patterns: a rail of filters on the left, big pictures on the right. Every filter,
	 * the sort and the page are links to the same page with different parameters, so any view can be shared or bookmarked.
	 * `show` is the one choice that is not in the address: what garment each chart is pictured on.
	 */
	let {
		title,
		noun,
		newHref,
		base,
		facets,
		sort,
		page,
		more,
		items,
		unavailable,
		picture,
		onnear,
		show,
		blank,
		children
	}: {
		title: string;
		noun: string;
		newHref: string;
		/** The page's own path, which filter links add parameters to. */
		base: string;
		facets: Facet[];
		sort: Sort;
		page: number;
		more: boolean;
		items: BrowseItem[];
		unavailable: boolean;
		picture: (item: BrowseItem) => string | undefined;
		/** Told when a card is on screen or about to be, so only those pictures get drawn. */
		onnear?: (id: string) => void;
		show?: { label: string; options: string[]; value: string; pick: (value: string) => void };
		/** What to say when nothing has been shared at all. */
		blank: Snippet;
		/** Anything between the heading and the catalogue (the knitter's own work). */
		children?: Snippet;
	} = $props();

	let active = $derived(facets.some((f) => f.value));
	/** This page with the chosen filters, plus (or minus) the given changes. Changing a filter goes back to the first page. */
	function link(change: Record<string, string | number>) {
		const p = new URLSearchParams();
		for (const f of facets) if (f.value) p.set(f.key, f.value);
		if (sort !== 'new') p.set('sort', sort);
		if (page) p.set('page', String(page));
		if (!('page' in change)) p.delete('page');
		for (const [key, value] of Object.entries(change)) {
			if (value === '' || (key === 'sort' && value === 'new') || (key === 'page' && value === 0)) p.delete(key);
			else p.set(key, String(value));
		}
		const s = p.toString();
		return s ? `${base}?${s}` : base;
	}
</script>

<main>
	<header>
		<h1>{title}</h1>
		<a class="chunk sm" href={newHref}>New {noun}</a>
	</header>
	{@render children?.()}

	<div class="layout" data-sveltekit-noscroll>
		<aside aria-label="Filters" data-sveltekit-keepfocus>
			{#if show}
				<section>
					<h2>{show.label}</h2>
					<ul>
						{#each show.options as g (g)}
							<li><button type="button" class="row" aria-pressed={show.value === g} onclick={() => show.pick(g)}><i></i><span>{g}</span></button></li>
						{/each}
					</ul>
				</section>
			{/if}
			{#each facets as f (f.key)}
				{#if f.options.length}
					<section>
						<h2>{f.label}</h2>
						{#if f.key === 'colour'}
							<div class="dots">
								{#each f.options as o (o.value)}
									{#if o.count || o.value === f.value}
										<a href={link({ [f.key]: o.value === f.value ? '' : o.value })} style:--c={o.swatch} aria-current={o.value === f.value ? 'true' : undefined} aria-label="{o.label}, {o.count}" title="{o.label} · {o.count}">&nbsp;</a>
									{:else}
										<span style:--c={o.swatch} aria-disabled="true" aria-label="{o.label}, none" title="{o.label} · none">&nbsp;</span>
									{/if}
								{/each}
							</div>
						{:else}
							<ul>
								{#each f.options as o (o.value)}
									<li>
										{#if o.count || o.value === f.value}
											<a class="row" href={link({ [f.key]: o.value === f.value ? '' : o.value })} aria-current={o.value === f.value ? 'true' : undefined}><i></i><span>{o.label}</span><em>{o.count}</em></a>
										{:else}
											<span class="row" aria-disabled="true"><i></i><span>{o.label}</span><em>0</em></span>
										{/if}
									</li>
								{/each}
							</ul>
						{/if}
					</section>
				{/if}
			{/each}
		</aside>

		<section aria-label="Results">
			<p class="bar">
				<span class="n">
					{#if !unavailable}{items.length ? `${items.length}${more || page ? '+' : ''} ${noun}${items.length === 1 ? '' : 's'}` : `No ${noun}s`}{/if}
					{#if active}<a class="clear" href={sort === 'new' ? base : `${base}?sort=${sort}`}>Clear</a>{/if}
				</span>
				<span class="sort" role="group" aria-label="Sort" data-at={sort}>
					<i aria-hidden="true"></i>
					<a href={link({ sort: 'new' })} aria-current={sort === 'new' ? 'true' : undefined}>Newest</a>
					<a href={link({ sort: 'loved' })} aria-current={sort === 'loved' ? 'true' : undefined}>Most loved</a>
				</span>
			</p>

			{#if unavailable}
				<p class="empty">The {noun} library is not available right now. Try again in a little while.</p>
			{:else if !items.length}
				<p class="empty">
					{#if active || page}Nothing matches that. <a href={base}>See every {noun}</a>.{:else}{@render blank()}{/if}
				</p>
			{:else}
				<ul class="grid">
					{#each items as it, n (it.id)}<BrowseCard item={it} picture={picture(it)} {n} {onnear} />{/each}
				</ul>
				<nav class="pages" aria-label="More {noun}s">
					{#if page > 0}<a href={link({ page: page - 1 })} rel="prev">← Newer</a>{/if}
					{#if more}<a href={link({ page: page + 1 })} rel="next">Older →</a>{/if}
				</nav>
			{/if}
		</section>
	</div>
</main>

<style>
	main {
		--ink: #26335f;
		--muted: #5d6385;
		--line-strong: #c9bb92;
		--surface: #fbf5e4;
		--wash: #f3e9c9;
		--accent: #c8543e;
		--accent-deep: #8f3a2a;
		--out: cubic-bezier(0.23, 1, 0.32, 1);
		max-width: 1180px;
		flex: 1;
		margin: 0 auto;
		padding: 48px 24px 96px;
		color: var(--ink);
		font-family: system-ui, -apple-system, 'SF Pro Text', 'Segoe UI', Roboto, sans-serif;
	}
	header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
		margin-bottom: 48px;
	}
	h1 {
		margin: 0;
		font-family: var(--display);
		font-size: 40px;
		font-weight: 600;
		line-height: 1.1;
	}
	.layout {
		display: grid;
		grid-template-columns: 200px minmax(0, 1fr);
		gap: 64px;
		align-items: start;
		margin-top: 32px;
	}
	aside {
		position: sticky;
		top: calc(var(--bar) + 24px);
		display: flex;
		flex-direction: column;
		gap: 28px;
	}
	aside section {
		isolation: isolate;
	}
	h2 {
		margin: 0 0 8px 10px;
		color: var(--muted);
		font-size: 12px;
		font-weight: 600;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}
	aside ul {
		display: flex;
		flex-direction: column;
		margin: 0;
		padding: 0;
		list-style: none;
	}
	/* A row in the rail: a pill fades in behind the chosen one and a stitch dot grows into place. */
	.row {
		position: relative;
		display: flex;
		align-items: center;
		gap: 10px;
		width: 100%;
		height: 34px;
		padding: 0 10px;
		border: 0;
		background: none;
		color: var(--muted);
		font: inherit;
		font-size: 15px;
		font-weight: 500;
		text-align: left;
		text-decoration: none;
		cursor: pointer;
		transition: color 150ms ease-out, transform 160ms var(--out);
	}
	.row::before {
		content: '';
		position: absolute;
		inset: 0;
		z-index: -1;
		border-radius: 9px;
		background: var(--wash);
		opacity: 0;
		transform: scale(0.96);
		transition: opacity 150ms ease-out, transform 200ms var(--out);
	}
	.row i {
		flex: none;
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: var(--accent);
		opacity: 0;
		transform: scale(0.4);
		transition: opacity 150ms ease-out, transform 220ms var(--out);
	}
	.row span {
		flex: 1;
	}
	.row em {
		font-size: 12px;
		font-style: normal;
		font-variant-numeric: tabular-nums;
		opacity: 0.75;
	}
	.row:active:not([aria-disabled]) {
		transform: scale(0.98);
	}
	.row[aria-pressed='true'],
	.row[aria-current='true'] {
		color: var(--ink);
	}
	.row[aria-pressed='true']::before,
	.row[aria-current='true']::before {
		opacity: 1;
		transform: none;
	}
	.row[aria-pressed='true'] i,
	.row[aria-current='true'] i {
		opacity: 1;
		transform: none;
	}
	.row[aria-disabled] {
		opacity: 0.4;
		cursor: default;
	}
	a:focus-visible,
	button:focus-visible {
		outline: 2px solid var(--focus);
		outline-offset: 2px;
	}
	.dots {
		display: grid;
		grid-template-columns: repeat(6, 24px);
		gap: 12px 8px;
		padding-left: 10px;
	}
	.dots a,
	.dots span {
		display: block;
		width: 24px;
		height: 24px;
		border-radius: 50%;
		background: var(--c);
		box-shadow: 0 0 0 0 #fffdf6, 0 0 0 0 var(--accent), 0 0 0 1px rgb(38 51 95 / 0.25) inset;
		font-size: 0;
		transition: transform 160ms var(--out), box-shadow 180ms var(--out);
	}
	.dots a[aria-current='true'] {
		box-shadow: 0 0 0 3px #fffdf6, 0 0 0 4.5px var(--accent), 0 0 0 1px rgb(38 51 95 / 0.25) inset;
	}
	.dots a:active {
		transform: scale(0.92);
	}
	.dots span {
		opacity: 0.25;
	}
	/* The line above the grid: how many, a way to start over, and sort as a two-way switch whose pill slides. */
	.bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		margin: 0 0 32px;
		color: var(--muted);
		font-size: 14px;
	}
	.n {
		display: flex;
		align-items: baseline;
		gap: 12px;
		font-variant-numeric: tabular-nums;
	}
	.clear {
		color: var(--link, #3d5aa8);
	}
	.sort {
		position: relative;
		display: grid;
		grid-template-columns: 1fr 1fr;
		padding: 3px;
		border-radius: 999px;
		background: var(--wash);
	}
	.sort i {
		position: absolute;
		top: 3px;
		bottom: 3px;
		left: 3px;
		width: calc(50% - 3px);
		border-radius: 999px;
		background: #fffdf6;
		box-shadow: 0 1px 3px #26335f33;
		transition: transform 220ms var(--out);
	}
	.sort[data-at='loved'] i {
		transform: translateX(100%);
	}
	.sort a {
		position: relative;
		display: grid;
		place-items: center;
		height: 30px;
		padding: 0 16px;
		border-radius: 999px;
		color: var(--muted);
		font-size: 13px;
		font-weight: 600;
		text-decoration: none;
		white-space: nowrap;
		transition: color 160ms ease-out, transform 160ms var(--out);
	}
	.sort a:active {
		transform: scale(0.97);
	}
	.sort a[aria-current='true'] {
		color: var(--ink);
	}
	.grid {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 64px 40px;
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.empty {
		color: var(--muted);
	}
	.empty :global(a),
	.pages a {
		color: var(--link, #3d5aa8);
	}
	.pages {
		display: flex;
		justify-content: space-between;
		margin-top: 48px;
	}
	@media (hover: hover) and (pointer: fine) {
		.row:not([aria-disabled]):not([aria-pressed='true']):not([aria-current='true']):hover {
			color: var(--ink);
		}
		.row:not([aria-disabled]):not([aria-pressed='true']):not([aria-current='true']):hover::before {
			opacity: 0.55;
			transform: none;
		}
		.dots a:not([aria-current='true']):hover {
			transform: scale(1.12);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.row,
		.row::before,
		.row i,
		.dots a {
			transition-property: color, opacity, box-shadow;
		}
		.sort i {
			transition: none;
		}
	}
	@media (max-width: 1000px) {
		.grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}
	@media (max-width: 760px) {
		main {
			padding: 32px 16px 80px;
		}
		.layout {
			grid-template-columns: 1fr;
			gap: 32px;
		}
		aside {
			position: static;
			flex-flow: row wrap;
			gap: 24px 40px;
		}
		aside section {
			min-width: 160px;
		}
		.grid {
			gap: 44px 20px;
		}
	}
</style>
