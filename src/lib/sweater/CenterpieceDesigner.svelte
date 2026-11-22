<script lang="ts">
	import HeaderSlot from '$lib/HeaderSlot.svelte';
	import AccountLink from '$lib/AccountLink.svelte';
	import CenterpieceEditor from './CenterpieceEditor.svelte';
	import MotifSwatch from './MotifSwatch.svelte';
	import { countOn, longestStrand, parseCenterpiece } from './centerpiece';
	import type { Library } from './library';
	import { colors } from './options';

	/**
	 * The centerpiece designer: one word or picture, worked once on the front of a sweater. Like the
	 * chart designer, it edits a centerpiece kept in the library, so the sidebar can list and switch them.
	 */
	let {
		lib = $bindable(),
		selected,
		onadd,
		onuse,
		onremove
	}: { lib: Library; selected: string; onadd: (centerpiece?: string, name?: string) => void; onuse: () => void; onremove: () => void } = $props();

	let current = $derived(lib.centerpieces.find((c) => c.id === selected) ?? lib.centerpieces[0]);
	let cp = $derived(current ? parseCenterpiece(current.centerpiece) : null);
	let share = $derived(cp ? Math.round((countOn(cp) / (cp.w * cp.h)) * 100) : 0);
	let float = $derived(cp ? longestStrand(cp) : 0);
	let editor = $state<CenterpieceEditor>();

	// ── Sharing to the chart library ──
	let published = $state<'idle' | 'busy' | 'copied'>('idle');
	let publishError = $state('');
	/** Publish the centerpiece: it gets a public page at /chart/<id>, and its link goes on the clipboard. */
	async function publish() {
		if (!current || !cp) return;
		publishError = '';
		const name = prompt('Share this centerpiece. Anyone with the link can see it, and it will appear in the chart library.\n\nName it:', current.name);
		if (name === null) return;
		published = 'busy';
		try {
			const response = await fetch('/api/charts', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name, motif: current.centerpiece, color: lib.color, contrast: lib.contrast }) });
			if (!response.ok) throw new Error(response.status === 401 ? 'Sign in with Ravelry (top right) to share a centerpiece.' : ((await response.json().catch(() => null))?.message ?? 'Could not share it. Try again.'));
			const url = new URL(`/chart/${(await response.json()).id}`, location.origin).toString();
			try {
				await navigator.clipboard.writeText(url);
				published = 'copied';
				setTimeout(() => (published = 'idle'), 2500);
			} catch {
				// No clipboard access: show the link to copy by hand.
				published = 'idle';
				publishError = url;
			}
		} catch (e) {
			published = 'idle';
			publishError = e instanceof Error ? e.message : 'Could not share it. Try again.';
		}
	}

	/** ⌘Z / Ctrl+Z undo, with Shift (or Ctrl+Y) to redo. Text fields keep their own undo. */
	function keys(e: KeyboardEvent) {
		if (!(e.metaKey || e.ctrlKey) || (e.target as HTMLElement).closest('input, textarea, [role="grid"]')) return;
		const k = e.key.toLowerCase();
		if (k === 'z' && !e.shiftKey) editor?.undo();
		else if ((k === 'z' && e.shiftKey) || k === 'y') editor?.redo();
		else return;
		e.preventDefault();
	}
</script>

<svelte:window onkeydown={keys} />

{#snippet center()}<h1>Centerpiece designer</h1>{/snippet}
{#snippet right()}<AccountLink />{/snippet}
<HeaderSlot app {center} {right} />

<div class="app">
	{#if current}
		<div class="layout">
			<main class="work">
				{#key current.id}
					<CenterpieceEditor bind:this={editor} bind:value={current.centerpiece} color={lib.color} contrast={lib.contrast}>
						{#snippet title()}<input class="title" aria-label="Centerpiece name" maxlength="40" bind:value={current.name} />{/snippet}
					</CenterpieceEditor>
				{/key}
			</main>

			<aside class="side">
				<section>
					<h2>On the front</h2>
					{#if cp}
						<div class="fabric"><MotifSwatch motif={current.centerpiece} color={lib.color} contrast={lib.contrast} across={2} down={1} label="{current.name}, worked once on the front" /></div>
						<p class="meta">{cp.w} sts × {cp.h} rows · {share}% in the pattern colour</p>
						{#if float > 5}
							<p class="warn">Strands of {float} stitches can snag; the written pattern says to catch any longer than 5.</p>
						{/if}
					{:else}
						<p class="meta">Draw something to see it here.</p>
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
					<button type="button" class="stitch block" onclick={onuse} disabled={!cp}>Use on my sweater</button>
					<div class="row">
						<button type="button" class="stitch quiet sm block" onclick={() => onadd(current.centerpiece, current.name)}>Duplicate</button>
						<button type="button" class="stitch danger sm block" onclick={onremove}>Delete</button>
					</div>
				</section>
				<section class="share">
					<h2>Share</h2>
					<button type="button" class="stitch quiet sm block" onclick={publish} disabled={published === 'busy' || !cp}>{published === 'busy' ? 'Sharing…' : published === 'copied' ? 'Link copied ✓' : 'Share to chart library'}</button>
					{#if publishError}<p class="warn" role="status">{publishError}</p>{/if}
					<p class="browse"><a href="/chart?size=centerpiece">Browse shared centerpieces</a></p>
				</section>
			</aside>
		</div>
	{/if}
</div>

<style>
	/* The same cream paper and navy ink as the chart and sweater designers. */
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
		height: 100%;
		color: var(--ink);
		font-family: system-ui, -apple-system, 'SF Pro Text', 'Segoe UI', Roboto, sans-serif;
	}
	h1 {
		margin: 0;
		font-family: var(--display);
		font-size: 18px;
		font-weight: 600;
	}
	.layout {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 300px;
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
	.work {
		display: flex;
		flex-direction: column;
		min-width: 0;
		min-height: 0;
		--grid-max: calc(100dvh - var(--bar) - 120px);
	}
	.work > :global(.editor) {
		flex: 1;
	}
	.title {
		width: 100%;
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
	.side section:last-child {
		border-bottom: 0;
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
	.share .warn {
		margin: 0;
	}
	.browse {
		margin: 8px 0 0;
		font-size: 13px;
	}
	.browse a {
		color: var(--link, #3d5aa8);
	}
	.row {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 8px;
	}
	button:disabled {
		opacity: 0.5;
		cursor: default;
	}
	button:focus-visible,
	a:focus-visible,
	.title:focus-visible {
		outline: 2px solid var(--focus);
		outline-offset: 2px;
	}
	@media (max-width: 900px) {
		.layout {
			grid-template-columns: minmax(0, 1fr);
		}
		.side {
			border-left: 0;
			border-top: 1px solid var(--hairline);
		}
		.app {
			height: auto;
			min-height: calc(100dvh - var(--bar));
		}
		.work {
			--grid-max: 60dvh;
		}
	}
	@media (max-width: 640px) {
		h1 {
			font-size: 16px;
		}
	}
</style>
