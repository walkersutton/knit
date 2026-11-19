<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import Seo from '$lib/Seo.svelte';
	import PatternPage from '$lib/sweater/PatternPage.svelte';
	import { DEFAULT_DESIGN } from '$lib/sweater/defaults';
	import { loadDesigns, saveDesign, type SavedDesign } from '$lib/sweater/designs';
	import { estimate, writePattern } from '$lib/sweater/pattern';
	import { decodeDesign, encodeDesign, load, save, signature, type Mode, type Progress, type Saved } from '$lib/sweater/progress';
	import { summary } from '$lib/sweater/options';
	import type { Design } from '$lib/sweater/garment';

	/** The pattern for a design that has not been shared: the design travels in the link's hash, and the knitter's place stays in this browser. */
	let design = $state<Design>();
	let saved = $state<Saved>({ needles: [], progress: {} });
	let mode = $state<Mode>('beginner');
	let ready = $state(false);
	let sig = $derived(design ? signature(design) : '');
	let place = $derived(saved.progress[sig] ?? {});
	let pattern = $derived(design ? writePattern(design) : undefined);
	/** The saved design this pattern is written from, if the knitter has saved it: its notes are shown and edited here. */
	let savedAs = $state<SavedDesign>();
	const findSaved = () => {
		const d = design;
		savedAs = d ? loadDesigns().find((s) => signature(s.design) === sig && s.design.color === d.color && s.design.contrast === d.contrast) : undefined;
	};
	function saveNotes(text: string) {
		if (savedAs && !saveDesign(savedAs.design, savedAs.name, savedAs.id, text)) throw new Error('This browser is out of storage.');
	}

	onMount(() => {
		saved = load(DEFAULT_DESIGN);
		if (saved.mode) mode = saved.mode;
		design = location.hash.startsWith('#d=') ? decodeDesign(location.hash.slice(3), DEFAULT_DESIGN) : undefined;
		// Opened without a design (a mistyped or old link): back to the designer, which has the last one.
		if (!design || !writePattern(design).ok) goto('/design', { replaceState: true });
		findSaved();
		ready = true;
		addEventListener('knit:local-save', findSaved);
		return () => removeEventListener('knit:local-save', findSaved);
	});
	$effect(() => {
		const state: Saved = { ...$state.snapshot(saved), mode };
		if (ready && design) save(state, sig);
	});
	function setStep(key: string, value: number) {
		const p = (saved.progress[sig] ??= {});
		if (value > 0) p[key] = value;
		else delete p[key];
	}
	const name = () => (design ? summary(design) : '');
</script>

<Seo title="Your pattern — knit" description="A written knitting pattern for your own sweater design." path="/pattern/view" noindex />

{#if design && pattern?.ok}
	<PatternPage
		{design}
		{pattern}
		est={estimate(design)}
		label={savedAs?.name ?? name()}
		notes={savedAs?.notes ?? ''}
		onnotes={savedAs ? saveNotes : undefined}
		notesHint="Kept with your saved design, and shared with it."
		bind:mode
		progress={place as Progress}
		onstep={setStep}
		onreset={() => delete saved.progress[sig]}
		onedit={() => goto(`/design#d=${encodeDesign(design!)}`)}
		onsave={() => {
			const n = prompt('Name this sweater design:', name());
			if (n !== null && design) saveDesign(design, n);
		}}
	/>
{/if}
