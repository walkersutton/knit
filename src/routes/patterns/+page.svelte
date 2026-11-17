<script lang="ts">
	import { onMount } from 'svelte';
	import Logo from '$lib/Logo.svelte';
	import Seo from '$lib/Seo.svelte';
	import MotifEditor from '$lib/sweater/MotifEditor.svelte';
	import MotifSwatch from '$lib/sweater/MotifSwatch.svelte';
	import { chartToText, parseChartText } from '$lib/sweater/chartText';
	import { designLink, freshName, loadLibrary, newId, parseLibrary, readMotifHash, saveLibrary, type Library } from '$lib/sweater/library';
	import { blankMotif, contrastShare, longestFloat, TILE_ROWS, TILE_ST } from '$lib/sweater/motifs';
	import { colors } from '$lib/sweater/options';

	const title = 'Pattern designer — Knit It';
	const description = 'Paint your own two-colour knitting chart, see it repeat across the fabric, and put it on a sweater with a free written pattern.';

	const initial = parseLibrary(null);
	let lib = $state<Library>(initial);
	let selected = $state(initial.patterns[0].id);
	let current = $derived(lib.patterns.find((p) => p.id === selected) ?? lib.patterns[0]);
	let float = $derived(longestFloat('Custom', current.motif));
	let share = $derived(Math.round(contrastShare('Custom', current.motif) * 100));
	let editor = $state<MotifEditor>();

	function add(motif = blankMotif(), name = 'Untitled') {
		const p = { id: newId(), name: freshName(name, lib.patterns.map((q) => q.name)), motif };
		lib.patterns.push(p);
		selected = p.id;
	}
	function remove() {
		if (!confirm(`Delete “${current.name}”? This can't be undone.`)) return;
		const at = lib.patterns.findIndex((p) => p.id === current.id);
		lib.patterns.splice(at, 1);
		if (!lib.patterns.length) add();
		selected = lib.patterns[Math.max(0, at - 1)].id;
	}

	// ── Sharing as text ──
	let copied = $state(false);
	let pasting = $state(false);
	let pasteText = $state('');
	let pasteError = $state('');
	let pasteBox = $state<HTMLTextAreaElement>();
	const asText = () => chartToText(current.name, current.motif, lib.color, lib.contrast);

	async function copyText() {
		try {
			await navigator.clipboard.writeText(asText());
			copied = true;
			setTimeout(() => (copied = false), 1600);
		} catch {
			// No clipboard (an insecure page or a refusal): show the text so it can be copied by hand.
			pasting = true;
			pasteText = asText();
			queueMicrotask(() => pasteBox?.select());
		}
	}
	function saveText() {
		const url = URL.createObjectURL(new Blob([asText() + '\n'], { type: 'text/plain' }));
		const a = Object.assign(document.createElement('a'), { href: url, download: `${current.name.trim().replace(/[^\w\- ]+/g, '') || 'pattern'}.txt` });
		a.click();
		URL.revokeObjectURL(url);
	}
	async function openFile(e: Event) {
		const file = (e.currentTarget as HTMLInputElement).files?.[0];
		if (file) pasteText = (await file.text()).slice(0, 20000);
		pasteError = '';
	}
	function addPasted() {
		const result = parseChartText(pasteText);
		if (!result.ok) {
			pasteError = result.error;
			return;
		}
		const { motif, name, color, contrast } = result.chart;
		// Pasting the same chart twice selects it rather than adding a copy.
		const known = lib.patterns.find((p) => p.motif === motif && (!name || p.name === name));
		if (known) selected = known.id;
		else add(motif, name ?? 'Pasted pattern');
		if (color) lib.color = color;
		if (contrast) lib.contrast = contrast;
		closePaste();
	}
	function closePaste() {
		pasting = false;
		pasteText = '';
		pasteError = '';
	}

	/** ⌘Z / Ctrl+Z undo, with Shift (or Ctrl+Y) to redo. Text fields keep their own undo. */
	function keys(e: KeyboardEvent) {
		if (!(e.metaKey || e.ctrlKey) || (e.target as HTMLElement).closest('input, textarea')) return;
		const k = e.key.toLowerCase();
		if (k === 'z' && !e.shiftKey) editor?.undo();
		else if ((k === 'z' && e.shiftKey) || k === 'y') editor?.redo();
		else return;
		e.preventDefault();
	}

	let restored = $state(false);
	onMount(() => {
		lib = loadLibrary();
		selected = lib.patterns[0].id;
		// Opened from the sweater designer with its chart: edit that chart, adding it if it is new here.
		const linked = readMotifHash(location.hash);
		if (linked) {
			const known = lib.patterns.find((p) => p.motif === linked.motif);
			if (known) selected = known.id;
			else add(linked.motif, 'From my sweater');
			history.replaceState(null, '', location.pathname);
		}
		restored = true;
	});
	$effect(() => {
		const snapshot = $state.snapshot(lib);
		if (restored) saveLibrary(snapshot);
	});
