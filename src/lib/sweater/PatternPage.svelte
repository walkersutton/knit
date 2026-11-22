<script lang="ts">
	import { onMount, tick } from 'svelte';
	import Viewer from './Viewer.svelte';
	import Author from '$lib/Author.svelte';
	import { patternPath } from '$lib/site';
	import LikeButton from '$lib/LikeButton.svelte';
	import Stage from './Stage.svelte';
	import PatternView from './PatternView.svelte';
	import Notes from './Notes.svelte';
	import Confetti from './Confetti.svelte';
	import { needleLabel } from './needles';
	import { jpegStill } from './still';
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
		sharedSlug,
		author,
		authorPhoto,
		onunshare,
		likes,
		notes = '',
		onnotes,
		notesHint
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
		/** Set once the pattern has a public page: its id, for likes. */
		sharedId?: string;
		/** The name in its public URL, /pattern/<slug>. */
		sharedSlug?: string;
		/** Who shared it, when it is someone else's page. */
		author?: string;
		authorPhoto?: string | null;
		/** Offered to the author of a shared pattern, to take it down. */
		onunshare?: () => void;
		/** The like button for a shared pattern. */
		likes?: { count: number; liked: boolean; signedIn: boolean };
		/** The words kept with the design, shown under its name. */
		notes?: string;
		/** Given when the notes may be edited here. */
		onnotes?: (text: string) => void | Promise<void>;
		notesHint?: string;
	} = $props();

	let made = $state('');
	let link = $derived(made || (sharedSlug ? patternPath({ slug: sharedSlug }) : ''));
	let shareState = $state<'idle' | 'busy' | 'copied' | 'error'>('idle');
	let shareError = $state('');
	let cameraOn = $state(false);
	let camera = $state<Viewer>();
	/** The 3D model as a base64 PNG, for the link preview. Taken by an off-screen viewer; never holds up sharing for long. */
	async function photo(): Promise<string | undefined> {
		cameraOn = true;
		try {
			await tick();
			const blob = await Promise.race([camera?.still(design) ?? null, new Promise<null>((resolve) => setTimeout(() => resolve(null), 8000))]);
			if (!blob) throw new Error('the viewer made no picture');
			// Set on the link preview card's own cream.
			return await jpegStill(blob, { width: 660, height: 750, background: '#faf3dc' });
		} catch (e) {
			// Sharing goes ahead without a picture; the preview falls back to a drawn garment.
			console.warn('Could not capture the pattern preview:', e);
			return undefined;
		} finally {
			cameraOn = false;
		}
	}
	/** Share the pattern: publish it if it is not yet, then put its link on the clipboard. */
	async function share() {
		shareError = '';
		if (!link) {
			const name = prompt('Share this pattern. Anyone with the link can read it, and it will appear in the catalogue.\n\nName it (the name becomes its link):', label);
			if (name === null) return;
			shareState = 'busy';
			try {
				const response = await fetch('/api/patterns', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name, design, notes, image: await photo() }) });
				if (!response.ok) throw new Error(response.status === 401 ? 'Sign in with Ravelry (top right) to share a pattern.' : ((await response.json().catch(() => null))?.message ?? 'Could not share it. Try again.'));
				made = patternPath(await response.json());
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
	let wholeName = $derived(`Whole ${design.garment === 'Socks' ? 'pair of socks' : design.garment.toLowerCase()}`);
	let where = $derived.by(() => {
		const t = tasks.find((x) => x.key === viewing);
		return t && pattern.ok ? pattern.sections.find((s) => s.id === t.section)?.title : undefined;
	});

	// Confetti the first time the knitter reaches the last step of the pattern.
	let confetti = $state<Confetti>();
	let celebrated = false;
	let confettiColors = $derived([design.color, design.contrast, '#f2b84b', '#e0654a', '#4d8fd1', '#faf3dc']);
	$effect(() => {
		const last = tasks.at(-1)?.key;
		if (!last) return;
		if (viewing !== last) {
			// Scrolling back up re-arms it, so a second trip to the end gets its own burst.
			celebrated = false;
			return;
		}
		if (celebrated) return;
		celebrated = true;
		confetti?.burst();
	});

	onMount(() => {
		const k =(e: KeyboardEvent) => e.key === 'Escape' && (sheet = false);
		document.addEventListener('keydown', k);
		return () => document.removeEventListener('keydown', k);
	});
</script>

