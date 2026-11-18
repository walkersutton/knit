<script lang="ts">
	import { onMount } from 'svelte';
	import Seo from '$lib/Seo.svelte';
	import AccountControls from '$lib/AccountControls.svelte';
	import ChartCard from '$lib/sweater/ChartCard.svelte';
	import PatternCard from '$lib/sweater/PatternCard.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	let p = $derived(data.profile);
	let broken = $state(false);
	let joined = $derived(new Date(p.joinedAt).toLocaleDateString(undefined, { month: 'long', year: 'numeric' }));
	let facts = $derived(
		p.bio
			? ([['Location', p.bio.location], ['Favourite colours', p.bio.faveColors], ['Favourite curse', p.bio.faveCurse]] as const).filter(([, v]) => v)
			: []
	);
	// The page is publicly cached, so ownership is only known client-side.
	let isMe = $state(false);
	onMount(() => {
		void fetch('/api/account')
			.then((r) => (r.ok ? r.json() : null))
			.then((d) => { isMe = d?.account?.username?.toLowerCase() === p.username.toLowerCase(); })
			.catch(() => undefined);
	});
	let shared = $derived(p.charts.length + p.patterns.length);
	let liked = $derived(p.likedCharts.length + p.likedPatterns.length);
</script>

{#snippet chartList(items: typeof p.charts)}
	<ul>{#each items as c (c.id)}<ChartCard chart={c} />{/each}</ul>
{/snippet}
{#snippet patternList(items: typeof p.patterns)}
	<ul>{#each items as x (x.id)}<PatternCard pattern={x} />{/each}</ul>
{/snippet}

<Seo title="{p.username} — knit" description="{p.username} on knit: {p.patterns.length} shared {p.patterns.length === 1 ? 'pattern' : 'patterns'} and {p.charts.length} shared {p.charts.length === 1 ? 'chart' : 'charts'}." path="/people/{encodeURIComponent(p.username)}" type="profile" image="/og/people/{encodeURIComponent(p.username)}.png" imageAlt="{p.username} on knit" />

<main>
	<header class="who">
		<span class="avatar" aria-hidden="true">
			{#if p.photo && !broken}
				<img src={p.photo} alt="" width="72" height="72" referrerpolicy="no-referrer" onerror={() => (broken = true)} />
			{:else}{(p.username.match(/[\p{L}\p{N}]/u)?.[0] ?? '?').toUpperCase()}{/if}
		</span>
		<div>
			<p class="eyebrow">Knitter · joined {joined}</p>
			<h1>{p.username}</h1>
			<a class="rav" href="https://www.ravelry.com/people/{encodeURIComponent(p.username)}" target="_blank" rel="noopener">View on Ravelry</a>
		</div>
	</header>

	{#if p.bio}
		<section class="bio" aria-label="About {p.username}">
			{#if p.bio.about}<p class="about">{p.bio.about}</p>{/if}
			{#if facts.length}
				<dl>{#each facts as [label, value] (label)}<div><dt>{label}</dt><dd>{value}</dd></div>{/each}</dl>
			{/if}
		</section>
	{/if}

	{#if isMe}<AccountControls />{/if}

	<section aria-labelledby="patterns-h">
		<h2 id="patterns-h">Shared patterns <small>{p.patterns.length}</small></h2>
		{#if p.patterns.length}{@render patternList(p.patterns)}{:else}<p class="empty">No patterns shared yet.</p>{/if}
	</section>
	<section aria-labelledby="charts-h">
		<h2 id="charts-h">Shared charts <small>{p.charts.length}</small></h2>
		{#if p.charts.length}{@render chartList(p.charts)}{:else}<p class="empty">No charts shared yet.</p>{/if}
	</section>
	<section aria-labelledby="likes-h">
		<h2 id="likes-h">Likes <small>{liked}</small></h2>
		{#if liked}
			{#if p.likedPatterns.length}<h3>Patterns</h3>{@render patternList(p.likedPatterns)}{/if}
			{#if p.likedCharts.length}<h3>Charts</h3>{@render chartList(p.likedCharts)}{/if}
		{:else}
			<p class="empty">Nothing liked yet.</p>
		{/if}
	</section>
	{#if !shared && !liked}<p class="empty">{p.username} has not shared or liked anything yet.</p>{/if}
</main>

<style>
	main {
		--ink: #26335f;
		--muted: #5d6385;
		--line-strong: #c9bb92;
		--surface: #fbf5e4;
		--wash: #f3e9c9;
		--accent-deep: #8f3a2a;
		max-width: 912px;
		width: 100%;
		flex: 1;
		margin: 0 auto;
		padding: 24px 16px 64px;
		color: var(--ink);
	}
	.who { display: flex; align-items: center; gap: 16px; margin-bottom: 20px; }
	.avatar { display: grid; place-items: center; flex: none; width: 72px; height: 72px; overflow: hidden; border-radius: 50%; background: #465e9d; color: #faf3dc; font: 600 30px / 1 var(--display); box-shadow: 0 0 0 3px #faf3dc, 0 3px 0 3px #465e9d; }
	.avatar img { width: 100%; height: 100%; object-fit: cover; }
	.eyebrow { margin: 0 0 4px; color: var(--accent-deep); font-size: 12px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; }
	h1 { margin: 0; font-family: var(--display); font-size: 36px; font-weight: 600; line-height: 1.1; overflow-wrap: anywhere; }
	.rav { color: #3d5aa8; font-size: 13px; }
	.bio { margin-bottom: 28px; padding: 16px; border: 1px solid var(--line-strong); border-radius: 12px; background: var(--surface); }
	.about { margin: 0; font-size: 15px; line-height: 1.5; white-space: pre-line; overflow-wrap: anywhere; text-wrap: pretty; }
	dl { display: flex; flex-wrap: wrap; gap: 8px 24px; margin: 0; }
	.about + dl { margin-top: 12px; }
	dl div { min-width: 0; }
	dt { color: var(--muted); font-size: 11px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; }
	dd { margin: 0; font-size: 14px; overflow-wrap: anywhere; }
	section { margin-bottom: 32px; }
	h2 { margin: 0 0 12px; font-family: var(--display); font-size: 22px; font-weight: 600; }
	h2 small { color: var(--muted); font: 500 14px system-ui, sans-serif; }
	h3 { margin: 16px 0 8px; color: var(--muted); font-size: 12px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; }
	ul { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 12px; margin: 0; padding: 0; list-style: none; }
	.rav:focus-visible { outline: 2px solid var(--focus); outline-offset: 2px; }
	.empty { margin: 0; color: var(--muted); }
</style>