</script>

<svelte:window onkeydown={keys} />
<Seo {title} {description} path="/patterns" />

<div class="app">
	<header class="top">
		<a class="home" href="/" aria-label="Knit It home"><Logo size={26} word={false} /></a>
		<h1>Pattern designer</h1>
		<a class="back" href="/design">Sweater designer <span aria-hidden="true">→</span></a>
	</header>

	<div class="layout">
		<nav class="library" aria-label="Your patterns">
			<h2>Your patterns</h2>
			<ul>
				{#each lib.patterns as p (p.id)}
					<li>
						<button type="button" class="item" aria-current={p.id === selected ? 'true' : undefined} onclick={() => (selected = p.id)}>
							<span class="thumb"><MotifSwatch motif={p.motif} color={lib.color} contrast={lib.contrast} /></span>
							<span class="name">{p.name}</span>
						</button>
					</li>
				{/each}
			</ul>
			<button type="button" class="new" onclick={() => add()}><span aria-hidden="true">+</span> New pattern</button>
		</nav>

		<main class="work">
			<div class="head">
				<input class="title" aria-label="Pattern name" maxlength="40" bind:value={current.name} />
				<span class="size">{TILE_ST} sts × {TILE_ROWS} rows</span>
			</div>
			<div class="tools" role="toolbar" aria-label="Chart tools">
				<div class="group">
					<button type="button" onclick={() => editor?.undo()} disabled={!editor?.canUndo()} title="Undo (⌘Z)">Undo</button>
					<button type="button" onclick={() => editor?.redo()} disabled={!editor?.canRedo()} title="Redo (⇧⌘Z)">Redo</button>
				</div>
				<div class="group" aria-label="Move">
					<button type="button" class="icon" onclick={() => editor?.apply('left')} aria-label="Move left" title="Move left">←</button>
					<button type="button" class="icon" onclick={() => editor?.apply('right')} aria-label="Move right" title="Move right">→</button>
					<button type="button" class="icon" onclick={() => editor?.apply('up')} aria-label="Move up" title="Move up">↑</button>
					<button type="button" class="icon" onclick={() => editor?.apply('down')} aria-label="Move down" title="Move down">↓</button>
				</div>
				<div class="group">
					<button type="button" onclick={() => editor?.apply('mirror')} title="Copy the left half onto the right">Mirror</button>
					<button type="button" onclick={() => editor?.apply('flipH')} title="Flip left to right">Flip ↔</button>
					<button type="button" onclick={() => editor?.apply('flipV')} title="Flip upside down">Flip ↕</button>
					<button type="button" onclick={() => editor?.apply('invert')} title="Swap the two colours">Invert</button>
					<button type="button" onclick={() => editor?.apply('clear')}>Clear</button>
				</div>
			</div>
			<div class="board">
				<div class="frame">
					{#key current.id}
						<MotifEditor bind:this={editor} bind:motif={current.motif} color={lib.color} contrast={lib.contrast} />
					{/key}
				</div>
			</div>
			<p class="hint">Click or drag to paint. Start on a painted stitch to erase. The chart repeats all round the sweater, so its edges join up.</p>
		</main>

		<aside class="side">
			<section>
				<h2>On the fabric</h2>
				<div class="fabric"><MotifSwatch motif={current.motif} color={lib.color} contrast={lib.contrast} across={4} down={2} label="{current.name}, repeated 4 times across and twice down" /></div>
				<p class="meta">{share}% in the pattern colour</p>
				{#if float > 5}
					<p class="warn">Some rows carry the yarn behind for {float} stitches. Floats over 5 can snag, so the written pattern will tell you where to catch them.</p>
				{/if}
			</section>
			<section>
				<h2>Main colour</h2>
				<div class="swatches" role="radiogroup" aria-label="Main colour">
					{#each colors as c (c.value)}
						<button type="button" class="swatch" role="radio" aria-checked={lib.color === c.value} aria-label={c.label} title={c.label} style:--c={String(c.value)} onclick={() => (lib.color = String(c.value))}></button>
					{/each}
				</div>
				<h2>Pattern colour</h2>
				<div class="swatches" role="radiogroup" aria-label="Pattern colour">
					{#each colors as c (c.value)}
						<button type="button" class="swatch" role="radio" aria-checked={lib.contrast === c.value} aria-label={c.label} title={c.label} style:--c={String(c.value)} onclick={() => (lib.contrast = String(c.value))}></button>
					{/each}
				</div>
			</section>
			<section class="actions">
				<a class="use" href={designLink(current.motif, lib.color, lib.contrast)}>Use on my sweater</a>
				<div class="row">
					<button type="button" onclick={() => add(current.motif, current.name)}>Duplicate</button>
					<button type="button" class="danger" onclick={remove}>Delete</button>
				</div>
			</section>
			<section class="share">
				<h2>Share as text</h2>
				<p class="meta">The chart as # and . characters, to keep in a note or send to a friend.</p>
				<div class="row">
					<button type="button" onclick={copyText}>{copied ? 'Copied ✓' : 'Copy text'}</button>
					<button type="button" onclick={saveText}>Save .txt</button>
				</div>
				{#if pasting}
					<label class="paste">
						<span>Paste a chart</span>
						<!-- svelte-ignore a11y_autofocus -->
						<textarea bind:this={pasteBox} bind:value={pasteText} rows="10" spellcheck="false" autofocus placeholder={'............\n..##....##..\n…16 rows of 12'} oninput={() => (pasteError = '')}></textarea>
					</label>
					{#if pasteError}<p class="warn" role="alert">{pasteError}</p>{/if}
					<div class="row">
						<button type="button" class="primary" onclick={addPasted} disabled={!pasteText.trim()}>Add pattern</button>
						<button type="button" onclick={closePaste}>Cancel</button>
					</div>
					<label class="file">Or open a .txt file <input type="file" accept=".txt,text/plain" onchange={openFile} /></label>
				{:else}
					<button type="button" class="pastebtn" onclick={() => (pasting = true)}>Paste a pattern…</button>
				{/if}
			</section>
		</aside>
	</div>
</div>

<style>
	/* The same cream paper and navy ink as the sweater designer. */
	.app {
		--ink: #26335f;
		--muted: #5d6385;
		--line: #e6dcc0;
		--line-strong: #c9bb92;
		--surface: #fbf5e4;
		--wash: #f3e9c9;
		--hairline: rgb(38 51 95 / 0.12);
		--chrome: color-mix(in srgb, var(--surface) 82%, transparent);
		--accent: #c8543e;
		--accent-deep: #8f3a2a;
		display: flex;
		flex-direction: column;
		height: 100dvh;
		color: var(--ink);
		font-family: system-ui, -apple-system, 'SF Pro Text', 'Segoe UI', Roboto, sans-serif;
	}
	.top {
		display: grid;
		grid-template-columns: 1fr auto 1fr;
		align-items: center;
		gap: 16px;
		flex: none;
		height: 56px;
		padding: 0 14px;
		border-bottom: 1px solid var(--hairline);
		background: var(--chrome);
		backdrop-filter: saturate(180%) blur(20px);
		-webkit-backdrop-filter: saturate(180%) blur(20px);
	}
	.home {
		justify-self: start;
		display: inline-flex;
		align-items: center;
		height: 36px;
		margin-left: -6px;
		padding: 0 6px;
		border-radius: 9px;
	}
	h1 {
		margin: 0;
		font-family: var(--display);
		font-size: 18px;
		font-weight: 600;
	}
	.back {
		justify-self: end;
		padding: 6px 10px;
		border-radius: 8px;
		color: var(--ink);
		font-weight: 500;
		text-decoration: none;
	}
	.layout {
		display: grid;
		grid-template-columns: 220px minmax(0, 1fr) 300px;
		flex: 1;
		min-height: 0;
	}
	h2 {
		margin: 0 0 10px;
		color: var(--muted);
		font-size: 11px;
		font-weight: 600;
		letter-spacing: 0.06em;
		text-transform: uppercase;
	}

	/* ── Library ── */
	.library {
		display: flex;
		flex-direction: column;
		gap: 8px;
		overflow-y: auto;
		padding: 16px 12px;
		border-right: 1px solid var(--hairline);
		background: var(--surface);
	}
	ul {
		display: grid;
		gap: 4px;
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.item {
		display: flex;
		align-items: center;
		gap: 10px;
		width: 100%;
		padding: 6px;
		border: 1px solid transparent;
		border-radius: 8px;
		background: none;
		color: var(--ink);
		font: inherit;
		text-align: left;
		cursor: pointer;
	}
	.item[aria-current='true'] {
		border-color: #b88a1c;
		background: #e8bd53;
		font-weight: 600;
	}
	.thumb {
		flex: none;
		width: 30px;
		overflow: hidden;
		border-radius: 3px;
		box-shadow: 0 0 0 1px rgb(0 0 0 / 0.15);
	}
	.name {
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.new {
		height: 36px;
		border: 1.5px dashed var(--line-strong);
		border-radius: 8px;
		background: none;
		color: var(--ink);
		font: inherit;
		font-weight: 500;
		cursor: pointer;
	}

	/* ── Work area: the chart as big as the window allows ── */
	.work {
		display: flex;
		flex-direction: column;
		gap: 12px;
		min-height: 0;
		padding: 16px 24px;
	}
	.head {
		display: flex;
		align-items: baseline;
		gap: 12px;
	}
	.title {
		flex: 1;
		min-width: 0;
		padding: 2px 6px;
		margin-left: -6px;
		border: 1px solid transparent;
		border-radius: 6px;
		background: none;
		color: var(--ink);
		font: 600 22px/1.2 var(--display);
	}
	.title:hover {
		border-color: var(--line-strong);
	}
	.title:focus {
		border-color: var(--ink);
		background: var(--surface);
		outline: none;
	}
	.size {
		flex: none;
		color: var(--muted);
		font-size: 12px;
	}
	.tools {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}
	.group {
		display: flex;
		gap: 4px;
	}
	.tools button,
	.row button {
		min-width: 36px;
		height: 34px;
		padding: 0 11px;
		border: 1px solid var(--line-strong);
		border-radius: 8px;
		background: #fffdf6;
		box-shadow: 0 1px 1px rgb(38 51 95 / 0.08);
		color: var(--ink);
		font: inherit;
		font-weight: 500;
		cursor: pointer;
		transition: background-color 100ms ease-out;
	}
	.tools .icon {
		padding: 0;
		font-size: 15px;
	}
	.tools button:disabled {
		box-shadow: none;
		color: var(--line-strong);
		cursor: default;
	}
	.tools button:active:not(:disabled),
	.row button:not(.primary):active {
		background: var(--wash);
	}
	.board {
		flex: 1;
		min-height: 240px;
		display: grid;
		place-items: center;
		container-type: size;
	}
	.frame {
		width: min(100cqw, 100cqh * 0.75);
		aspect-ratio: 3 / 4;
		padding: 6px;
		border-radius: 12px;
		background: #fffdf6;
		box-shadow: 0 1px 2px rgb(38 51 95 / 0.12), 0 8px 24px rgb(38 51 95 / 0.08);
	}
	.hint {
		margin: 0;
		color: var(--muted);
		text-align: center;
	}

	/* ── Preview, colours and what to do with it ── */
	.side {
		display: flex;
		flex-direction: column;
		overflow-y: auto;
		border-left: 1px solid var(--hairline);
		background: var(--surface);
	}
	.side section {
		padding: 16px;
		border-bottom: 1px solid var(--hairline);
	}
	.fabric {
		overflow: hidden;
		border-radius: 6px;
		box-shadow: 0 0 0 1px rgb(0 0 0 / 0.12);
	}
	.meta,
	.warn {
		margin: 8px 0 0;
		color: var(--muted);
	}
	.warn {
		padding: 8px 10px;
		border-radius: 6px;
		background: #f7e3b5;
		color: #6e4700;
	}
	.swatches {
		display: grid;
		grid-template-columns: repeat(6, 1fr);
		gap: 6px;
		margin-bottom: 14px;
	}
	.swatches:last-child {
		margin-bottom: 0;
	}
	.swatch {
		aspect-ratio: 1;
		border: 0;
		border-radius: 50%;
		background: var(--c);
		box-shadow: inset 0 0 0 1px rgb(0 0 0 / 0.15);
		cursor: pointer;
	}
	.swatch[aria-checked='true'] {
		box-shadow: inset 0 0 0 1px rgb(0 0 0 / 0.15), 0 0 0 2px var(--surface), 0 0 0 4px var(--ink);
	}
	.actions,
	.share {
		display: grid;
		gap: 8px;
	}
	.side section:last-child {
		border-bottom: 0;
	}
	.share .meta {
		margin: -4px 0 2px;
	}
	.share .warn {
		margin: 0;
	}
	.paste {
		display: grid;
		gap: 6px;
		color: var(--muted);
		font-size: 12px;
		font-weight: 600;
	}
	textarea {
		width: 100%;
		box-sizing: border-box;
		padding: 8px;
		border: 1px solid var(--line-strong);
		border-radius: 8px;
		background: #fffdf6;
		color: var(--ink);
		font: 13px/1.25 ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
		resize: vertical;
	}
	textarea:focus-visible {
		outline: 2px solid var(--focus);
		outline-offset: 1px;
	}
	.pastebtn {
		height: 34px;
		border: 1.5px dashed var(--line-strong);
		border-radius: 8px;
		background: none;
		color: var(--ink);
		font: inherit;
		font-weight: 500;
		cursor: pointer;
	}
	.row .primary {
		border-color: var(--ink);
		background: var(--ink);
		color: #fff8e6;
	}
	.row .primary:disabled {
		border-color: var(--line-strong);
		background: none;
		color: var(--line-strong);
		cursor: default;
	}
	.file {
		color: var(--muted);
		font-size: 12px;
	}
	.file input {
		display: block;
		max-width: 100%;
		margin-top: 4px;
		font-size: 12px;
	}
	.use {
		display: grid;
		place-items: center;
		height: 40px;
		border: 1px solid var(--accent-deep);
		border-radius: 8px;
		background: var(--accent);
		box-shadow: 0 1px 1px rgb(0 0 0 / 0.15), inset 0 1px 0 rgb(255 255 255 / 0.18);
		color: #fff8e6;
		font-weight: 600;
		text-decoration: none;
	}
	.row {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 8px;
	}
	.danger {
		color: var(--accent-deep) !important;
	}
	button:focus-visible,
	a:focus-visible,
	.title:focus-visible {
		outline: 2px solid var(--focus);
		outline-offset: 2px;
	}
	@media (hover: hover) and (pointer: fine) {
		.item:not([aria-current='true']):hover,
		.new:hover,
		.back:hover,
		.tools button:hover:not(:disabled),
		.pastebtn:hover,
		.row button:not(.primary):hover {
			background: var(--wash);
		}
		.use:hover {
			background: #d0604a;
		}
	}

	/* ── Narrow screens: one column, the chart first ── */
	@media (max-width: 900px) {
		.layout {
			grid-template-columns: 200px minmax(0, 1fr);
		}
		.side {
			grid-column: 1 / -1;
			border-left: 0;
			border-top: 1px solid var(--hairline);
		}
		.app {
			height: auto;
			min-height: 100dvh;
		}
		.board {
			container-type: inline-size;
			min-height: 0;
		}
		.frame {
			width: min(100%, 520px);
		}
	}
	@media (max-width: 640px) {
		.top {
			grid-template-columns: auto 1fr auto;
			padding: 0 10px;
		}
		h1 {
			font-size: 16px;
		}
		.layout {
			display: flex;
			flex-direction: column;
		}
		.library {
			order: 0;
			flex-direction: row;
			align-items: center;
			overflow-x: auto;
			padding: 10px;
			border-right: 0;
			border-bottom: 1px solid var(--hairline);
		}
		.library h2 {
			display: none;
		}
		ul {
			display: flex;
		}
		.item {
			flex-direction: column;
			gap: 4px;
			width: 72px;
			font-size: 11px;
		}
		.thumb {
			width: 36px;
		}
		.name {
			max-width: 100%;
		}
		.new {
			flex: none;
			height: 56px;
			padding: 0 12px;
			font-size: 12px;
		}
		.work {
			padding: 12px 16px;
		}
		.frame {
			width: 100%;
			padding: 4px;
		}
	}
</style>