{#if cameraOn}
	<!-- An off-screen camera that takes the link-preview picture; never shown, and gone as soon as it has. -->
	<div class="camera" aria-hidden="true"><Viewer bind:this={camera} onview={() => {}} intro={false} /></div>
{/if}

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
			{#if onnotes || notes.trim()}<div class="notes"><Notes value={notes} onsave={onnotes} label={author ? 'From the designer' : 'Notes'} hint={notesHint} /></div>{/if}
			<div class="actions">
				<button class="chunk sm" type="button" onclick={() => reader?.scrollIntoView({ behavior: 'smooth' })}>Start knitting ↓</button>
				<button class="chunk quiet sm" type="button" onclick={onedit}>{author ? 'Adapt in designer' : '← Edit design'}</button>
				<div class="tools" role="toolbar" aria-label="Pattern actions">
					<button type="button" aria-label="Print" title="Print" onclick={() => window.print()}>
						<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 9V4h10v5M7 17H5a1 1 0 0 1-1-1v-5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v5a1 1 0 0 1-1 1h-2M7 14h10v6H7z" /></svg>
					</button>
					{#if !(likes && sharedId)}
						<button type="button" aria-label="Save design" title="Save this design to your account or this device" onclick={onsave}>
							<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 4h12v16l-6-4-6 4z" /></svg>
						</button>
					{/if}
					<button type="button" aria-label={link ? 'Copy link' : 'Share'} title={shareState === 'copied' ? 'Link copied' : link ? 'Copy link' : 'Share'} onclick={share} disabled={shareState === 'busy'}>
						{#if shareState === 'copied'}
							<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
						{:else}
							<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15V4M8 8l4-4 4 4M5 13v6h14v-6" /></svg>
						{/if}
					</button>
					{#if likes && sharedId}<LikeButton icon kind="pattern" id={sharedId} likes={likes.count} liked={likes.liked} signedIn={likes.signedIn} />{/if}
					{#if onunshare}
						<button type="button" class="danger" aria-label="Unshare" title="Unshare" onclick={onunshare}>
							<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13" /></svg>
						</button>
					{/if}
				</div>
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
			<div class="cap"><span>{knitted ? 'Knitted up to' : 'Finished'}</span><b>{where ?? wholeName}</b></div>
			<div class="stage"><Stage {design} {knitted} intro={false} /></div>
		</aside>
	</div>
</div>

<div class="print-only"><PatternView {pattern} main={design.color} contrast={design.contrast} {mode} /></div>

<Confetti bind:this={confetti} colors={confettiColors} />

<button class="fab"type="button" aria-expanded={sheet} onclick={() => (sheet = true)}>Model</button>
{#if sheet}
	<button class="scrim" type="button" aria-label="Close model" onclick={() => (sheet = false)}></button>
	<section class="sheet" aria-label="Model at this step">
		<header>
			<span><em>{knitted ? 'Knitted up to' : 'Finished'}</em><b>{where ?? wholeName}</b></span>
			<button type="button" onclick={() => (sheet = false)}>Done</button>
		</header>
		<div class="stage"><Stage {design} {knitted} intro={false} /></div>
	</section>
{/if}

<style>
	.camera {
		position: absolute;
		left: -10000px;
		top: 0;
		width: 360px;
		height: 414px;
		pointer-events: none;
	}
	/* The same cream-and-navy palette as the home page and the designer. */
	.page {
		--ink: #26335f;
		--ink-hover: #36457a;
		--on-ink: #faf3dc;
		--muted: #5d6385;
		--line: #e6dcc0;
		--line-strong: #c9bb92;
		--surface: #fbf5e4;
		--wash: #f3e9c9;
		--here: #e9efe0;
		--good: #4f7a58;
		--link: #3d5aa8;
		--radius: 7px;
		--hairline: rgb(38 51 95 / 0.12);
		--chrome: color-mix(in srgb, var(--surface) 82%, transparent);
		--accent: #c8543e;
		--accent-deep: #8f3a2a;
		--stage-a: #fdf9ec;
		--stage-b: #f4e9c8;
		--stage-c: #e8d9ab;
		color: var(--ink);
	}
	.fab,
	.sheet {
		--ink: #26335f;
		--muted: #5d6385;
		--line-strong: #c9bb92;
		--surface: #fbf5e4;
		--hairline: rgb(38 51 95 / 0.12);
		--chrome: color-mix(in srgb, var(--surface) 82%, transparent);
		--accent: #c8543e;
		--accent-deep: #8f3a2a;
		--stage-a: #fdf9ec;
		--stage-b: #f4e9c8;
		--stage-c: #e8d9ab;
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
	.notes {
		margin: 0 0 24px;
	}
	.actions {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 10px;
	}
	/* One cream bar of icon controls, matching the quiet chunky button beside it. */
	.tools {
		display: inline-flex;
		align-items: stretch;
		height: 34px;
		border-radius: 10px;
		background: #fffdf8;
		box-shadow: 0 2px 0 #c9bb92;
	}
	.tools :global(button) {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 38px;
		padding: 0 10px;
		border: 0;
		border-left: 1px solid #c9bb9260;
		background: transparent;
		color: #26335f;
		cursor: pointer;
		transition: background-color 150ms ease-out;
	}
	.tools > :global(:first-child),
	.tools > :global(:first-child) :global(button) {
		border-left: 0;
		border-radius: 10px 0 0 10px;
	}
	.tools > :global(:last-child),
	.tools > :global(:last-child button) {
		border-radius: 0 10px 10px 0;
	}
	.tools > :global(:only-child) {
		border-radius: 10px;
	}
	.tools :global(button:disabled) {
		opacity: 0.5;
		cursor: default;
	}
	.tools :global(button.danger) {
		color: #9b2c1f;
	}
	.tools :global(button:focus-visible) {
		outline: 2px solid var(--focus);
		outline-offset: -2px;
	}
	.tools svg {
		width: 18px;
		height: 18px;
		fill: none;
		stroke: currentColor;
		stroke-width: 1.8;
		stroke-linecap: round;
		stroke-linejoin: round;
	}
	@media (hover: hover) and (pointer: fine) {
		.tools :global(button:hover:not(:disabled)) {
			background: #26335f0f;
		}
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
	.fab:focus-visible,
	.sheet header button:focus-visible {
		outline: 2px solid var(--focus);
		outline-offset: 2px;
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
		height: 100dvh;
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
	.print-only {
		display: none;
	}
	@media print {
		:global(body) {
			background: #fff;
		}
		.page,
		.fab,
		.scrim,
		.sheet {
			display: none;
		}
		.print-only {
			display: block;
			max-width: 170mm;
			margin: 0 auto;
		}
	}
</style>
