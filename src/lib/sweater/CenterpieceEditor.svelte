<script lang="ts">
	import type { Snippet } from 'svelte';
	import { lineCells } from './chartEdit';
	import {
		MAX_H,
		MAX_W,
		MIN_SIZE,
		encodeCenterpiece,
		fitSize,
		flipCenterpieceH,
		flipCenterpieceV,
		imageCenterpiece,
		invertCenterpiece,
		mirrorCenterpiece,
		paintCells,
		parseCenterpiece,
		resizeCenterpiece,
		shiftCenterpiece,
		textCenterpiece,
		trimCenterpiece,
		type Centerpiece
	} from './centerpiece';

	/**
	 * The centerpiece editor: type a word, paint stitch by stitch, or turn a picture into stitches.
	 * Used in the sweater designer's centerpiece dialog and in the centerpiece designer at /design.
	 * `value` is the centerpiece as text (see `centerpiece.ts`); '' for none.
	 */
	let {
		value = $bindable(),
		color,
		contrast,
		squash = 0.8,
		maxSts = MAX_W,
		maxRows = MAX_H,
		warning,
		title,
		actions
	}: {
		value: string;
		color: string;
		contrast: string;
		/** How much shorter a row is than a stitch is wide, so the picture is drawn as it will knit. */
		squash?: number;
		/** The room there is for it, which words and pictures are sized to. */
		maxSts?: number;
		maxRows?: number;
		/** Something to point out under the tools, such as the picture not fitting the sweater. */
		warning?: string;
		/** Shown at the start and the end of the toolbar. */
		title?: Snippet;
		actions?: Snippet;
	} = $props();

	const cp = $derived(parseCenterpiece(value));
	const set = (c: Centerpiece | null) => (value = c ? encodeCenterpiece(c) : '');
	const across = $derived(Math.min(maxSts || MAX_W, MAX_W));

	type Mode = 'word' | 'draw' | 'image';
	const TABS: [Mode, string][] = [
		['word', 'Word'],
		['draw', 'Draw'],
		['image', 'Picture']
	];
	let mode = $state<Mode>('draw');
	let text = $state('');
	let tooWide = $state(false);
	/** The picture while a stroke is under way: it only becomes the value when the pointer lifts. */
	let draft = $state<Centerpiece | null>(null);
	const shown = $derived(draft ?? cp);
	let past = $state<string[]>([]);
	let future = $state<string[]>([]);

	function commit(next: Centerpiece) {
		if (next.cells === cp?.cells && next.w === cp?.w && next.h === cp?.h) return;
		past = [...past.slice(-99), value];
		future = [];
		set(next);
	}
	export function undo() {
		const prev = past.at(-1);
		if (prev === undefined) return;
		future = [value, ...future];
		past = past.slice(0, -1);
		value = prev;
	}
	export function redo() {
		const next = future[0];
		if (next === undefined) return;
		past = [...past, value];
		future = future.slice(1);
		value = next;
	}

	const HEART = ['..##..##..', '.########.', '##########', '##########', '.########.', '..######..', '...####...', '....##....', '.....#....'];
	const heart = (): Centerpiece => ({ w: 12, h: 11, cells: Array.from({ length: 11 }, (_, j) => Array.from({ length: 12 }, (_, i) => (HEART[j - 1]?.[i - 1] === '#' ? '1' : '0')).join('')).join('') });

	/** Start editing in a mode with a fresh history, putting something on the grid if it is empty. */
	export function start(m: Mode) {
		mode = m;
		past = [];
		future = [];
		if (!cp) {
			if (m === 'word') {
				text = 'KNIT';
				typed();
			} else set(heart());
		}
	}

	function typed() {
		const result = textCenterpiece(text, across);
		tooWide = Boolean(result && !result.fits);
		if (result) commit(result.centerpiece);
	}

	// ── Painting ──
	let svg = $state<SVGSVGElement>();
	let stroke: { on: boolean; last: [number, number] } | null = null;
	let cursor = $state<[number, number]>([0, 0]);
	let focused = $state(false);
	const cellAt = (e: PointerEvent): [number, number] => {
		const r = svg!.getBoundingClientRect();
		const i = Math.floor(((e.clientX - r.left) / r.width) * shown!.w);
		const j = Math.floor(((e.clientY - r.top) / r.height) * shown!.h);
		return [Math.min(shown!.w - 1, Math.max(0, i)), Math.min(shown!.h - 1, Math.max(0, j))];
	};
	function down(e: PointerEvent) {
		if (!cp || e.button !== 0) return;
		e.preventDefault();
		svg!.setPointerCapture(e.pointerId);
		mode = 'draw';
		const [i, j] = cellAt(e);
		cursor = [i, j];
		stroke = { on: cp.cells[j * cp.w + i] !== '1', last: [i, j] };
		draft = paintCells(cp, [[i, j]], stroke.on);
	}
	function move(e: PointerEvent) {
		if (!stroke || !draft) return;
		const [i, j] = cellAt(e);
		if (i === stroke.last[0] && j === stroke.last[1]) return;
		draft = paintCells(draft, lineCells(stroke.last[0], stroke.last[1], i, j), stroke.on);
		stroke.last = [i, j];
		cursor = [i, j];
	}
	function up() {
		if (!stroke) return;
		stroke = null;
		const next = draft;
		draft = null;
		if (next) commit(next);
	}
	function key(e: KeyboardEvent) {
		if (!cp) return;
		const moves: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
		const [i, j] = cursor;
		if (moves[e.key]) {
			e.preventDefault();
			cursor = [(i + moves[e.key][0] + cp.w) % cp.w, (j + moves[e.key][1] + cp.h) % cp.h];
		} else if (e.key === ' ' || e.key === 'Enter') {
			e.preventDefault();
			mode = 'draw';
			commit(paintCells(cp, [[i, j]], cp.cells[j * cp.w + i] !== '1'));
		} else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
			e.preventDefault();
			if (e.shiftKey) redo();
			else undo();
		}
	}

	const TOOLS: [string, string, (c: Centerpiece) => Centerpiece][] = [
		['←', 'Move left', (c) => shiftCenterpiece(c, -1, 0)],
		['→', 'Move right', (c) => shiftCenterpiece(c, 1, 0)],
		['↑', 'Move up', (c) => shiftCenterpiece(c, 0, -1)],
		['↓', 'Move down', (c) => shiftCenterpiece(c, 0, 1)]
	];
	const EDITS: [string, string, (c: Centerpiece) => Centerpiece][] = [
		['Mirror', 'Copy the left half onto the right', mirrorCenterpiece],
		['Flip ↔', 'Flip left to right', flipCenterpieceH],
		['Flip ↕', 'Flip upside down', flipCenterpieceV],
		['Invert', 'Swap the two colours', invertCenterpiece],
		['Trim', 'Shrink the grid to the painted part', (c) => trimCenterpiece(c) ?? c],
		['Clear', 'Start again', (c) => ({ ...c, cells: '0'.repeat(c.w * c.h) })]
	];
	export function resize(w: number, h: number) {
		if (!cp || !Number.isFinite(w) || !Number.isFinite(h)) return;
		mode = 'draw';
		commit(resizeCenterpiece(cp, w, h));
	}

	// ── A picture from a file ──
	let pixels = $state.raw<{ data: Uint8ClampedArray; w: number; h: number } | null>(null);
	let level = $state(140);
	let reverse = $state(false);
	let imageError = $state('');
	const fromPixels = () => {
		if (!pixels) return null;
		const c = imageCenterpiece(pixels.data, pixels.w, pixels.h, level);
		return reverse ? invertCenterpiece(c) : c;
	};
	/** Turn a picture file into stitches. Returns whether it could be read. */
	export async function loadFile(file: File, fresh = false) {
		imageError = '';
		try {
			const bitmap = await createImageBitmap(file);
			const { w, h } = fitSize(bitmap.width, bitmap.height, across, Math.min(maxRows || MAX_H, MAX_H), squash);
			const canvas = Object.assign(document.createElement('canvas'), { width: w, height: h });
			const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
			ctx.fillStyle = '#fff';
			ctx.fillRect(0, 0, w, h);
			ctx.imageSmoothingQuality = 'high';
			ctx.drawImage(bitmap, 0, 0, w, h);
			bitmap.close();
			pixels = { data: ctx.getImageData(0, 0, w, h).data, w, h };
			mode = 'image';
			if (fresh) {
				past = [];
				future = [];
			}
			const next = fromPixels();
			if (next) commit(next);
			return true;
		} catch {
			imageError = 'That file could not be read as a picture. Try a PNG or JPEG.';
			return false;
		}
	}
	async function chosen(e: Event) {
		const input = e.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		input.value = '';
		if (file) await loadFile(file);
	}
	const regrade = () => (draft = fromPixels());
	function regraded() {
		const next = draft;
		draft = null;
		if (next) commit(next);
	}
