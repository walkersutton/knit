<script lang="ts">
	import { onMount } from 'svelte';
	import Author from '$lib/Author.svelte';
	import LikeButton from '$lib/LikeButton.svelte';
	import Stage from './Stage.svelte';
	import PatternView from './PatternView.svelte';
	import { needleLabel } from './needles';
	import { knittedOf, progressAt, tasksOf, type Mode, type Progress } from './progress';
	import type { Design } from './garment';
	import type { Pattern } from './pattern';

	let {
		design,
		pattern,
		est,
		label,
		mode = $bindable(),
		progress,
		onstep,
		onreset,
		onedit,
		onsave,
		sharedId,
		author,
		authorPhoto,
		onunshare,
		likes
	}: {
		design: Design;
		pattern: Pattern;
		est: { yards: number; skeins: number; gauge: number; level: string; needles: { main: number } };
		label: string;
		mode: Mode;
		progress: Progress;
		onstep: (key: string, value: number) => void;
		onreset: () => void;
		onedit: () => void;
		onsave: () => void;
		/** Set once the pattern has a public page: the id in /pattern/<id>. */
		sharedId?: string;
		/** Who shared it, when it is someone else's page. */
		author?: string;
		authorPhoto?: string | null;
		/** Offered to the author of a shared pattern, to take it down. */
		onunshare?: () => void;
		/** The like button for a shared pattern. */
		likes?: { count: number; liked: boolean; signedIn: boolean };
	} = $props();

	let made = $state('');
	let link = $derived(made || (sharedId ? `/pattern/${sharedId}` : ''));
	let shareState = $state<'idle' | 'busy' | 'copied' | 'error'>('idle');
	let shareError = $state('');
	/** Share the pattern: publish it if it is not yet, then put its link on the clipboard. */
	async function share() {
		shareError = '';
		if (!link) {
			const name = prompt('Share this pattern. Anyone with the link can read it, and it will appear in the catalogue.\n\nName it:', label);
			if (name === null) return;
			shareState = 'busy';
			try {
				const response = await fetch('/api/patterns', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name, design }) });
				if (!response.ok) throw new Error(response.status === 401 ? 'Sign in with Ravelry (top right) to share a pattern.' : ((await response.json().catch(() => null))?.message ?? 'Could not share it. Try again.'));
				made = `/pattern/${(await response.json()).id}`;
			} catch (e) {
				shareState = 'error';
				shareError = e instanceof Error ? e.message : 'Could not share it. Try again.';
				return;
			}
		}
		const url = new URL(link, location.origin).toString();
		try {
			await navigator.clipboard.writeText(url);
			shareState = 'copied';
			setTimeout(() => (shareState = 'idle'), 2500);
		} catch {
			// No clipboard access: show the link to copy by hand.
			shareState = 'idle';
			shareError = url;
		}
	}

	let reader = $state<HTMLElement>();
	let sheet = $state(false);
	/** The step scrolled to in the pattern; the model shows the garment as it is once that step is knitted. */
	let viewing = $state<string>();
	let tasks = $derived(pattern.ok ? tasksOf(pattern.sections) : []);
	let knitted = $derived(pattern.ok && viewing ? knittedOf(pattern.sections, progressAt(tasks, viewing, progress)) : null);
	let where = $derived.by(() => {
		const t = tasks.find((x) => x.key === viewing);
		return t && pattern.ok ? pattern.sections.find((s) => s.id === t.section)?.title : undefined;
	});

	onMount(() => {
		const k = (e: KeyboardEvent) => e.key === 'Escape' && (sheet = false);
		document.addEventListener('keydown', k);
		return () => document.removeEventListener('keydown', k);
	});
</script>

