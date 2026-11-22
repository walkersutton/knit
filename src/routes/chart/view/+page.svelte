<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import Author from '$lib/Author.svelte';
	import Seo from '$lib/Seo.svelte';
	import ChartGrid from '$lib/sweater/ChartGrid.svelte';
	import Notes from '$lib/sweater/Notes.svelte';
	import Stage from '$lib/sweater/Stage.svelte';
	import { DEFAULT_DESIGN } from '$lib/sweater/defaults';
	import type { Design } from '$lib/sweater/garment';
	import { chartDesign, cleanNotes, designLink, editLink, freshName, GARMENTS, loadLibrary, loadOwnCharts, newId, previewLink, readMotifHash, saveLibrary } from '$lib/sweater/library';
	import { contrastShare, longestFloat, tileOfMotif } from '$lib/sweater/motifs';

	/** A chart that is not shared: it travels in the link's hash (#motif=…&color=…&contrast=…), so nothing is stored. */

	let chart = $state<{ motif: string; color: string; contrast: string }>();
	let garment = $state(GARMENTS[0]);
	let sharedId = $state<string>();
	let ready = $state(false);

	let design = $derived<Design | undefined>(chart && chartDesign(chart.motif, chart.color, chart.contrast, garment));
	let tile = $derived(tileOfMotif(chart?.motif));
	let share = $derived(chart ? Math.round(contrastShare('Custom', chart.motif) * 100) : 0);
	let float = $derived(chart ? longestFloat('Custom', chart.motif) : 0);

	/**
	 * Whose chart this is decides its name and who may write its notes: a shared chart shows its
	 * author's notes (editable by the author); one of the knitter's own charts keeps notes in their
	 * library; any other chart joins the library when a note is first typed.
	 */
	type Owner =
		| { kind: 'shared'; name: string; author: string; authorPhoto: string | null; notes: string; mine: boolean }
		| { kind: 'library'; id: string; name: string; notes: string }
		| { kind: 'none' };
	let owner = $state<Owner>({ kind: 'none' });
	let name = $derived(owner.kind === 'none' ? 'Untitled chart' : owner.name);

	function read() {
		const found = readMotifHash(location.hash);
		if (!found) return false;
		chart = { motif: found.motif, color: found.color ?? DEFAULT_DESIGN.color, contrast: found.contrast ?? DEFAULT_DESIGN.contrast };
		const q = new URLSearchParams(location.hash.slice(1));
		sharedId = q.get('id') ?? undefined;
		const g = q.get('garment');
		if (g && GARMENTS.includes(g)) garment = g;
		identify();
		return true;
	}

	function fromLibrary(): Owner {
		// Not the placeholder chart the designer makes for a new browser: that one is not really theirs.
		const p = chart && loadOwnCharts().charts.find((q) => q.motif === chart!.motif);
		return p ? { kind: 'library', id: p.id, name: p.name, notes: p.notes ?? '' } : { kind: 'none' };
	}
	let asked = 0;
	async function identify() {
		const mine = ++asked;
		owner = fromLibrary();
		if (!sharedId) return;
		try {
			const response = await fetch(`/api/charts/${encodeURIComponent(sharedId)}`);
			if (!response.ok || mine !== asked) return;
			const s = await response.json();
			owner = { kind: 'shared', name: s.name, author: s.author, authorPhoto: s.authorPhoto, notes: s.notes ?? '', mine: !!s.mine };
		} catch {
			// Offline or taken down: the chart still shows, as one of the knitter's own or unnamed.
		}
	}

	onMount(() => {
		// Opened without a chart (a mistyped or old link): the chart library has the real ones.
		if (!read()) goto('/chart', { replaceState: true });
		ready = true;
	});

	/** Keep the link current, so copying the address shares what is on screen. */
	function pick(next: string) {
		garment = next;
		if (chart) history.replaceState(null, '', previewLink(chart.motif, chart.color, chart.contrast, next, sharedId));
	}

	async function saveShared(notes: string) {
		const response = await fetch(`/api/charts/${encodeURIComponent(sharedId!)}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ notes }) });
		if (!response.ok) throw new Error((await response.json().catch(() => null))?.message ?? 'Could not save the notes.');
	}
	/** Notes on one of the knitter's own charts, or on a chart that joins their library with this first note. */
	function saveLocal(text: string) {
		if (!chart) return;
		const lib = loadLibrary();
		const notes = cleanNotes(text);
		let p = lib.patterns.find((q) => owner.kind === 'library' && q.id === owner.id) ?? lib.patterns.find((q) => q.motif === chart!.motif);
		if (!p) {
			if (!notes) return;
			p = { id: newId(), name: freshName('From a link', lib.patterns.map((q) => q.name)), motif: chart.motif };
			lib.patterns.push(p);
		}
		if (notes) p.notes = notes;
		else delete p.notes;
		saveLibrary(lib);
		owner = { kind: 'library', id: p.id, name: p.name, notes: p.notes ?? '' };
	}
</script>

<svelte:window onhashchange={read} />

<Seo title="Chart on a sweater — knit" description="See a knitting chart on a 3D sweater before you cast on." path="/chart/view" noindex />

<main>
	{#if design && chart}
		<div class="stage"><Stage {design} intro={false} /></div>
		<div class="seg" role="radiogroup" aria-label="Garment">
			{#each GARMENTS as g (g)}
				<button type="button" role="radio" aria-checked={garment === g} onclick={() => pick(g)}>{g}</button>
			{/each}
		</div>
		<aside>
			<header>
				<p class="eyebrow">
					{#if owner.kind === 'shared'}Shared by <Author name={owner.author} photo={owner.authorPhoto} />{:else if owner.kind === 'library'}From your charts{:else}Chart preview{/if}
				</p>
				<h1>{name}</h1>
			</header>

			<figure>
				<div class="chart"><ChartGrid motif={chart.motif} color={chart.color} contrast={chart.contrast} label="{name}: one repeat, {tile.st} stitches by {tile.rows} rows" /></div>
				<figcaption>
					<span>One repeat · {tile.st} sts × {tile.rows} rows{tile.fine ? ' · fine' : ''}</span>
					<span>{share}% pattern colour</span>
				</figcaption>
			</figure>
			{#if float > 5}<p class="warn">Floats of {float} stitches can snag; the written pattern says where to catch them.</p>{/if}

			<!-- A first note joining the library must not remount the box mid-sentence, so only a change of chart (or of author) does. -->
			{#key `${owner.kind === 'shared' ? 'shared' : 'local'}:${chart.motif}`}
				{#if owner.kind === 'shared'}
					<Notes value={owner.notes} onsave={owner.mine ? saveShared : undefined} label={owner.mine ? 'Notes' : 'From the designer'} hint={owner.mine ? 'Everyone who opens this chart sees these notes.' : undefined} />
				{:else}
					<Notes value={owner.kind === 'library' ? owner.notes : ''} onsave={saveLocal} placeholder="Yarn, ideas, where you found it…" hint={owner.kind === 'library' ? 'Kept with this chart in your charts.' : 'A note saves this chart to your charts.'} />
				{/if}
			{/key}

			<div class="actions">
				<a class="stitch block" href={designLink(chart.motif, chart.color, chart.contrast)}>Use on my sweater</a>
				<div class="row">
					<a class="stitch quiet block" href={editLink(chart.motif)}>Edit chart</a>
					{#if sharedId}<a class="stitch quiet block" href="/chart/{encodeURIComponent(sharedId)}">Chart page</a>{/if}
				</div>
			</div>
		</aside>
	{:else if !ready}
		<p class="loading">Loading…</p>
	{/if}
</main>

<style>
	main {
		--ink: #26335f;
		--muted: #5d6385;
		--line-strong: #c9bb92;
		--surface: #fbf5e4;
		--wash: #f3e9c9;
		--hairline: rgb(38 51 95 / 0.12);
		--accent: #c8543e;
		--accent-deep: #8f3a2a;
		display: grid;
		grid-template-columns: minmax(0, 1fr) 360px;
		height: calc(100dvh - var(--bar));
		color: var(--ink);
		font-family: system-ui, -apple-system, 'SF Pro Text', 'Segoe UI', Roboto, sans-serif;
	}

	/* ── The garment, with what it is knitted on floating at its foot ── */
	.stage {
		position: relative;
		grid-area: 1 / 1;
		min-height: 320px;
	}
	.seg {
		grid-area: 1 / 1;
		align-self: end;
		justify-self: center;
		z-index: 1;
		margin-bottom: 20px;
		display: flex;
		padding: 3px;
		border: 1px solid var(--line-strong);
		border-radius: 10px;
		background: color-mix(in srgb, var(--surface) 88%, transparent);
		backdrop-filter: blur(8px);
		box-shadow: 0 2px 8px rgb(38 51 95 / 0.08);
	}
	.seg button {
		height: 30px;
		padding: 0 12px;
		border: 0;
		border-radius: 7px;
		background: none;
		color: var(--ink);
		font: inherit;
		font-size: 14px;
		font-weight: 500;
		white-space: nowrap;
		cursor: pointer;
		transition: background-color 120ms ease-out;
	}
	.seg button[aria-checked='true'] {
		background: #fffdf6;
		box-shadow: 0 1px 2px rgb(38 51 95 / 0.2);
	}

	/* ── The chart itself, its notes and what to do with it ── */
	aside {
		grid-area: 1 / 2 / span 1;
		display: flex;
		flex-direction: column;
		gap: 20px;
		overflow-y: auto;
		padding: 24px 20px;
		border-left: 1px solid var(--hairline);
		background: var(--surface);
	}
	.eyebrow {
		margin: 0 0 4px;
		color: var(--accent-deep);
		font-size: 12px;
		font-weight: 600;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}
	h1 {
		margin: 0;
		font: 600 28px/1.15 var(--display);
		overflow-wrap: anywhere;
	}
	figure {
		display: grid;
		gap: 8px;
		margin: 0;
	}
	.chart {
		padding: 10px 6px 10px 10px;
		border-radius: 10px;
		background: #fffdf6;
		box-shadow: 0 0 0 1px var(--hairline), 0 4px 14px rgb(38 51 95 / 0.06);
	}
	figcaption {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		gap: 4px 12px;
		color: var(--muted);
		font-size: 13px;
		font-variant-numeric: tabular-nums;
	}
	.warn {
		margin: -12px 0 0;
		padding: 8px 10px;
		border-radius: 6px;
		background: #f7e3b5;
		color: #6e4700;
		font-size: 13px;
	}
	.actions {
		display: grid;
		gap: 8px;
	}
	.row {
		display: flex;
		gap: 8px;
	}
	.row > * {
		flex: 1;
	}
	.seg button:active {
		filter: brightness(0.93);
	}
	.seg button:focus-visible {
		outline: 2px solid var(--focus);
		outline-offset: 2px;
	}
	.loading {
		margin: 24px 16px;
		color: var(--muted);
	}
	@media (hover: hover) and (pointer: fine) {
		.seg button[aria-checked='false']:hover {
			background: rgb(255 253 246 / 0.6);
		}
	}
	@media (max-width: 760px) {
		main {
			grid-template-columns: minmax(0, 1fr);
			grid-template-rows: minmax(340px, 58dvh) auto auto;
			height: auto;
		}
		/* Under the garment rather than over it, clear of its own buttons. */
		.seg {
			grid-area: 2 / 1;
			margin: 12px 16px;
			max-width: calc(100% - 32px);
			overflow-x: auto;
		}
		aside {
			grid-area: 3 / 1;
			overflow: visible;
			padding: 20px 16px 32px;
			border-top: 1px solid var(--hairline);
			border-left: 0;
		}
		.seg button {
			padding: 0 10px;
		}
	}
</style>
