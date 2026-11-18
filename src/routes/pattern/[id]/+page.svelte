<script lang="ts">
	import { goto } from '$app/navigation';
	import Seo from '$lib/Seo.svelte';
	import PatternPage from '$lib/sweater/PatternPage.svelte';
	import { estimate, writePattern } from '$lib/sweater/pattern';
	import { encodeDesign, type Mode, type Progress } from '$lib/sweater/progress';
	import { saveDesign } from '$lib/sweater/designs';
	import { designDetail } from '$lib/sweater/random';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let design = $derived(data.pattern.design);
	let pattern = $derived(writePattern(design));
	let est = $derived(estimate(design));
	let mode = $state<Mode>('beginner');
	// Someone reading a pattern that is not theirs keeps their place only while the page is open.
	let progress = $state<Progress>({});
	function setStep(key: string, value: number) {
		if (value > 0) progress[key] = value;
		else delete progress[key];
	}
	async function unshare() {
		if (!confirm(`Remove “${data.pattern.name}” from the catalogue? Its link will stop working.`)) return;
		const response = await fetch(`/api/patterns/${data.pattern.id}`, { method: 'DELETE' });
		if (response.ok) await goto('/pattern');
		else alert('Could not remove it. Try again.');
	}
</script>

<Seo title="{data.pattern.name} — knit" description="{designDetail(design)}. A free knitting pattern shared by {data.pattern.author}, adjustable to your yarn, gauge and size." path="/pattern/{data.pattern.id}" />

{#if pattern.ok}
	<PatternPage
		{design}
		{pattern}
		{est}
		label={data.pattern.name}
		author={data.pattern.author}
		sharedId={data.pattern.id}
		bind:mode
		{progress}
		onstep={setStep}
		onreset={() => (progress = {})}
		onedit={() => goto(`/design#d=${encodeDesign(design)}`)}
		onsave={() => saveDesign(design, data.pattern.name)}
		onunshare={data.mine ? unshare : undefined}
	/>
{/if}
