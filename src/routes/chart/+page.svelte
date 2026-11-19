<script lang="ts">
	import Seo from '$lib/Seo.svelte';
	import YourWork from '$lib/sweater/YourWork.svelte';
	import ChartCard from '$lib/sweater/ChartCard.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	/** The same search, a page along. */
	const href = (page: number) => {
		const p = new URLSearchParams();
		if (data.q) p.set('q', data.q);
		if (data.size) p.set('size', data.size);
		if (page) p.set('page', String(page));
		const s = p.toString();
		return s ? `?${s}` : '?';
	};
	let filtered = $derived(Boolean(data.q || data.size));
</script>

<Seo title="Colourwork charts — knit" description="Browse two-colour knitting charts shared by knitters, and put any of them on your own sweater with a free written pattern." path="/chart" />

<main>
	<p class="eyebrow">Shared by knitters</p>
	<div class="head">
		<h1>Charts</h1>
		<a class="new" href="/design#tool=chart">Design a new chart</a>
	</div>
	<YourWork kind="chart" />
	<form role="search" method="get">
		<input type="search" name="q" value={data.q} placeholder="Search by name or knitter" aria-label="Search charts" />
		<select name="size" aria-label="Chart size">
			<option value="">All charts</option>
			{#each data.sizes as s (s.value)}<option value={s.value} selected={s.value === data.size}>{s.label}</option>{/each}
		</select>
		<button type="submit">Search</button>
	</form>

	{#if data.unavailable}
		<p class="empty">The chart library is not available right now. Try again in a little while.</p>
	{:else if !data.charts.length}
		<p class="empty">
			{#if filtered}Nothing matches that. <a href="/chart">See every chart</a>.{:else}Nobody has shared a chart yet. <a href="/design#tool=chart">Draw one</a> and be the first.{/if}
		</p>
	{:else}
		<ul>
			{#each data.charts as c (c.id)}
				<ChartCard chart={c} />
			{/each}
		</ul>
		<nav class="pages" aria-label="More charts">
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
		flex: 1;
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
	}
</style>