<div class="page">
	<section class="cover">
		<div class="model"><Stage {design} /></div>
		<div class="info">
			<p class="eyebrow">{#if author}Shared by <Author name={author} photo={authorPhoto} />{:else}Your pattern{/if}</p>
			<h1>{label}</h1>
			<dl>
				<div><dt>Yarn</dt><dd>{est.yards} yd · {est.skeins} {est.skeins === 1 ? 'skein' : 'skeins'}</dd></div>
				<div><dt>Needles</dt><dd>{needleLabel(est.needles.main)}</dd></div>
				<div><dt>Gauge</dt><dd>{est.gauge} sts / 4 in</dd></div>
				<div><dt>Skill</dt><dd>{est.level}</dd></div>
			</dl>
			<div class="actions">
				<button class="primary" type="button" onclick={() => reader?.scrollIntoView({ behavior: 'smooth' })}>Start knitting ↓</button>
				<button class="ghost" type="button" onclick={onedit}>{author ? 'Adapt in designer' : '← Edit design'}</button>
				<button class="ghost" type="button" onclick={() => window.print()}>Print</button>
				<button class="ghost" type="button" onclick={onsave} title="Save this sweater design to your account or this device">Save design</button>
				<button class="ghost" type="button" onclick={share} disabled={shareState === 'busy'}>{shareState === 'busy' ? 'Sharing…' : shareState === 'copied' ? 'Link copied' : link ? 'Copy link' : 'Share'}</button>
				{#if likes && sharedId}<LikeButton kind="pattern" id={sharedId} likes={likes.count} liked={likes.liked} signedIn={likes.signedIn} />{/if}
				{#if onunshare}<button class="ghost" type="button" onclick={onunshare}>Unshare</button>{/if}
			</div>
			<p class="share-note" role="status">
				{#if shareError}{shareError}{:else if link && !author}Shared at <a href={link}>{link}</a>.{/if}
			</p>
		</div>
	</section>

	<div class="read" bind:this={reader}>
		<div class="text">
			<PatternView {pattern} main={design.color} contrast={design.contrast} bind:mode {progress} interactive {onstep} onview={(k) => (viewing = k)} {onreset} />
		</div>
		<aside class="rail" aria-label="Model at this step">
			<div class="cap"><span>{knitted ? 'Knitted up to' : 'Finished'}</span><b>{where ?? 'Whole sweater'}</b></div>
			<div class="stage"><Stage {design} {knitted} intro={false} /></div>
		</aside>
	</div>
</div>

<button class="fab" type="button" aria-expanded={sheet} onclick={() => (sheet = true)}>Model</button>
{#if sheet}
	<button class="scrim" type="button" aria-label="Close model" onclick={() => (sheet = false)}></button>
	<section class="sheet" aria-label="Model at this step">
		<header>
			<span><em>{knitted ? 'Knitted up to' : 'Finished'}</em><b>{where ?? 'Whole sweater'}</b></span>
			<button type="button" onclick={() => (sheet = false)}>Done</button>
		</header>
		<div class="stage"><Stage {design} {knitted} intro={false} /></div>
	</section>
{/if}

<style>
	.page {
		height: calc(100dvh - var(--bar));
		overflow-y: auto;
	}
	/* ── Cover ── */
	.cover {
		display: grid;
		grid-template-columns: minmax(0, 1.1fr) minmax(320px, 0.9fr);
		align-items: center;
		gap: 32px;
		max-width: 1080px;
		min-height: calc(100dvh - var(--bar) - 40px);
		margin: 0 auto;
		padding: 24px;
	}
	.model {
		height: min(560px, 70dvh);
		border-radius: 18px;
		background: radial-gradient(circle at 50% 40%, var(--stage-a), var(--stage-b) 60%, var(--stage-c));
		box-shadow: 0 0 0 1px var(--hairline), 0 12px 32px rgb(38 51 95 / 0.1);
		overflow: hidden;
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
		color: var(--ink);
		font: 600 34px/1.1 var(--display);
		text-wrap: balance;
	}
	dl {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 14px 24px;
		margin: 0 0 24px;
		padding: 16px 0;
		border-block: 1px solid var(--hairline);
	}
	dt {
		color: var(--muted);
		font-size: 12px;
	}
	dd {
		margin: 2px 0 0;
		color: var(--ink);
		font-size: 15px;
		font-weight: 500;
		font-variant-numeric: tabular-nums;
	}
	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}
	.share-note {
		margin: 10px 0 0;
		color: var(--muted);
		font-size: 13px;
		overflow-wrap: anywhere;
	}
	.share-note:empty {
		display: none;
	}
	.share-note a {
		color: var(--link);
	}
	.ghost:disabled {
		color: var(--muted);
		cursor: default;
	}
	.primary,
	.ghost {
		display: inline-flex;
		align-items: center;
		height: 38px;
		padding: 0 16px;
		border: 1px solid var(--line-strong);
		border-radius: 8px;
		background: #fffdf6;
		color: var(--ink);
		font: inherit;
		font-weight: 500;
		cursor: pointer;
		transition: background-color 120ms ease-out, transform 160ms cubic-bezier(0.23, 1, 0.32, 1);
	}
	.primary {
		border-color: var(--accent-deep);
		background: var(--accent);
		color: #fff8e6;
	}
	.primary:active,
	.ghost:active {
		transform: scale(0.97);
	}
	.primary:focus-visible,
	.ghost:focus-visible,
	.fab:focus-visible,
	.sheet header button:focus-visible {
		outline: 2px solid var(--focus);
		outline-offset: 2px;
	}
	@media (hover: hover) and (pointer: fine) {
		.ghost:hover {
			background: var(--wash);
		}
		.primary:hover {
			background: #d0604a;
		}
	}
	/* ── Reading: the text with the model beside it, at the step being read ── */
	.read {
		display: grid;
		grid-template-columns: minmax(0, 1fr) clamp(300px, 34%, 440px);
		align-items: start;
		border-top: 1px solid var(--hairline);
		background: var(--surface);
	}
	.text {
		width: min(100%, 720px);
		justify-self: center;
		padding: 0 16px 120px;
		--sticky-top: 0px;
	}
	.rail {
		position: sticky;
		top: 0;
		display: flex;
		flex-direction: column;
		height: calc(100dvh - var(--bar));
		border-left: 1px solid var(--hairline);
		background: radial-gradient(circle at 50% 45%, var(--stage-a), var(--stage-b) 70%, var(--stage-c));
	}
	.cap {
		display: flex;
		flex-direction: column;
		gap: 2px;
		padding: 14px 16px 0;
		color: var(--muted);
		font-size: 12px;
	}
	.cap b {
		color: var(--ink);
		font-size: 14px;
		font-weight: 600;
	}
	.stage {
		flex: 1;
		min-height: 0;
	}
	.rail .stage :global(.tag) {
		display: none;
	}
	/* ── Phones: the model lives in a sheet instead of a column ── */
	.fab,
	.scrim,
	.sheet {
		display: none;
	}
	@media (max-width: 900px) {
		.read {
			grid-template-columns: 1fr;
		}
		.rail {
			display: none;
		}
		.fab {
			position: fixed;
			right: 16px;
			bottom: calc(16px + env(safe-area-inset-bottom));
			z-index: 3;
			display: inline-flex;
			align-items: center;
			height: 40px;
			padding: 0 18px;
			border: 1px solid var(--accent-deep);
			border-radius: 999px;
			background: var(--accent);
			box-shadow: 0 6px 18px rgb(38 51 95 / 0.25);
			color: #fff8e6;
			font: inherit;
			font-weight: 600;
			cursor: pointer;
			transition: transform 160ms cubic-bezier(0.23, 1, 0.32, 1);
		}
		.fab:active {
			transform: scale(0.96);
		}
		.scrim {
			position: fixed;
			inset: 0;
			z-index: 4;
			display: block;
			border: 0;
			background: rgb(38 51 95 / 0.25);
		}
		.sheet {
			position: fixed;
			left: 0;
			right: 0;
			bottom: 0;
			z-index: 5;
			display: flex;
			flex-direction: column;
			height: min(64dvh, 640px);
			border-radius: 18px 18px 0 0;
			background: radial-gradient(circle at 50% 45%, var(--stage-a), var(--stage-b) 70%, var(--stage-c));
			box-shadow: 0 -12px 40px rgb(38 51 95 / 0.25);
			overflow: hidden;
		}
		.sheet header {
			display: flex;
			align-items: center;
			justify-content: space-between;
			padding: 12px 16px;
			border-bottom: 1px solid var(--hairline);
			background: var(--chrome);
			font-size: 12px;
		}
		.sheet header span {
			display: flex;
			flex-direction: column;
		}
		.sheet em {
			color: var(--muted);
			font-style: normal;
		}
		.sheet b {
			color: var(--ink);
			font-size: 14px;
		}
		.sheet header button {
			height: 32px;
			padding: 0 14px;
			border: 1px solid var(--line-strong);
			border-radius: 8px;
			background: #fffdf6;
			color: var(--ink);
			font: inherit;
			font-weight: 500;
			cursor: pointer;
		}
		.cover {
			grid-template-columns: 1fr;
			min-height: 0;
		}
		.model {
			height: 44dvh;
		}
		h1 {
			font-size: 26px;
		}
	}
	@media (prefers-reduced-motion: no-preference) {
		.cover {
			animation: rise 320ms cubic-bezier(0.23, 1, 0.32, 1) both;
		}
		@keyframes rise {
			from {
				opacity: 0;
				transform: translateY(10px);
			}
		}
		@media (max-width: 900px) {
			.sheet {
				animation: up 300ms cubic-bezier(0.23, 1, 0.32, 1) both;
			}
			.scrim {
				animation: fade 200ms ease-out both;
			}
			@keyframes up {
				from {
					transform: translateY(100%);
				}
			}
			@keyframes fade {
				from {
					opacity: 0;
				}
			}
		}
	}
	@media print {
		.page,
		.fab,
		.scrim,
		.sheet {
			display: none;
		}
	}
</style>
