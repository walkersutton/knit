<script lang="ts">
	import CenterpieceEditor from './CenterpieceEditor.svelte';
	import { MIN_SIZE, encodeCenterpiece, fitProblem, parseCenterpiece, resizeCenterpiece, PLACEMENTS, riseRows, room, type BodyBox, type Centerpiece } from './centerpiece';
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
	const resize = (w: number, h: number) => cp && set(resizeCenterpiece(cp, w, h));

	let dialog = $state<HTMLDialogElement>();
	let editor = $state<CenterpieceEditor>();
	function open(m: 'word' | 'draw' | 'image') {
		editor?.start(m);
		dialog?.showModal();
	}
	const close = () => dialog?.close();
	/** From the start buttons: read the picture first, and only then open the editor on it. */
	async function fromFile(e: Event) {
		const input = e.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		input.value = '';
		if (file && (await editor?.loadFile(file, true))) dialog?.showModal();
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
	<CenterpieceEditor
		bind:this={editor}
		bind:value={design.centerpiece}
		color={design.color}
		contrast={design.contrast}
		{squash}
		maxSts={space.sts}
		maxRows={space.rows + rise}
		warning={problem === 'wide' ? `Wider than the front's ${space.sts} stitches.` : problem === 'tall' ? `Taller than the ${space.rows + rise} rows that fit.` : undefined}
	>
		{#snippet title()}<h2 id="cp-h">Centerpiece</h2>{/snippet}
		{#snippet actions()}<button type="button" class="done" onclick={close}>Done</button>{/snippet}
	</CenterpieceEditor>
</dialog>

<style>
	.cp {
		display: grid;
		gap: 10px;
	}
	.lede {
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
	.row button {
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
	dialog[open] {
		display: flex;
		flex-direction: column;
	}
	dialog::backdrop {
		background: #26335f66;
	}
	h2 {
		margin: 0;
		font: 600 18px/1.2 var(--display);
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
	button:focus-visible {
		outline: 2px solid var(--focus);
		outline-offset: 2px;
	}
	@media (hover: hover) and (pointer: fine) {
		.row button:not(:disabled):hover,
		.start button:hover,
		.start .file:hover {
			background: var(--wash);
		}
	}
</style>
