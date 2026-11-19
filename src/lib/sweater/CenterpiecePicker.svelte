<script lang="ts">
	import { lineCells } from './chartEdit';
	import {
		MAX_H,
		MAX_W,
		MIN_SIZE,
		encodeCenterpiece,
		fitProblem,
		fitSize,
		flipCenterpieceH,
		flipCenterpieceV,
		imageCenterpiece,
		invertCenterpiece,
		mirrorCenterpiece,
		paintCells,
		parseCenterpiece,
		resizeCenterpiece,
		PLACEMENTS,
	riseRows,
	room,
		shiftCenterpiece,
		textCenterpiece,
		trimCenterpiece,
		type BodyBox,
		type Centerpiece
	} from './centerpiece';
	import type { Design } from './garment';

	/**
	 * The centerpiece controls on the Yarn step: add a word, a drawing or a picture, place it on the
	 * front, and open the editor. `box` is the sweater's body as it will be knitted, which says how much
	 * room the front has.
	 */
	let { design = $bindable(), box }: { design: Design; box: BodyBox } = $props();

	const cp = $derived(parseCenterpiece(design.centerpiece));
	const space = $derived(room(box, design.centerpieceAt));
	const problem = $derived(cp ? fitProblem(cp, box, design.centerpieceAt) : undefined);
	/** Rows the picture can rise above the underarm, up the chest: none when the yoke is too narrow for it. */
	const rise = $derived(cp ? riseRows(cp, box, design.centerpieceAt) : 0);
	const where = $derived(design.centerpieceY < -0.95 && rise ? 'High on the chest' : Math.abs(design.centerpieceY) < 0.05 ? 'Just under the arms' : design.centerpieceY > 0.95 ? 'Down by the hem' : '');
	/** A stitch is wider than a row is tall, so a cell is drawn that much shorter to show the picture as it will knit. */
	const squash = $derived(box.stPerCm / box.rowPerCm);
	const set = (c: Centerpiece | null) => (design.centerpiece = c ? encodeCenterpiece(c) : '');

	// ── The editor ──
	type Mode = 'word' | 'draw' | 'image';
	const TABS: [Mode, string][] = [
		['word', 'Word'],
		['draw', 'Draw'],
		['image', 'Picture']
	];
	let dialog = $state<HTMLDialogElement>();
	let mode = $state<Mode>('word');
	let text = $state('');
	let tooWide = $state(false);
	/** The picture while a stroke is under way: it only becomes the design's when the pointer lifts. */
	let draft = $state<Centerpiece | null>(null);
	const shown = $derived(draft ?? cp);
	let past = $state<string[]>([]);
	let future = $state<string[]>([]);

	function commit(next: Centerpiece) {
		if (next.cells === cp?.cells && next.w === cp?.w && next.h === cp?.h) return;
		past = [...past.slice(-99), design.centerpiece];
		future = [];
		set(next);
	}
	function undo() {
		const prev = past.at(-1);
		if (prev === undefined) return;
		future = [design.centerpiece, ...future];
		past = past.slice(0, -1);
		design.centerpiece = prev;
	}
	function redo() {
		const next = future[0];
		if (next === undefined) return;
		past = [...past, design.centerpiece];
		future = future.slice(1);
		design.centerpiece = next;
	}

	const HEART = ['..##..##..', '.########.', '##########', '##########', '.########.', '..######..', '...####...', '....##....', '.....#....'];
	const heart = (): Centerpiece => ({ w: 12, h: 11, cells: Array.from({ length: 11 }, (_, j) => Array.from({ length: 12 }, (_, i) => (HEART[j - 1]?.[i - 1] === '#' ? '1' : '0')).join('')).join('') });

	function open(m: Mode) {
		mode = m;
		past = [];
		future = [];
		if (!cp) {
			if (m === 'word') {
				text = 'KNIT';
				typed();
			} else set(heart());
		}
		dialog?.showModal();
	}
	const close = () => dialog?.close();

	function typed() {
		const result = textCenterpiece(text, space.sts || MAX_W);
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
	function resize(w: number, h: number) {
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
	async function chosen(e: Event) {
		const input = e.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		input.value = '';
		if (!file) return;
		imageError = '';
		try {
			const bitmap = await createImageBitmap(file);
			const { w, h } = fitSize(bitmap.width, bitmap.height, Math.min(space.sts || MAX_W, MAX_W), Math.min(space.rows || MAX_H, MAX_H), squash);
			const canvas = Object.assign(document.createElement('canvas'), { width: w, height: h });
			const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
			ctx.fillStyle = '#fff';
			ctx.fillRect(0, 0, w, h);
			ctx.imageSmoothingQuality = 'high';
			ctx.drawImage(bitmap, 0, 0, w, h);
			bitmap.close();
			pixels = { data: ctx.getImageData(0, 0, w, h).data, w, h };
			mode = 'image';
			const next = fromPixels();
			if (next) commit(next);
		} catch {
			imageError = 'That file could not be read as a picture. Try a PNG or JPEG.';
		}
	}
	const regrade = () => (draft = fromPixels());
	function regraded() {
		const next = draft;
		draft = null;
		if (next) commit(next);
	}

	/** From the start buttons: read the picture first, and only then open the editor on it. */
	async function fromFile(e: Event) {
		await chosen(e);
		if (cp) {
			past = [];
			future = [];
			dialog?.showModal();
		}
	}
</script>

{#snippet picture(c: Centerpiece, cell: number)}
	{#each { length: c.h } as _, j (j)}
		{#each { length: c.w } as _, i (i)}
			{#if c.cells[j * c.w + i] === '1'}<rect x={i} y={j * cell} width="1.02" height={cell * 1.04} fill={design.contrast} />{/if}
		{/each}
	{/each}
{/snippet}

<div class="cp">
	{#if cp}
		<div class="have">
			<svg class="thumb" viewBox="0 0 {cp.w} {cp.h * squash}" shape-rendering="crispEdges" role="img" aria-label="Centerpiece, {cp.w} stitches by {cp.h} rows" style:aspect-ratio="{cp.w} / {cp.h * squash}">
				<rect width={cp.w} height={cp.h * squash} fill={design.color} />
				{@render picture(cp, squash)}
			</svg>
			<div class="info">
				<strong>{cp.w} sts × {cp.h} rows</strong>
				<span>worked once on the front</span>
				<div class="row">
					<button type="button" onclick={() => open('draw')}>Edit</button>
					<button type="button" class="danger" onclick={() => set(null)}>Remove</button>
				</div>
			</div>
		</div>
		<div class="where" role="radiogroup" aria-label="Where on the front">
			{#each PLACEMENTS as place (place)}
				<button type="button" role="radio" aria-checked={design.centerpieceAt === place} onclick={() => (design.centerpieceAt = place)}>{place}</button>
			{/each}
		</div>
		<label class="slide">
			<span><em>Height</em><span>{where}</span></span>
			<input type="range" min={rise ? -1 : 0} max="1" step="0.01" bind:value={design.centerpieceY} aria-label="How far down the front the centerpiece sits" />
			<span class="ends"><span>Higher</span><span>Lower</span></span>
		</label>
		{#if problem}
			<p class="warn" role="status">
				{#if problem === 'wide'}
					This is {cp.w} stitches wide, but the front of this sweater has room for about {space.sts} at this gauge.
					{#if space.sts >= MIN_SIZE}<button type="button" onclick={() => resize(space.sts, cp.h)}>Make it {space.sts} wide</button>{/if}
				{:else}
					This is {cp.h} rows tall, but only about {space.rows + rise} rows of the front fit {rise ? 'between the neckline' : 'under the arms'} and the hem.
					{#if space.rows + rise >= MIN_SIZE}<button type="button" onclick={() => resize(cp.w, space.rows + rise)}>Make it {space.rows + rise} tall</button>{/if}
				{/if}
			</p>
		{/if}
	{:else}
		<p class="lede">A single word or picture, worked once on the front. It sits on top of your pattern instead of repeating.</p>
		<div class="start">
			<button type="button" onclick={() => open('word')}><b>Aa</b> Type a word</button>
			<button type="button" onclick={() => open('draw')}><b>✎</b> Draw it</button>
			<label class="file"><b>▣</b> From a picture<input type="file" accept="image/*" onchange={fromFile} /></label>
		</div>
	{/if}
</div>

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
<dialog bind:this={dialog} aria-labelledby="cp-h" onclick={(e) => e.target === dialog && close()}>
	<div class="sheet">
		<header>
			<h2 id="cp-h">Centerpiece</h2>
			<div class="tabs" role="tablist" aria-label="How to make it">
				{#each TABS as [id, label] (id)}
					<button type="button" role="tab" aria-selected={mode === id} onclick={() => (mode = id)}>{label}</button>
				{/each}
			</div>
			<div class="pair">
				<button type="button" class="ic" onclick={undo} disabled={!past.length} aria-label="Undo" title="Undo">↶</button>
				<button type="button" class="ic" onclick={redo} disabled={!future.length} aria-label="Redo" title="Redo">↷</button>
			</div>
			<button type="button" class="done" onclick={close}>Done</button>
		</header>

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
						<rect width={shown.w} height={shown.h * squash} fill={design.color} />
						{@render picture(shown, squash)}
						<g class="lines" aria-hidden="true">
							{#each { length: shown.w + 1 } as _, i (i)}<line x1={i} y1="0" x2={i} y2={shown.h * squash} class:major={i % 5 === 0} />{/each}
							{#each { length: shown.h + 1 } as _, j (j)}<line x1="0" y1={j * squash} x2={shown.w} y2={j * squash} class:major={j % 5 === 0} />{/each}
						</g>
						{#if focused}<rect class="cursor" x={cursor[0] + 0.06} y={(cursor[1] + 0.06) * squash} width="0.88" height={0.88 * squash} />{/if}
					</svg>
				{/if}
			</div>

			<div class="tools">
				{#if mode === 'word'}
					<label class="field">
						<span>Your words</span>
						<textarea bind:value={text} rows="3" maxlength="60" spellcheck="false" placeholder={'KNIT\nMORE'} oninput={typed}></textarea>
					</label>
					<p class="hint">Up to {Math.min(space.sts || MAX_W, MAX_W)} stitches across. Letters, numbers and a few marks; a new line starts a new row of words. You can touch up any stitch afterwards.</p>
					{#if tooWide}<p class="warn">That is wider than the front. Shorten it, or split it over two lines.</p>{/if}
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
					<p class="hint">Dark parts of the picture become the pattern colour. Simple shapes and logos work best: a photo has too much detail for {Math.min(space.sts || MAX_W, MAX_W)} stitches.</p>
				{:else}
					<div class="size">
						<label>Stitches <input type="number" min={MIN_SIZE} max={MAX_W} value={cp?.w} onchange={(e) => resize(+e.currentTarget.value, cp?.h ?? 0)} /></label>
						<label>Rows <input type="number" min={MIN_SIZE} max={MAX_H} value={cp?.h} onchange={(e) => resize(cp?.w ?? 0, +e.currentTarget.value)} /></label>
					</div>
					<div class="moves">
						{#each TOOLS as [glyph, name, run] (name)}
							<button type="button" class="ic" aria-label={name} title={name} onclick={() => cp && commit(run(cp))}>{glyph}</button>
						{/each}
					</div>
					<div class="edits">
						{#each EDITS as [name, hint, run] (name)}
							<button type="button" title={hint} onclick={() => cp && commit(run(cp))}>{name}</button>
						{/each}
					</div>
					<p class="hint">Drag to paint. Start on a painted stitch to erase. Stitches are drawn the shape they knit, a little wider than tall.</p>
				{/if}
				{#if problem}
					<p class="warn">{problem === 'wide' ? `Wider than the front's ${space.sts} stitches.` : `Taller than the ${space.rows} rows that fit.`}</p>
				{/if}
			</div>
		</div>
	</div>
</dialog>

<style>
	.cp {
		display: grid;
		gap: 10px;
	}
	.lede,
	.hint {
		margin: 0;
		color: var(--muted);
		font-size: 12px;
		line-height: 1.45;
	}
	.start {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 6px;
	}
	.start button,
	.file:not(.field) {
		display: grid;
		justify-items: center;
		gap: 3px;
		padding: 10px 4px 8px;
		border: 1px solid var(--line-strong);
		border-radius: 6px;
		background: var(--surface);
		box-shadow: 0 2px 0 var(--line);
		color: var(--ink);
		font: inherit;
		font-size: 12px;
		font-weight: 500;
		text-align: center;
		cursor: pointer;
	}
	.start b {
		font-size: 18px;
		font-weight: 600;
	}
	.file input {
		position: absolute;
		width: 1px;
		height: 1px;
		opacity: 0;
		pointer-events: none;
	}
	.start .file {
		position: relative;
	}
	.start .file:focus-within {
		outline: 2px solid var(--focus);
		outline-offset: 2px;
	}
	.have {
		display: grid;
		grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
		align-items: center;
		gap: 12px;
	}
	.thumb {
		width: 100%;
		max-height: 150px;
		border-radius: 3px;
		box-shadow: 0 0 0 1px rgb(0 0 0 / 0.15);
	}
	.info {
		display: grid;
		gap: 2px;
		font-size: 13px;
	}
	.info > span {
		color: var(--muted);
		font-size: 12px;
	}
	.row {
		display: flex;
		gap: 6px;
		margin-top: 8px;
	}
	.row button,
	.edits button,
	.ic {
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
	.danger {
		color: var(--accent-deep, #8f3a2a) !important;
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
		color: var(--line-strong) !important;
		cursor: default;
	}
	.where {
		display: flex;
		padding: 2px;
		border: 1px solid var(--line-strong);
		border-radius: 9px;
		background: var(--wash);
	}
	.where button {
		flex: 1;
		height: 28px;
		padding: 0 6px;
		border: 0;
		border-radius: 7px;
		background: none;
		color: inherit;
		font: inherit;
		font-size: 12px;
		font-weight: 500;
		cursor: pointer;
	}
	.where button[aria-checked='true'] {
		background: #fffdf6;
		box-shadow: 0 1px 2px rgb(38 51 95 / 0.2);
	}
	.slide {
		display: grid;
		gap: 4px;
		font-size: 12px;
		color: var(--muted);
	}
	.slide > span:first-child {
		display: flex;
		justify-content: space-between;
	}
	.slide em {
		color: var(--ink);
		font-weight: 500;
	}
	.slide input {
		width: 100%;
		accent-color: var(--link, #3d5aa8);
	}
	.ends {
		display: flex;
		justify-content: space-between;
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
	.warn button {
		padding: 0;
		border: 0;
		background: none;
		color: inherit;
		font: inherit;
		font-weight: 600;
		text-decoration: underline;
		cursor: pointer;
	}

	/* ── The editor ── */
	dialog {
		width: min(calc(100% - 24px), 860px);
		max-height: calc(100dvh - 24px);
		padding: 0;
		border: 0;
		border-radius: 16px;
		background: var(--surface, #fbf5e4);
		color: var(--ink, #26335f);
		box-shadow: 0 16px 50px #433c2933, 0 0 0 1px var(--line, #e6dcc0);
		overflow: hidden;
	}
	dialog::backdrop {
		background: #26335f66;
	}
	.sheet {
		display: flex;
		flex-direction: column;
		max-height: calc(100dvh - 24px);
	}
	header {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 10px 14px;
		padding: 12px 16px;
		border-bottom: 1px solid var(--hairline, rgb(38 51 95 / 0.12));
	}
	h2 {
		flex: 1;
		margin: 0;
		font: 600 18px/1.2 var(--display);
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
	.done {
		height: 34px;
		padding: 0 18px;
		border: 1px solid var(--accent-deep, #8f3a2a);
		border-radius: 8px;
		background: var(--accent, #c8543e);
		color: #fff8e6;
		font: inherit;
		font-weight: 600;
		cursor: pointer;
	}
	.body {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 250px;
		gap: 16px;
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
		max-height: min(62dvh, 560px);
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
		position: static;
		width: auto;
		height: auto;
		opacity: 1;
		pointer-events: auto;
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
	button:focus-visible,
	input:focus-visible,
	textarea:focus-visible {
		outline: 2px solid var(--focus);
		outline-offset: 2px;
	}
	@media (hover: hover) and (pointer: fine) {
		.row button:not(:disabled):hover,
		.edits button:hover,
		.ic:not(:disabled):hover,
		.start button:hover,
		.start .file:hover {
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