</script>

{#snippet picture(c: Centerpiece, cell: number)}
	{#each { length: c.h } as _, j (j)}
		{#each { length: c.w } as _, i (i)}
			{#if c.cells[j * c.w + i] === '1'}<rect x={i} y={j * cell} width="1.02" height={cell * 1.04} fill={contrast} />{/if}
		{/each}
	{/each}
{/snippet}

<div class="editor">
	<div class="bar">
		{#if title}<div class="title">{@render title()}</div>{/if}
		<div class="tabs" role="tablist" aria-label="How to make it">
			{#each TABS as [id, label] (id)}
				<button type="button" role="tab" aria-selected={mode === id} onclick={() => (mode = id)}>{label}</button>
			{/each}
		</div>
		<div class="pair">
			<button type="button" class="ic" onclick={undo} disabled={!past.length} aria-label="Undo" title="Undo">↶</button>
			<button type="button" class="ic" onclick={redo} disabled={!future.length} aria-label="Redo" title="Redo">↷</button>
		</div>
		{@render actions?.()}
	</div>

	<div class="body">
		<div class="board">
			{#if shown}
				<svg
					bind:this={svg}
					class="grid"
					viewBox="0 0 {shown.w} {shown.h * squash}"
					style:aspect-ratio="{shown.w} / {shown.h * squash}"
					shape-rendering="crispEdges"
					role="grid"
					tabindex="0"
					aria-label="Centerpiece, {shown.w} stitches by {shown.h} rows. Click or drag to paint; arrow keys and Space work too."
					onpointerdown={down}
					onpointermove={move}
					onpointerup={up}
					onpointercancel={up}
					onlostpointercapture={up}
					onkeydown={key}
					onfocus={() => (focused = true)}
					onblur={() => (focused = false)}
				>
					<rect width={shown.w} height={shown.h * squash} fill={color} />
					{@render picture(shown, squash)}
					<g class="lines" aria-hidden="true">
						{#each { length: shown.w + 1 } as _, i (i)}<line x1={i} y1="0" x2={i} y2={shown.h * squash} class:major={i % 5 === 0} />{/each}
						{#each { length: shown.h + 1 } as _, j (j)}<line x1="0" y1={j * squash} x2={shown.w} y2={j * squash} class:major={j % 5 === 0} />{/each}
					</g>
					{#if focused}<rect class="cursor" x={cursor[0] + 0.06} y={(cursor[1] + 0.06) * squash} width="0.88" height={0.88 * squash} />{/if}
				</svg>
			{:else}
				<p class="empty">Nothing here yet. Type a word, start drawing, or choose a picture.</p>
			{/if}
		</div>

		<div class="tools">
			{#if mode === 'word'}
				<label class="field">
					<span>Your words</span>
					<textarea bind:value={text} rows="3" maxlength="60" spellcheck="false" placeholder={'KNIT\nMORE'} oninput={typed}></textarea>
				</label>
				<p class="hint">Up to {across} stitches across. Letters, numbers and a few marks; a new line starts a new row of words. You can touch up any stitch afterwards.</p>
				{#if tooWide}<p class="warn">That is too wide. Shorten it, or split it over two lines.</p>{/if}
			{:else if mode === 'image'}
				<label class="field file">
					<span>Choose a picture</span>
					<input type="file" accept="image/*" onchange={chosen} />
				</label>
				{#if imageError}<p class="warn" role="alert">{imageError}</p>{/if}
				{#if pixels}
					<label class="field">
						<span>Darkness cut-off</span>
						<input type="range" min="20" max="240" step="1" bind:value={level} oninput={regrade} onchange={regraded} />
					</label>
					<label class="check"><input type="checkbox" bind:checked={reverse} onchange={() => (regrade(), regraded())} /> Swap the colours</label>
				{/if}
				<p class="hint">Dark parts of the picture become the pattern colour. Simple shapes and logos work best: a photo has too much detail for {across} stitches.</p>
			{:else if cp}
				<div class="size">
					<label>Stitches <input type="number" min={MIN_SIZE} max={MAX_W} value={cp.w} onchange={(e) => resize(+e.currentTarget.value, cp.h)} /></label>
					<label>Rows <input type="number" min={MIN_SIZE} max={MAX_H} value={cp.h} onchange={(e) => resize(cp.w, +e.currentTarget.value)} /></label>
				</div>
				<div class="moves">
					{#each TOOLS as [glyph, name, run] (name)}
						<button type="button" class="ic" aria-label={name} title={name} onclick={() => commit(run(cp))}>{glyph}</button>
					{/each}
				</div>
				<div class="edits">
					{#each EDITS as [name, hint, run] (name)}
						<button type="button" title={hint} onclick={() => commit(run(cp))}>{name}</button>
					{/each}
				</div>
				<p class="hint">Drag to paint. Start on a painted stitch to erase. Stitches are drawn the shape they knit, a little wider than tall.</p>
			{:else}
				<button type="button" class="blank" onclick={() => commit(resizeCenterpiece({ w: 3, h: 3, cells: '0'.repeat(9) }, 20, 20))}>Start a blank 20 × 20 grid</button>
			{/if}
			{#if warning}<p class="warn">{warning}</p>{/if}
		</div>
	</div>
</div>

<style>
	.editor {
		display: flex;
		flex-direction: column;
		min-height: 0;
	}
	.bar {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 10px 14px;
		padding: 12px 16px;
		border-bottom: 1px solid var(--hairline, rgb(38 51 95 / 0.12));
	}
	.title {
		flex: 1;
		min-width: 0;
	}
	.tabs {
		display: flex;
		padding: 2px;
		border: 1px solid var(--line-strong);
		border-radius: 9px;
		background: var(--wash);
	}
	.tabs button {
		height: 28px;
		padding: 0 12px;
		border: 0;
		border-radius: 7px;
		background: none;
		color: inherit;
		font: inherit;
		font-weight: 500;
		cursor: pointer;
	}
	.tabs button[aria-selected='true'] {
		background: #fffdf6;
		box-shadow: 0 1px 2px rgb(38 51 95 / 0.2);
	}
	.pair {
		display: flex;
		gap: 4px;
	}
	.body {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 250px;
		gap: 16px;
		flex: 1;
		min-height: 0;
		padding: 16px;
		overflow: auto;
	}
	.board {
		display: grid;
		place-items: center;
		min-height: 200px;
		padding: 10px;
		border-radius: 12px;
		background: #fffdf6;
		box-shadow: 0 1px 2px rgb(38 51 95 / 0.12);
	}
	.grid {
		display: block;
		width: auto;
		max-width: 100%;
		max-height: var(--grid-max, min(62dvh, 560px));
		border-radius: 4px;
		cursor: crosshair;
		touch-action: none;
		user-select: none;
		-webkit-user-select: none;
	}
	.grid:focus-visible {
		outline: 2px solid var(--focus);
		outline-offset: 3px;
	}
	line {
		stroke: rgb(0 0 0 / 0.2);
		stroke-width: 0.03;
		shape-rendering: geometricPrecision;
	}
	line.major {
		stroke: rgb(0 0 0 / 0.42);
		stroke-width: 0.05;
	}
	.cursor {
		fill: none;
		stroke: var(--focus);
		stroke-width: 0.12;
		shape-rendering: geometricPrecision;
	}
	.empty,
	.hint {
		margin: 0;
		color: var(--muted);
		font-size: 12px;
		line-height: 1.45;
	}
	.empty {
		max-width: 240px;
		font-size: 13px;
		text-align: center;
	}
	.tools {
		display: grid;
		align-content: start;
		gap: 10px;
	}
	.field {
		display: grid;
		gap: 4px;
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
		font: 600 15px/1.3 ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
		text-transform: uppercase;
		resize: vertical;
	}
	.field.file input {
		font-size: 12px;
	}
	.check {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 13px;
	}
	.size {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 8px;
	}
	.size label {
		display: grid;
		gap: 3px;
		color: var(--muted);
		font-size: 12px;
		font-weight: 600;
	}
	.size input {
		width: 100%;
		box-sizing: border-box;
		height: 34px;
		padding: 0 8px;
		border: 1px solid var(--line-strong);
		border-radius: 8px;
		background: #fffdf6;
		color: var(--ink);
		font: inherit;
	}
	.moves {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 4px;
	}
	.edits {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 4px;
	}
	.edits button,
	.ic,
	.blank {
		height: 32px;
		padding: 0 12px;
		border: 1px solid var(--line-strong);
		border-radius: 8px;
		background: #fffdf6;
		box-shadow: 0 1px 1px rgb(38 51 95 / 0.08);
		color: var(--ink);
		font: inherit;
		font-weight: 500;
		cursor: pointer;
	}
	.ic {
		display: grid;
		place-items: center;
		min-width: 34px;
		padding: 0;
		font-size: 16px;
	}
	button:disabled {
		box-shadow: none;
		color: var(--line-strong);
		cursor: default;
	}
	.warn {
		margin: 0;
		padding: 8px 10px;
		border-radius: 6px;
		background: #f7e3b5;
		color: #6e4700;
		font-size: 12px;
		line-height: 1.4;
	}
	button:focus-visible,
	input:focus-visible,
	textarea:focus-visible {
		outline: 2px solid var(--focus);
		outline-offset: 2px;
	}
	@media (hover: hover) and (pointer: fine) {
		.edits button:hover,
		.ic:not(:disabled):hover,
		.blank:hover {
			background: var(--wash);
		}
	}
	@media (max-width: 700px) {
		.body {
			grid-template-columns: minmax(0, 1fr);
		}
		.grid {
			max-height: 46dvh;
		}
	}
</style>
