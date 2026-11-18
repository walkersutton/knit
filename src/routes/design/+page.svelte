<script lang="ts">
	import { onMount } from 'svelte';
	import Seo from '$lib/Seo.svelte';
	import ChartDesigner from '$lib/sweater/ChartDesigner.svelte';
	import DesignLibrary from '$lib/sweater/DesignLibrary.svelte';
	import SweaterDesigner, { type Incoming } from '$lib/sweater/SweaterDesigner.svelte';
	import { loadDesigns, type SavedDesign } from '$lib/sweater/designs';
	import { markDeleted } from '$lib/sweater/deletions';
	import { freshName, loadLibrary, newId, parseLibrary, readMotifHash, saveLibrary, wantsChart, type Library } from '$lib/sweater/library';
	import { blankMotif } from '$lib/sweater/motifs';

	const seo = {
		sweater: {
			title: 'Sweater designer — knit',
			description: 'Design a sweater, cardigan or tee in 3D and get a free written top-down raglan or set-in knitting pattern for your yarn, gauge and size.'
		},
		chart: {
			title: 'Chart designer — knit',
			description: 'Paint your own two-colour knitting chart, see it repeat across the fabric, and put it on a sweater with a free written pattern.'
		}
	};

	/** Which designer is open follows what is chosen in the sidebar: a chart opens the chart designer, a pattern the sweater designer. */
	let tool = $state<'chart' | 'sweater'>('sweater');
	const initial = parseLibrary(null);
	let lib = $state<Library>(initial);
	let selected = $state(initial.patterns[0].id);
	let designs = $state<SavedDesign[]>([]);
	/** Handed to the sweater designer, which clears it once it has taken it. */
	let incoming = $state<Incoming>();

	let current = $derived(lib.patterns.find((p) => p.id === selected) ?? lib.patterns[0]);

	function add(motif = blankMotif(), name = 'Untitled') {
		const p = { id: newId(), name: freshName(name, lib.patterns.map((q) => q.name)), motif };
		lib.patterns.push(p);
		selected = p.id;
		tool = 'chart';
	}
	function remove() {
		if (!confirm(`Delete “${current.name}”? This can't be undone.`)) return;
		markDeleted('chart', current.id);
		const at = lib.patterns.findIndex((p) => p.id === current.id);
		lib.patterns.splice(at, 1);
		if (!lib.patterns.length) add();
		selected = lib.patterns[Math.max(0, at - 1)].id;
	}
	/** Edit this chart, adding it to the library first if it came from somewhere else. */
	function editChart(motif: string) {
		const known = lib.patterns.find((p) => p.motif === motif);
		if (known) {
			selected = known.id;
			tool = 'chart';
		} else add(motif, 'From my sweater');
	}
	function useChart() {
		incoming = { chart: { motif: current.motif, color: lib.color, contrast: lib.contrast } };
		tool = 'sweater';
	}

	const refreshDesigns = () => (designs = loadDesigns());
	let restored = $state(false);
	onMount(() => {
		lib = loadLibrary();
		selected = lib.patterns[0].id;
		refreshDesigns();
		// A link can ask for the chart designer (a chart opened from the chart library, or an old /design/chart link).
		if (wantsChart(location.hash)) {
			const linked = readMotifHash(location.hash);
			if (linked) editChart(linked.motif);
			else tool = 'chart';
			history.replaceState(null, '', location.pathname);
		}
		restored = true;
		// Saving a design, or signing in and merging an account, changes what the sidebar lists.
		addEventListener('knit:local-save', refreshDesigns);
		addEventListener('knit:account-merged', refreshDesigns);
		return () => {
			removeEventListener('knit:local-save', refreshDesigns);
			removeEventListener('knit:account-merged', refreshDesigns);
		};
	});
	$effect(() => {
		const snapshot = $state.snapshot(lib);
		if (restored) saveLibrary(snapshot);
	});
</script>

<Seo {...seo[tool]} path="/design" />

<div class="shell">
	<DesignLibrary
		{tool}
		charts={lib.patterns}
		{selected}
		color={lib.color}
		contrast={lib.contrast}
		{designs}
		onchart={(id) => {
			selected = id;
			tool = 'chart';
		}}
		onnewchart={() => add()}
		oncurrent={() => (tool = 'sweater')}
		onopen={(d) => {
			incoming = { design: d.design };
			tool = 'sweater';
		}}
	/>
	<div class="work">
		{#if tool === 'chart'}
			<ChartDesigner bind:lib {selected} onadd={add} onuse={useChart} onremove={remove} />
		{:else}
			<SweaterDesigner {incoming} onconsumed={() => (incoming = undefined)} onEditChart={editChart} />
		{/if}
	</div>
</div>

<style>
	/* The same cream paper and navy ink as both designers, so the sidebar matches whichever is open. */
	.shell {
		--ink: #26335f;
		--muted: #5d6385;
		--line-strong: #c9bb92;
		--surface: #fbf5e4;
		--wash: #f3e9c9;
		--hairline: rgb(38 51 95 / 0.12);
		display: grid;
		grid-template-columns: 220px minmax(0, 1fr);
		height: calc(100dvh - var(--bar));
		font-family: system-ui, -apple-system, 'SF Pro Text', 'Segoe UI', Roboto, sans-serif;
	}
	.work {
		min-width: 0;
		min-height: 0;
	}
	@media (max-width: 760px) {
		.shell {
			display: block;
			height: auto;
		}
		.work {
			min-height: calc(100dvh - var(--bar));
		}
	}
	@media print {
		.shell {
			display: block;
			height: auto;
		}
		.shell > :global(.library) {
			display: none;
		}
	}
</style>
