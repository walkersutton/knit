<script lang="ts">
	import { onMount, tick } from 'svelte';
	import Viewer from './Viewer.svelte';
	import { encodeGif } from './gif';
	import type { Design } from './garment';
	import { colors } from './options';
	import { encodeDesign } from './progress';
	import { designDetail, designName, randomDesign, seeded } from './random';

	// The same three sweaters every time the page loads, so the first look is a good one; rolling is random.
	const START = [11, 23, 16];
	/** How many rolls ahead are kept ready. */
	const DEPTH = 5;
	/** The cards' flat background, which the pictures are drawn over so they blend in. */
	const STAGE = '#f6edd5';
	// A GIF's delay is a whole number of hundredths of a second, and browsers slow anything under 20 ms down,
	// so 20 ms (50 fps) is the fastest it can go. 60 frames at that rate keep the turn at about 1.2 s.
	const SIZE = { width: 360, height: 414, frames: 60, background: STAGE };
	const FRAME_MS = 20;
	const SPIN_MS = (SIZE.frames + 1) * FRAME_MS;
	/** The GIF fades out over the still rather than being swapped for it. */
	const FADE_MS = 140;
	const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

	/** A sweater and its two pictures: a still, and a short GIF of it turning once. No 3D model is kept. */
	type Entry = { id: number; design: Design; still: string | null; spin: string | null; tries: number };
	let nextId = 0;
	const entry = (design: Design): Entry => ({ id: nextId++, design, still: null, spin: null, tries: 0 });

	// What each card shows now.
	const cur: Entry[] = START.map((s) => entry(randomDesign(seeded(s))));
	// Sweaters for the next few rolls, drawn in the background.
	const queue: Entry[][] = START.map(() => Array.from({ length: DEPTH }, () => entry(randomDesign())));
	let slots = $state(cur.map((e) => ({ id: e.id, design: e.design, still: e.still, spin: e.spin, playing: false, fading: false, run: 0 })));
	let kept = $state([false, false, false]);
	const free = $derived(kept.filter((k) => !k).length);

	let section: HTMLElement;
	/** The one 3D scene, alive only while pictures are being drawn. */
	let cameraOn = $state(false);
	let camera = $state<Viewer>();
	let alive = true;
	let filling = false;
	let again = false;
	let release: ReturnType<typeof setTimeout>;
	const timers: ReturnType<typeof setTimeout>[] = [];
	const playing: ReturnType<typeof setTimeout>[] = [];

	const decoded = async (url: string) => {
		const img = new Image();
		img.src = url;
		await img.decode().catch(() => {});
	};
	const discard = (e: Entry) => [e.still, e.spin].forEach((u) => u && URL.revokeObjectURL(u));
	const wanted = (): Entry | undefined => {
		// What is on the cards first, then the nearest rolls.
		const missing = (e?: Entry) => e && !e.still && e.tries < 2;
		for (const e of cur) if (missing(e)) return e;
		for (let d = 0; d < DEPTH; d++) for (const q of queue) if (missing(q[d])) return q[d];
	};

	/** Plays the turn on a card: its GIF once, over the still, which it then fades out to reveal. */
	function play(i: number) {
		const slot = slots[i];
		if (reduced || !slot.spin) return;
		clearTimeout(playing[i]);
		slot.run++;
		slot.fading = false;
		slot.playing = true;
		playing[i] = setTimeout(() => {
			slot.fading = true;
			playing[i] = setTimeout(() => (slot.playing = false), FADE_MS + 40);
		}, SPIN_MS + 40);
	}

	/**
	 * Draws sweaters one at a time on a hidden 3D scene and keeps only the pictures. The scene is thrown away
	 * a few seconds after the last one, so the page holds no 3D model (or graphics context) while idle.
	 */
	async function fill() {
		if (filling) return void (again = true);
		filling = true;
		clearTimeout(release);
		cameraOn = true;
		await tick();
		do {
			again = false;
			for (let e = wanted(); e && alive; e = wanted()) {
				e.tries++;
				const made = await camera?.pictures(e.design, SIZE);
				if (!made || !alive) continue;
				const gif = await encodeGif(made.frames, { delay: FRAME_MS, background: [0xf6, 0xed, 0xd5] });
				const still = URL.createObjectURL(made.still);
				const spin = URL.createObjectURL(gif);
				await Promise.all([decoded(still), decoded(spin)]);
				const i = cur.indexOf(e);
				// Rolled away while it was being drawn: nobody will use it.
				if (!alive || (i < 0 && !queue.some((q) => q.includes(e)))) {
					URL.revokeObjectURL(still);
					URL.revokeObjectURL(spin);
					continue;
				}
				e.still = still;
				e.spin = spin;
				if (i >= 0) {
					slots[i].still = still;
					slots[i].spin = spin;
					play(i);
				}
			}
		} while (again && alive);
		filling = false;
		release = setTimeout(() => (cameraOn = false), 3000);
	}

	// Nothing is drawn until the section is about to scroll into view.
	onMount(() => {
		const io = new IntersectionObserver(
			([hit]) => {
				if (!hit.isIntersecting) return;
				io.disconnect();
				fill();
			},
			{ rootMargin: '200px' }
		);
		io.observe(section);
		return () => {
			alive = false;
			io.disconnect();
			clearTimeout(release);
			[...timers, ...playing].forEach(clearTimeout);
			[...cur, ...queue.flat()].forEach(discard);
		};
	});

	function roll() {
		for (let i = 0; i < slots.length; i++) {
			if (kept[i]) continue;
			discard(cur[i]);
			cur[i] = queue[i].shift()!;
			queue[i].push(entry(randomDesign()));
			const e = cur[i];
			clearTimeout(playing[i]);
			slots[i] = { id: e.id, design: e.design, still: e.still, spin: e.spin, playing: false, fading: false, run: 0 };
			play(i);
		}
		// Draw the replacements once the new sweaters have had their moment.
		timers.push(setTimeout(fill, 500));
	}

	const toggle = (i: number) => (kept[i] = !kept[i]);
	const swatch = (hex: string) => colors.find((c) => c.value === hex)?.label ?? '';
