<script lang="ts">
	import { goto } from '$app/navigation';
	import Author from '$lib/Author.svelte';
	import LikeButton from '$lib/LikeButton.svelte';
	import Seo from '$lib/Seo.svelte';
	import MotifSwatch from '$lib/sweater/MotifSwatch.svelte';
	import Notes from '$lib/sweater/Notes.svelte';
	import { chartToText } from '$lib/sweater/chartText';
	import { centerpieceDesignLink, centerpieceEditLink, chartSize, designLink, freshName, loadLibrary, newId, previewLink, saveLibrary } from '$lib/sweater/library';
	import { countOn, longestStrand, parseCenterpiece } from '$lib/sweater/centerpiece';
	import { contrastShare, longestFloat } from '$lib/sweater/motifs';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let chart = $derived(data.chart);
	/** A centerpiece is worked once on the front; any other chart repeats all over. */
	let cp = $derived(parseCenterpiece(chart.motif));
	let size = $derived(chartSize(chart.motif));
	let share = $derived(Math.round((cp ? countOn(cp) / (cp.w * cp.h) : contrastShare('Custom', chart.motif)) * 100));
	let float = $derived(cp ? longestStrand(cp) : longestFloat('Custom', chart.motif));

	let status = $state<'idle' | 'saved' | 'linked' | 'texted'>('idle');
	function flash(next: typeof status) {
		status = next;
		setTimeout(() => (status = 'idle'), 2000);
	}
	let shareError = $state('');

	/** Add the chart to this browser's chart library, where the designer can edit it. */
	function save() {
		const lib = loadLibrary();
		// Saving the same chart twice does not add a copy.
		if (cp) {
			if (!lib.centerpieces.some((c) => c.centerpiece === chart.motif)) lib.centerpieces.push({ id: newId(), name: freshName(chart.name, lib.centerpieces.map((c) => c.name)), centerpiece: chart.motif });
		} else if (!lib.patterns.some((p) => p.motif === chart.motif)) {
			lib.patterns.push({ id: newId(), name: freshName(chart.name, lib.patterns.map((p) => p.name)), motif: chart.motif, ...(chart.notes && { notes: chart.notes }) });
		}
		lib.color = chart.color;
		lib.contrast = chart.contrast;
		saveLibrary(lib);
		flash('saved');
	}
	async function copy(text: string, done: 'linked' | 'texted') {
		shareError = '';
		try {
			await navigator.clipboard.writeText(text);
			flash(done);
		} catch {
			// No clipboard access: show it to copy by hand.
			shareError = text;
		}
	}
	/** The author edits the notes on their own chart's page; they are saved to the shared chart. */
	async function saveNotes(notes: string) {
		const response = await fetch(`/api/charts/${chart.id}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ notes }) });
		if (!response.ok) throw new Error((await response.json().catch(() => null))?.message ?? 'Could not save the notes.');
	}
	async function unshare() {
		if (!confirm(`Remove “${chart.name}” from the library? Its link will stop working.`)) return;
		const response = await fetch(`/api/charts/${chart.id}`, { method: 'DELETE' });
		if (response.ok) await goto('/chart');
		else alert('Could not remove it. Try again.');
	}
</script>

<Seo
	title="{chart.name} — knit"
	description={cp ? `A ${cp.w} × ${cp.h} two-colour centerpiece shared by ${chart.author}, worked once on the front of a sweater. Put it on yours and get a free written pattern.` : `A ${size} two-colour knitting chart shared by ${chart.author}. Put it on a sweater and get a free written pattern.`}
	path="/chart/{chart.id}"
	type="article"
	image="/og/chart/{chart.id}.png"
	imageAlt="{chart.name}, a {cp ? 'centerpiece' : 'colourwork chart'} by {chart.author}"
/>

<main>
	<p class="eyebrow">Shared by <Author name={chart.author} photo={chart.authorPhoto} /></p>
	<h1>{chart.name}</h1>
	<div class="layout">
		<div class="art">
			{#if cp}
				<div class="tile"><MotifSwatch motif={chart.motif} color={chart.color} contrast={chart.contrast} label="{chart.name}, a centerpiece worked once on the front" /></div>
			{:else}
				<div class="tile"><MotifSwatch motif={chart.motif} color={chart.color} contrast={chart.contrast} label="{chart.name}, one repeat of the chart" /></div>
				<div class="fabric"><MotifSwatch motif={chart.motif} color={chart.color} contrast={chart.contrast} across={4} down={2} label="{chart.name}, repeated 4 times across and twice down" /></div>
			{/if}
		</div>
		<aside>
			<p class="meta">{size} · {share}% pattern colour{cp ? ' · worked once on the front' : ''}</p>
			<div class="notes"><Notes value={chart.notes ?? ''} onsave={data.mine ? saveNotes : undefined} label={data.mine ? 'Notes' : 'From the designer'} hint={data.mine ? 'Everyone who opens this chart sees these notes.' : undefined} /></div>
			{#if float > 5}<p class="warn">Floats of {float} stitches can snag; the written pattern says where to catch them.</p>{/if}
			<LikeButton kind="chart" id={chart.id} likes={data.likes} liked={data.liked} signedIn={data.signedIn} />
			{#if cp}
				<a class="use" href={centerpieceDesignLink(chart.motif, chart.color, chart.contrast)}>Use on my sweater</a>
			{:else}
				<a class="use" href={designLink(chart.motif, chart.color, chart.contrast)}>Use on my sweater</a>
				<a class="btn" href={previewLink(chart.motif, chart.color, chart.contrast, undefined, chart.id)}>Preview in 3D</a>
			{/if}
			<div class="row">
				<button type="button" onclick={save}>{status === 'saved' ? 'Saved ✓' : cp ? 'Save to my centerpieces' : 'Save to my charts'}</button>
				<a class="btn" href={cp ? centerpieceEditLink(chart.motif) : `/design#${new URLSearchParams({ tool: 'chart', motif: chart.motif })}`}>Edit</a>
			</div>
			<div class="row">
				<button type="button" onclick={() => copy(location.href, 'linked')}>{status === 'linked' ? 'Link copied' : 'Copy link'}</button>
				{#if !cp}<button type="button" onclick={() => copy(chartToText(chart.name, chart.motif, chart.color, chart.contrast), 'texted')}>{status === 'texted' ? 'Copied ✓' : 'Copy text'}</button>{/if}
			</div>
			{#if shareError}<textarea readonly rows="6" onfocus={(e) => e.currentTarget.select()}>{shareError}</textarea>{/if}
			{#if data.mine}<button type="button" class="danger" onclick={unshare}>Unshare</button>{/if}
		</aside>
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
	h1 {
		margin: 0 0 20px;
		font-family: var(--display);
		font-size: 36px;
		font-weight: 600;
		overflow-wrap: anywhere;
	}
	.layout {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 280px;
		gap: 24px;
		align-items: start;
	}
	.art {
		display: grid;
		gap: 16px;
	}
	.tile,
	.fabric {
		overflow: hidden;
		border-radius: 10px;
		box-shadow: 0 0 0 1px rgb(38 51 95 / 0.15);
	}
	.tile {
		max-width: 360px;
	}
	aside {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}
	.meta,
	.warn {
		margin: 0;
		font-size: 13px;
		color: var(--muted);
	}
	.warn {
		color: var(--accent-deep);
	}
	.notes:empty {
		display: none;
	}
	.notes {
		margin: 4px 0;
	}
	.row {
		display: flex;
		gap: 8px;
	}
	.row > * {
		flex: 1;
	}
	button,
	.btn,
	.use {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		height: 40px;
		padding: 0 14px;
		border: 1.5px solid var(--line-strong);
		border-radius: 8px;
		background: #fffdf6;
		color: var(--ink);
		font: inherit;
		text-decoration: none;
		cursor: pointer;
	}
	.use {
		border-color: var(--accent-deep);
		background: var(--accent);
		color: #fff8e6;
		font-weight: 500;
	}
	.danger {
		color: var(--accent-deep);
	}
	textarea {
		width: 100%;
		border: 1.5px solid var(--line-strong);
		border-radius: 8px;
		background: #fffdf6;
		color: var(--ink);
		font: 12px/1.4 ui-monospace, monospace;
	}
	button:active,
	.btn:active,
	.use:active {
		filter: brightness(0.93);
	}
	button:focus-visible,
	.btn:focus-visible,
	.use:focus-visible,
	textarea:focus-visible {
		outline: 2px solid var(--focus);
		outline-offset: 2px;
	}
	@media (hover: hover) and (pointer: fine) {
		button:hover,
		.btn:hover {
			background: var(--wash);
		}
	}
	@media (max-width: 720px) {
		.layout {
			grid-template-columns: minmax(0, 1fr);
		}
	}
</style>
