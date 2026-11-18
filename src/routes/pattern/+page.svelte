<script lang="ts">
	import Seo from '$lib/Seo.svelte';
	import YourWork from '$lib/sweater/YourWork.svelte';
	import { designDetail } from '$lib/sweater/random';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	/** The same search, a page along. */
	const href = (page: number) => {
		const p = new URLSearchParams();
		if (data.q) p.set('q', data.q);
		if (data.garment) p.set('type', data.garment);
		if (page) p.set('page', String(page));
		const s = p.toString();
		return s ? `?${s}` : '?';
	};
	let filtered = $derived(Boolean(data.q || data.garment));
</script>

<Seo title="Knitting patterns — knit" description="Browse free sweater, cardigan, slipover and tee knitting patterns shared by knitters, and open any of them to adapt to your own yarn, gauge and size." path="/pattern" />

<main>
	<p class="eyebrow">Shared by knitters</p>
	<div class="head">
		<h1>Patterns</h1>
		<a class="new" href="/design">Design a new pattern</a>
	</div>
	<YourWork kind="pattern" />
	<form role="search" method="get">
		<input type="search" name="q" value={data.q} placeholder="Search by name, garment or knitter" aria-label="Search patterns" />
		<select name="type" aria-label="Garment">
			<option value="">All garments</option>
			{#each data.garments as g (g)}<option value={g} selected={g === data.garment}>{g}</option>{/each}
		</select>
		<button type="submit">Search</button>
	</form>

	{#if data.unavailable}
		<p class="empty">The catalogue is not available right now. Try again in a little while.</p>
	{:else if !data.patterns.length}
		<p class="empty">
			{#if filtered}Nothing matches that. <a href="/pattern">See every pattern</a>.{:else}Nobody has shared a pattern yet. <a href="/design">Design one</a> and be the first.{/if}
		</p>
	{:else}
		<ul>
			{#each data.patterns as p (p.id)}
				<li>
					<a href="/pattern/{p.id}">
						<span class="swatch" aria-hidden="true"><i style:background={p.design.color}></i><i style:background={p.design.contrast}></i></span>
						<span class="text">
							<b>{p.name}</b>
							<span>{designDetail(p.design)}</span>
							<em>by {p.author}</em>
						</span>
					</a>
				</li>
			{/each}
		</ul>
		<nav class="pages" aria-label="More patterns">
			{#if data.page > 0}<a href={href(data.page - 1)} rel="prev">← Newer</a>{/if}
			{#if data.more}<a href={href(data.page + 1)} rel="next">Older →</a>{/if}
		</nav>
	{/if}
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
		max-width: 912px;
		min-height: calc(100dvh - var(--bar));
		margin: 0 auto;
		padding: 24px 16px 64px;
		color: var(--ink);
		font-family: system-ui, -apple-system, 'SF Pro Text', 'Segoe UI', Roboto, sans-serif;
	}
	.eyebrow {
		margin: 0 0 6px;
		color: var(--accent-deep);
		font-size: 12px;
		font-weight: 600;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}
	.head {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		margin-bottom: 20px;
	}
	.new {
		display: inline-flex;
		align-items: center;
		height: 40px;
		padding: 0 18px;
		border: 1.5px solid var(--accent-deep);
		border-radius: 8px;
		background: var(--accent);
		color: #fff8e6;
		font-weight: 500;
		text-decoration: none;
	}
	.new:active {
		filter: brightness(0.93);
	}
	.new:focus-visible {
		outline: 2px solid var(--focus);
		outline-offset: 2px;
	}
	h1 {
		margin: 0;
		font-family: var(--display);
		font-size: 36px;
		font-weight: 600;
	}
	form {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		margin-bottom: 24px;
	}
	input,
	select,
	button {
		height: 40px;
		border: 1.5px solid var(--line-strong);
		border-radius: 8px;
		background: #fffdf6;
		color: var(--ink);
		font: inherit;
	}
	input {
		flex: 1 1 240px;
		padding: 0 12px;
	}
	select {
		padding: 0 10px;
	}
	button {
		padding: 0 18px;
		border-color: var(--accent-deep);
		background: var(--accent);
		color: #fff8e6;
		font-weight: 500;
		cursor: pointer;
	}
	button:active {
		filter: brightness(0.93);
	}
	input:focus-visible,
	select:focus-visible,
	button:focus-visible,
	li a:focus-visible,
	.pages a:focus-visible {
		outline: 2px solid var(--focus);
		outline-offset: 2px;
	}
	ul {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
		gap: 12px;
		margin: 0;
		padding: 0;
		list-style: none;
	}
	li a {
		display: flex;
		gap: 12px;
		height: 100%;
		padding: 14px;
		border: 1px solid var(--line-strong);
		border-radius: 12px;
		background: var(--surface);
		color: inherit;
		text-decoration: none;
		transition: background-color 120ms ease-out, transform 160ms cubic-bezier(0.23, 1, 0.32, 1);
	}
	li a:active {
		transform: scale(0.98);
	}
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
	.text {
		display: flex;
		flex-direction: column;
		gap: 2px;
		min-width: 0;
		font-size: 13px;
		color: var(--muted);
	}
	.text b {
		color: var(--ink);
		font-size: 15px;
		overflow-wrap: anywhere;
	}
	.text em {
		font-style: normal;
	}
	.empty {
		color: var(--muted);
	}
	.empty a,
	.pages a {
		color: var(--link, #3d5aa8);
	}
	.pages {
		display: flex;
		justify-content: space-between;
		margin-top: 24px;
	}
	@media (hover: hover) and (pointer: fine) {
		li a:hover {
			background: var(--wash);
		}
	}
</style>
