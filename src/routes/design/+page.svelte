<script lang="ts">
	import { onMount } from 'svelte';
	import Seo from '$lib/Seo.svelte';
	import ChartDesigner from '$lib/sweater/ChartDesigner.svelte';
	import CenterpieceDesigner from '$lib/sweater/CenterpieceDesigner.svelte';
	import { blankCenterpiece, encodeCenterpiece, parseCenterpiece } from '$lib/sweater/centerpiece';
	import DesignLibrary from '$lib/sweater/DesignLibrary.svelte';
	import SweaterDesigner, { type Incoming } from '$lib/sweater/SweaterDesigner.svelte';
	import { DEFAULT_DESIGN } from '$lib/sweater/defaults';
	import { deleteDesign, loadDesigns, saveDesign, type SavedDesign } from '$lib/sweater/designs';
	import { markDeleted } from '$lib/sweater/deletions';
	import { freshName, loadLibrary, newId, parseLibrary, readMotifHash, saveLibrary, wantsCenterpiece, wantsChart, type Library } from '$lib/sweater/library';
	import { blankMotif } from '$lib/sweater/motifs';

	const seo = {
		sweater: {
			title: 'Sweater designer — knit',
			description: 'Design a sweater, cardigan or tee in 3D and get a free written top-down raglan or set-in knitting pattern for your yarn, gauge and size.'
		},
		chart: {
			title: 'Chart designer — knit',
			description: 'Paint your own two-colour knitting chart, see it repeat across the fabric, and put it on a sweater with a free written pattern.'
		},
		centerpiece: {
			title: 'Centerpiece designer — knit',
			description: 'Type a word, draw a picture or turn an image into stitches, and knit it once on the front of your sweater with a free written pattern.'
		}
	};

	/** Which designer is open follows what is chosen in the sidebar: a chart opens the chart designer, a centerpiece the centerpiece designer, a pattern the sweater designer. */
	let tool = $state<'chart' | 'centerpiece' | 'sweater'>('sweater');
	const initial = parseLibrary(null);
	let lib = $state<Library>(initial);
	let selected = $state(initial.patterns[0].id);
	let selectedCenterpiece = $state<string>();
	let designs = $state<SavedDesign[]>([]);
	/** Handed to the sweater designer, which clears it once it has taken it. */
	let incoming = $state<Incoming>();
	/** The saved design open in the sweater designer, which saves its edits as they are made. */
	let activeId = $state<string>();
	let active = $derived(designs.find((d) => d.id === activeId));

	let current = $derived(lib.patterns.find((p) => p.id === selected) ?? lib.patterns[0]);

	function add(motif = blankMotif(), name = 'Untitled') {
		const p = { id: newId(), name: freshName(name, lib.patterns.map((q) => q.name)), motif };
		lib.patterns.push(p);
		selected = p.id;
		tool = 'chart';
	}
	/** A new centerpiece starts as a blank grid: the designer offers a word, drawing or picture to fill it. */
	function addCenterpiece(centerpiece = encodeCenterpiece(blankCenterpiece()), name = 'Untitled centerpiece') {
		const c = { id: newId(), name: freshName(name, lib.centerpieces.map((q) => q.name)), centerpiece };
		lib.centerpieces.push(c);
		selectedCenterpiece = c.id;
		tool = 'centerpiece';
	}
	function removeCenterpiece() {
		const current = lib.centerpieces.find((c) => c.id === selectedCenterpiece);
		if (!current || !confirm(`Delete “${current.name}”? This can't be undone.`)) return;
		markDeleted('centerpiece', current.id);
		const at = lib.centerpieces.findIndex((c) => c.id === current.id);
		lib.centerpieces.splice(at, 1);
		if (lib.centerpieces.length) selectedCenterpiece = lib.centerpieces[Math.max(0, at - 1)].id;
		else addCenterpiece();
	}
	/** Edit this centerpiece, adding it to the library first if it came from somewhere else. */
	function editCenterpiece(centerpiece: string, name = 'From a link') {
		const known = lib.centerpieces.find((c) => c.centerpiece === centerpiece);
		if (known) {
			selectedCenterpiece = known.id;
			tool = 'centerpiece';
		} else addCenterpiece(centerpiece, name);
	}
	function openCenterpieces() {
		if (lib.centerpieces.some((c) => c.id === selectedCenterpiece)) tool = 'centerpiece';
		else if (lib.centerpieces.length) {
			selectedCenterpiece = lib.centerpieces[0].id;
			tool = 'centerpiece';
		} else addCenterpiece();
	}
	function useCenterpiece() {
		const current = lib.centerpieces.find((c) => c.id === selectedCenterpiece);
		if (!current) return;
		incoming = { centerpiece: { centerpiece: current.centerpiece, color: lib.color, contrast: lib.contrast } };
		tool = 'sweater';
	}

	/** A new pattern joins the sidebar straight away, like a new chart, and keeps itself saved as it is edited. */
	function newPattern() {
		const item = saveDesign({ ...DEFAULT_DESIGN }, freshName('Untitled sweater', designs.map((d) => d.name)));
		if (!item) return alert('Could not start a new pattern: this browser is out of storage.');
		refreshDesigns();
		activeId = item.id;
		incoming = { design: item.design };
		tool = 'sweater';
	}
	function removePattern() {
		if (!active || !confirm(`Delete “${active.name}”? This can't be undone.`)) return;
		const { id } = active;
		activeId = undefined;
		deleteDesign(id);
		refreshDesigns();
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

	/** Delete (or Backspace, which is the Mac's delete key) removes whatever is selected, unless the knitter is typing. */
	function onkeydown(e: KeyboardEvent) {
		if ((e.key !== 'Delete' && e.key !== 'Backspace') || e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
		if ((e.target as HTMLElement).closest('input, textarea, select, [contenteditable], [role="grid"], dialog')) return;
		e.preventDefault();
		if (tool === 'chart') remove();
		else if (tool === 'centerpiece') removeCenterpiece();
		else removePattern();
	}

	const refreshDesigns = () => (designs = loadDesigns());
	let restored = $state(false);
	onMount(() => {
		lib = loadLibrary();
		selected = lib.patterns[0].id;
		refreshDesigns();
		// A link can ask for the centerpiece designer, with a centerpiece to edit (one opened from the chart library).
		if (wantsCenterpiece(location.hash)) {
			const linked = new URLSearchParams(location.hash.slice(1)).get('centerpiece');
			if (parseCenterpiece(linked)) editCenterpiece(linked!);
			else openCenterpieces();
			history.replaceState(null, '', location.pathname);
		}
		// A link can ask for the chart designer (a chart opened from the chart library, or an old /design/chart link).
		else if (wantsChart(location.hash)) {
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

<svelte:window {onkeydown} />

<Seo {...seo[tool]} path="/design" />

<div class="shell">
	<DesignLibrary
		{tool}
		charts={lib.patterns}
		{selected}
		centerpieces={lib.centerpieces}
		{selectedCenterpiece}
		color={lib.color}
		contrast={lib.contrast}
		{designs}
		active={active?.id}
		onchart={(id) => {
			selected = id;
			tool = 'chart';
		}}
		onnewchart={() => add()}
		oncenterpiece={(id) => {
			selectedCenterpiece = id;
			tool = 'centerpiece';
		}}
		onnewcenterpiece={() => addCenterpiece()}
		onnewpattern={newPattern}
		onopen={(d) => {
			activeId = d.id;
			incoming = { design: d.design };
			tool = 'sweater';
		}}
	/>
	<div class="work">
		{#if tool === 'chart'}
			<ChartDesigner bind:lib {selected} onadd={add} onuse={useChart} onremove={remove} />
		{:else if tool === 'centerpiece' && selectedCenterpiece}
			<CenterpieceDesigner bind:lib selected={selectedCenterpiece} onadd={addCenterpiece} onuse={useCenterpiece} onremove={removeCenterpiece} />
		{:else}
			<SweaterDesigner {incoming} {active} onsaved={(id) => (activeId = id)} onremove={removePattern} onconsumed={() => (incoming = undefined)} onEditChart={editChart} />
		{/if}
	</div>
</div>

<style>
	/* The same cream paper and navy ink as both designers, so the sidebar matches whichever is open. */
	/* The designers sit on plain paper: no knit-stitch texture behind the 3D stage or the page. */
	:global(body:has(.shell)) {
		background: var(--paper);
	}
	.shell {
		--knit: none;
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
