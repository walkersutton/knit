<script lang="ts">
	import Seo from '$lib/Seo.svelte';
	import YourWork from '$lib/sweater/YourWork.svelte';
	import Browse from '$lib/sweater/Browse.svelte';
	import type { BrowseItem } from '$lib/sweater/BrowseCard.svelte';
	import Stills from '$lib/sweater/Stills.svelte';
	import { patternPath } from '$lib/site';
	import { designDetail } from '$lib/sweater/random';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	/** Drawn pictures by pattern; a pattern keeps its picture while it is on the page. */
	let pictures = $state<Record<string, string>>({});

	let items = $derived<BrowseItem[]>(
		data.patterns.map((p) => ({
			id: p.id,
			href: patternPath(p),
			name: p.name,
			author: p.author,
			authorPhoto: p.authorPhoto,
			detail: designDetail(p.design),
			likes: p.likes,
			createdAt: p.createdAt,
			alt: `${p.name}, a ${p.design.garment.toLowerCase()}`,
			fallback: { color: p.design.color, contrast: p.design.contrast }
		}))
	);
	let jobs = $derived(data.patterns.map((p) => ({ key: p.id, design: p.design })));
</script>

<Seo title="Knitting patterns — knit" description="Browse free sweater, cardigan, slipover and tee knitting patterns shared by knitters, and open any of them to adapt to your own yarn, gauge and size." path="/pattern" />

<Browse
	title="Patterns"
	noun="pattern"
	newHref="/design"
	base="/pattern"
	facets={data.facets}
	sort={data.sort}
	page={data.page}
	more={data.more}
	{items}
	unavailable={data.unavailable}
	picture={(item) => pictures[item.id]}
>
	{#snippet blank()}Nobody has shared a pattern yet. <a href="/design">Design one</a> and be the first.{/snippet}
	<YourWork kind="pattern" />
</Browse>
<Stills {jobs} bind:pictures />