</script>

<section class="roll" aria-labelledby="roll-h" bind:this={section}>
	<h2 id="roll-h">Feeling lucky?</h2>
	<p class="sub">Roll the yarn and see what comes off the needles. Every sweater is a different shape and colour.</p>

	<ul>
		{#each slots as slot, n (n)}
			{@const d = slot.design}
			<li class:kept={kept[n]}>
				<a class="stage" href="/design#d={encodeDesign(d)}" onpointerenter={() => play(n)} aria-label="{designName(d)}. Open it in the designer.">
					{#key slot.id}
						<span class="swap" style="--d: {[0, 60, 110][n]}ms">
							{#if slot.still}
								<!-- The still never leaves: the GIF plays on top of it, so nothing is ever swapped in at the end. -->
								<img src={slot.still} alt="" />
								{#if slot.playing && slot.spin}
									{#key slot.run}<img class="spin" class:out={slot.fading} src={slot.spin} alt="" />{/key}
								{/if}
							{:else}
								<span class="ball" aria-hidden="true">🧶</span>
							{/if}
						</span>
					{/key}
					<span class="cue" aria-hidden="true">Design this →</span>
				</a>
				<p class="name"><a href="/design#d={encodeDesign(d)}">{designName(d)}</a></p>
				<p class="detail">{designDetail(d)}</p>
				<p class="yarns">
					<i style="background:{d.color}" title={swatch(d.color)}></i>
					{#if d.pattern !== 'Solid'}<i style="background:{d.contrast}" title={swatch(d.contrast)}></i>{/if}
					<span>{d.pattern === 'Solid' ? 'Solid' : d.pattern}</span>
				</p>
				<div class="actions">
				<button type="button" class="keep" aria-pressed={kept[n]} onclick={() => toggle(n)}>
					<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
						<rect x="3" y="7" width="10" height="7" rx="2" fill="currentColor" />
						<path d={kept[n] ? 'M5 7V5a3 3 0 0 1 6 0v2' : 'M5 7V5a3 3 0 0 1 5.6-1.5'} fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap={kept[n] ? 'butt' : 'round'} />
					</svg>
					{kept[n] ? 'Keeping' : 'Keep'}
				</button>
				<a class="open" href="/design#d={encodeDesign(d)}">Design this <span aria-hidden="true">→</span></a>
				</div>
			</li>
		{/each}
	</ul>

	{#if cameraOn}
		<!-- An off-screen camera that draws the sweaters; never shown, and gone when it is not needed. -->
		<div class="camera" aria-hidden="true"><Viewer bind:this={camera} onview={() => {}} intro={false} /></div>
	{/if}

	<button type="button" class="go" onclick={roll} disabled={free === 0}>
		{free === 0 ? 'Everything is kept' : free === 3 ? 'Roll three sweaters' : `Roll ${free === 1 ? 'the other one' : 'the other two'}`}
	</button>
</section>

<style>
	.roll {
		--stage: #f6edd5; /* keep in step with STAGE above */
		width: 100%;
		max-width: 912px;
		margin: 0 auto;
		padding: 24px 16px 56px;
		text-align: center;
	}
	h2 {
		margin: 0 0 4px;
		font-family: var(--display);
		font-size: 30px;
		font-weight: 700;
		line-height: 1.2;
	}
	.sub {
		max-width: 440px;
		margin: 0 auto 28px;
		color: var(--muted);
		font-size: 17px;
		text-wrap: balance;
	}
	ul {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
		gap: 20px;
		margin: 0 0 28px;
		padding: 0;
		list-style: none;
	}
	li {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 10px 10px 16px;
		border-radius: 18px;
		background: #fffaf0;
		box-shadow:
			0 0 0 2px var(--line),
			0 2px 0 var(--line);
		transition:
			box-shadow 160ms ease-out,
			background-color 160ms ease-out;
	}
	li.kept {
		background: #fff3cf;
		box-shadow:
			0 0 0 2px #e8bd53,
			0 2px 0 #e8bd53;
	}
	.stage {
		display: block;
		position: relative;
		width: 100%;
		aspect-ratio: 4 / 4.6;
		padding: 0;
		overflow: hidden;
		border: 0;
		border-radius: 12px;
		background: var(--stage);
		cursor: pointer;
		-webkit-tap-highlight-color: transparent;
		transition: transform 160ms cubic-bezier(0.23, 1, 0.32, 1);
	}
	.stage:active {
		transform: scale(0.985);
	}
	.stage:focus-visible {
		outline: 3px solid var(--focus);
		outline-offset: 3px;
	}
	.swap {
		position: absolute;
		inset: 0;
		display: grid;
		place-items: center;
		animation: appear 220ms cubic-bezier(0.23, 1, 0.32, 1) var(--d, 0ms) backwards;
	}
	.swap img {
		position: absolute;
		inset: 0;
		display: block;
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
	.spin {
		transition: opacity 140ms ease-out; /* FADE_MS */
	}
	.spin.out {
		opacity: 0;
	}
	.ball {
		font-size: 44px;
		animation: bob 700ms ease-in-out infinite alternate;
	}
	@keyframes appear {
		from {
			opacity: 0;
			transform: scale(0.97);
		}
	}
	@keyframes bob {
		to {
			transform: translateY(-6px) rotate(12deg);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.swap,
		.ball {
			animation: none;
		}
		.cue,
		.open span {
			transition: opacity 160ms;
			transform: translate(-50%, 0);
		}
		.open span {
			transform: none;
		}
	}
	/* Same size as the pictures are drawn at, so every one is framed exactly alike. */
	.camera {
		position: absolute;
		left: -10000px;
		top: 0;
		width: 360px;
		height: 414px;
		pointer-events: none;
	}
	.name {
		margin: 14px 8px 2px;
		font-family: var(--display);
		font-size: 19px;
		font-weight: 600;
		line-height: 1.2;
		text-wrap: balance;
	}
	.name a {
		color: inherit;
		text-decoration: none;
	}
	.name a:hover {
		text-decoration: underline wavy #e8bd53;
		text-underline-offset: 4px;
	}
	.name a:focus-visible {
		outline: 3px solid var(--focus);
		outline-offset: 3px;
	}
	.detail {
		margin: 0 8px 8px;
		color: var(--muted);
		font-size: 13px;
	}
	.yarns {
		display: flex;
		align-items: center;
		gap: 5px;
		margin: 0 0 12px;
		color: var(--muted);
		font-size: 13px;
	}
	.yarns i {
		width: 14px;
		height: 14px;
		border-radius: 50%;
		box-shadow: inset 0 0 0 1.5px rgb(38 51 95 / 0.25);
	}
	.yarns span {
		margin-left: 4px;
	}
	.actions {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: center;
		gap: 6px 10px;
	}
	.open {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		height: 36px;
		padding: 0 6px;
		color: #c8543e;
		font-size: 13px;
		font-weight: 700;
		text-decoration: none;
	}
	.open span {
		transition: transform 160ms cubic-bezier(0.23, 1, 0.32, 1);
	}
	.open:focus-visible {
		outline: 3px solid var(--focus);
		outline-offset: 2px;
		border-radius: 6px;
	}
	.cue {
		position: absolute;
		left: 50%;
		bottom: 10px;
		padding: 6px 14px;
		border-radius: 999px;
		background: #c8543e;
		color: #fff8e6;
		font-size: 13px;
		font-weight: 700;
		white-space: nowrap;
		opacity: 0;
		transform: translate(-50%, 6px);
		transition:
			opacity 160ms cubic-bezier(0.23, 1, 0.32, 1),
			transform 160ms cubic-bezier(0.23, 1, 0.32, 1);
		pointer-events: none;
	}
	.stage:focus-visible .cue {
		opacity: 1;
		transform: translate(-50%, 0);
	}
	@media (hover: hover) and (pointer: fine) {
		.stage:hover .cue {
			opacity: 1;
			transform: translate(-50%, 0);
		}
		li:not(.kept):hover {
			box-shadow:
				0 0 0 2px #e8bd53,
				0 2px 0 #e8bd53;
		}
		.open:hover span {
			transform: translateX(3px);
		}
	}
	@media (pointer: coarse) {
		.open {
			height: 44px;
		}
	}
	.keep {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		height: 36px;
		padding: 0 14px;
		border: 2px solid var(--line);
		border-radius: 999px;
		background: transparent;
		color: var(--muted);
		font: inherit;
		font-size: 13px;
		font-weight: 600;
		cursor: pointer;
		-webkit-tap-highlight-color: transparent;
		transition:
			transform 160ms cubic-bezier(0.23, 1, 0.32, 1),
			background-color 150ms ease-out,
			border-color 150ms ease-out,
			color 150ms ease-out;
	}
	@media (pointer: coarse) {
		.keep {
			height: 44px;
		}
	}
	.keep:active {
		transform: scale(0.96);
	}
	.keep[aria-pressed='true'] {
		border-color: #e8bd53;
		background: #e8bd53;
		color: #26335f;
	}
	.keep:focus-visible,
	.go:focus-visible {
		outline: 3px solid var(--focus);
		outline-offset: 3px;
	}
	.go {
		height: 52px;
		padding: 0 28px;
		border: 0;
		border-radius: 14px;
		background: #c8543e;
		box-shadow: 0 4px 0 #8f3a2a;
		color: #fff8e6;
		font-family: var(--display);
		font-size: 19px;
		font-weight: 600;
		cursor: pointer;
		-webkit-tap-highlight-color: transparent;
		transition:
			transform 120ms ease-out,
			box-shadow 120ms ease-out,
			opacity 150ms ease-out;
	}
	.go:active:not(:disabled) {
		transform: translateY(3px);
		box-shadow: 0 1px 0 #8f3a2a;
	}
	.go:disabled {
		opacity: 0.5;
		cursor: default;
	}
	@media (hover: hover) and (pointer: fine) {
		.go:hover:not(:disabled) {
			background: #d0604a;
		}
	}
</style>
