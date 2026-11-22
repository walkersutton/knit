<script lang="ts">
	import Seo from '$lib/Seo.svelte';
	import YourWork from '$lib/sweater/YourWork.svelte';
	import { onMount } from 'svelte';
	import Browse from '$lib/sweater/Browse.svelte';
	import type { BrowseItem } from '$lib/sweater/BrowseCard.svelte';
	import Stills from '$lib/sweater/Stills.svelte';
	import { chartDesign, chartSize, GARMENTS, isCenterpieceChart, previewLink } from '$lib/sweater/library';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	// ── Each chart knitted into the garment the knitter picks ──
	const GARMENT_KEY = 'knit-it:chart-garment:v1';
	let garment = $state('Sweater');
	let mounted = $state(false);
	/** Drawn pictures, by garment and chart; a chart keeps its picture while it is on the page. */
	let pictures = $state<Record<string, string>>({});
	const key = (g: string, id: string) => `${g}|${id}`;

	onMount(() => {
		try {
			const saved = localStorage.getItem(GARMENT_KEY);
			if (saved && GARMENTS.includes(saved)) garment = saved;
		} catch {
			// No storage: the sweater it is.
		}
		mounted = true;
	});

	function pick(next: string) {
		garment = next;
		try {
			localStorage.setItem(GARMENT_KEY, next);
		} catch {
			// The choice just isn't remembered.
		}
	}

	// A centerpiece has no 3D preview of its own, so it opens on its page.
	let items = $derived<BrowseItem[]>(
		data.charts.map((c) => {
			const cp = isCenterpieceChart(c.motif);
			return {
				id: c.id,
				href: cp ? `/chart/${c.id}` : previewLink(c.motif, c.color, c.contrast, mounted ? garment : undefined, c.id),
				name: c.name,
				author: c.author,
				authorPhoto: c.authorPhoto,
				detail: chartSize(c.motif),
				likes: c.likes,
				createdAt: c.createdAt,
				alt: cp ? `${c.name} on the front of a ${garment.toLowerCase()}` : `A ${garment.toLowerCase()} knitted all over in ${c.name}`,
				fallback: { motif: c.motif, color: c.color, contrast: c.contrast }
			};
		})
	);
	let jobs = $derived(data.charts.map((c) => ({ key: key(garment, c.id), design: chartDesign(c.motif, c.color, c.contrast, garment) })));
</script>

<Seo title="Colourwork charts — knit" description="Browse two-colour knitting charts shared by knitters, and put any of them on your own sweater with a free written pattern." path="/chart" />

<Browse
	title="Charts"
	noun="chart"
	newHref="/design#tool=chart"
	base="/chart"
	facets={data.facets}
	sort={data.sort}
	page={data.page}
	more={data.more}
	{items}
	unavailable={data.unavailable}
	picture={(item) => (mounted ? pictures[key(garment, item.id)] : undefined)}
	show={{ label: 'Show on', options: GARMENTS, value: garment, pick }}
>
	{#snippet blank()}Nobody has shared a chart yet. <a href="/design#tool=chart">Draw one</a> and be the first.{/snippet}
	<YourWork kind="chart" />
</Browse>
<Stills {jobs} bind:pictures />
