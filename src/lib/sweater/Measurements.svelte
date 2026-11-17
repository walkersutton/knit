<script lang="ts">
	import { standardBody } from './fit';
	import type { Design } from './garment';
	import { hold, Measures, ROWS } from './measures.svelte';

	// Each measurement is a woven garment label; the numbers are big, and you can trace a standard size to start from.
	let { design = $bindable() }: { design: Design } = $props();
	const m = new Measures(() => design);

	const sizes = ['XS', 'S', 'M', 'L', 'XL'];
	const tones = ['clay', 'mustard', 'sage'];
	const tilt = [-1.1, 0.8, -0.6];
	/** The size whose body numbers match, if any: it stays lit until you change a number. */
	const traced = $derived(sizes.find((s) => {
		const b = standardBody('Adult', s);
		return b.chest === m.cm('chest') && b.length === m.cm('length') && b.arm === m.cm('arm');
	}));
</script>

<div class="measures">
	<div class="head">
		<span>Trace a size, then make it yours</span>
		<div class="units" role="radiogroup" aria-label="Units">
			{#each ['cm', 'in'] as const as u}
				<button type="button" role="radio" aria-checked={m.unit === u} onclick={() => m.setUnit(u)}>{u}</button>
			{/each}
		</div>
	</div>

	<div class="trace" role="group" aria-label="Start from a size">
		{#each sizes as s, i (s)}
			<button type="button" class:on={traced === s} aria-pressed={traced === s} style:--i={i} onclick={() => m.putCm(standardBody('Adult', s))}>{s}</button>
		{/each}
	</div>

	<div class="labels">
		{#each ROWS as r, i (r.key)}
			<div class="tag {tones[i]}" style="--i:{i};--r:{tilt[i]}deg">
				<span class="hole" aria-hidden="true"></span>
				<div class="line">
					<label for="g-{r.key}">{r.label}</label>
				</div>
				<div class="body">
					<button type="button" class="round" aria-label="Decrease {r.label.toLowerCase()}" disabled={m.atMin(r.key)} use:hold={() => m.nudge(r.key, -1)}>−</button>
					<div class="num">
						<input
							id="g-{r.key}"
							type="text"
							inputmode="decimal"
							autocomplete="off"
							aria-describedby="g-{r.key}-hint"
							value={m.text(r.key)}
							oninput={(e) => m.type(r.key, e.currentTarget.value)}
							onblur={() => m.commit(r.key)}
							onkeydown={(e) => {
								if (e.key === 'Enter') m.commit(r.key);
								else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
									e.preventDefault();
									m.nudge(r.key, e.key === 'ArrowUp' ? 1 : -1);
								}
							}}
						/>
						<span aria-hidden="true">{m.unit}</span>
					</div>
					<button type="button" class="round" aria-label="Increase {r.label.toLowerCase()}" disabled={m.atMax(r.key)} use:hold={() => m.nudge(r.key, 1)}>+</button>
				</div>
				<p id="g-{r.key}-hint">{r.hint}</p>
			</div>
		{/each}
	</div>

	<div class="price" style="--i:3">
		<span class="hole" aria-hidden="true"></span>
		<div>
			<small>Finished chest</small>
			<strong>{m.len(m.finished)}</strong>
		</div>
		<em>{m.signed(m.ease)}<small>ease</small></em>
	</div>
</div>

<style>
	.measures {
		margin-top: 14px;
	}
	.head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 8px;
		color: var(--muted);
		font-size: 12px;
		font-weight: 500;
	}
	.units {
		display: flex;
		gap: 2px;
		padding: 2px;
		border-radius: 6px;
		background: var(--line);
	}
	.units button {
		min-width: 34px;
		height: 24px;
		border: 0;
		border-radius: 4px;
		background: none;
		color: var(--muted);
		font: inherit;
		font-size: 12px;
		font-weight: 600;
		cursor: pointer;
		transition:
			background-color 120ms ease-out,
			color 120ms ease-out;
	}
	.units button[aria-checked='true'] {
		background: var(--surface);
		box-shadow: 0 1px 1px rgb(38 51 95 / 0.15);
		color: var(--ink);
	}
	button:focus-visible,
	input:focus-visible {
		outline: 2px solid var(--focus);
		outline-offset: 2px;
	}

	/* Sizes to trace from: little sewn-on letters. */
	.trace {
		display: flex;
		gap: 6px;
	}
	.trace button {
		flex: 1;
		height: 32px;
		border: 1.5px dashed var(--line-strong);
		border-radius: 8px;
		background: transparent;
		color: var(--muted);
		font-family: var(--display);
		font-size: 14px;
		font-weight: 600;
		cursor: pointer;
		touch-action: manipulation;
		-webkit-tap-highlight-color: transparent;
		transition:
			background-color 120ms ease-out,
			border-color 120ms ease-out,
			color 120ms ease-out,
			transform 120ms cubic-bezier(0.23, 1, 0.32, 1);
	}
	.trace button:active {
		transform: scale(0.95);
	}
	.trace button.on {
		border-style: solid;
		border-color: #b88a1c;
		background: #e8bd53;
		color: var(--ink);
	}
	@media (hover: hover) and (pointer: fine) {
		.trace button:not(.on):hover {
			border-color: var(--ink);
			color: var(--ink);
		}
	}

	.labels {
		display: grid;
		gap: 14px;
		margin-top: 16px;
	}
	.tag {
		--tint: #f4d5c3;
		--solid: #d99172;
		position: relative;
		padding: 10px 14px 12px 38px;
		border-radius: 10px;
		/* Woven: fine crossing threads over the tint. */
		background:
			repeating-linear-gradient(0deg, rgb(255 255 255 / 0.28) 0 1px, transparent 1px 3px),
			repeating-linear-gradient(90deg, rgb(38 51 95 / 0.035) 0 1px, transparent 1px 3px),
			var(--tint);
		box-shadow:
			0 3px 0 rgb(38 51 95 / 0.14),
			0 8px 14px -6px rgb(38 51 95 / 0.22);
		rotate: var(--r);
		animation: drop 300ms cubic-bezier(0.23, 1, 0.32, 1) both;
		animation-delay: calc(var(--i) * 70ms);
		transition:
			rotate 200ms cubic-bezier(0.23, 1, 0.32, 1),
			translate 200ms cubic-bezier(0.23, 1, 0.32, 1);
	}
	.tag.mustard {
		--tint: #f6e2a4;
		--solid: #e8bd53;
	}
	.tag.sage {
		--tint: #d7e4d3;
		--solid: #78917a;
	}
	/* The stitched hem, like the seam on a woven label. */
	.tag::before {
		content: '';
		position: absolute;
		inset: 5px;
		border: 1.5px dashed rgb(38 51 95 / 0.32);
		border-radius: 6px;
		pointer-events: none;
	}
	.tag:focus-within {
		rotate: 0deg;
	}
	@media (hover: hover) and (pointer: fine) {
		.tag:hover {
			rotate: 0deg;
			translate: 0 -1px;
		}
	}
	@keyframes drop {
		from {
			opacity: 0;
			translate: 0 -10px;
			rotate: calc(var(--r) * -3);
		}
	}
	.hole {
		position: absolute;
		top: 50%;
		left: 12px;
		width: 12px;
		height: 12px;
		margin-top: -6px;
		border-radius: 50%;
		background: var(--surface);
		box-shadow:
			inset 0 1.5px 2px rgb(38 51 95 / 0.35),
			0 0 0 2px var(--solid);
	}
	.line label {
		font-size: 11px;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}
	.body {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
		margin: 2px 0 0;
	}
	.num {
		display: flex;
		align-items: baseline;
		justify-content: center;
		flex: 1;
		gap: 4px;
	}
	.num input {
		width: 3.3ch;
		min-width: 0;
		padding: 0;
		border: 0;
		border-radius: 4px;
		background: none;
		color: var(--ink);
		font-family: var(--display);
		font-size: 42px;
		font-weight: 600;
		font-variant-numeric: tabular-nums;
		line-height: 1.15;
		text-align: right;
	}
	.num span {
		color: rgb(38 51 95 / 0.65);
		font-family: var(--display);
		font-size: 15px;
		font-weight: 500;
	}
	.round {
		display: grid;
		place-items: center;
		flex: none;
		width: 40px;
		height: 40px;
		padding: 0;
		border: 0;
		border-radius: 50%;
		background: var(--solid);
		box-shadow:
			0 2px 0 rgb(38 51 95 / 0.28),
			inset 0 1px 0 rgb(255 255 255 / 0.3);
		color: var(--ink);
		font: inherit;
		font-size: 22px;
		line-height: 1;
		cursor: pointer;
		touch-action: manipulation;
		user-select: none;
		-webkit-user-select: none;
		-webkit-tap-highlight-color: transparent;
		transition:
			transform 120ms cubic-bezier(0.23, 1, 0.32, 1),
			box-shadow 120ms cubic-bezier(0.23, 1, 0.32, 1);
	}
	.round:active:not(:disabled) {
		transform: translateY(2px) scale(0.94);
		box-shadow: 0 0 0 rgb(38 51 95 / 0.28);
	}
	.round:disabled {
		opacity: 0.4;
		cursor: default;
	}
	.tag p {
		margin: 2px 0 0;
		color: rgb(38 51 95 / 0.75);
		font-size: 12px;
		line-height: 1.4;
	}

	/* The finished chest, on a price tag. */
	.price {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		margin: 26px 8px 0 28px;
		padding: 10px 14px 10px 40px;
		background: #fffdf6;
		border-radius: 4px 10px 10px 4px;
		clip-path: polygon(14px 0, 100% 0, 100% 100%, 14px 100%, 0 50%);
		filter: drop-shadow(0 2px 0 rgb(38 51 95 / 0.18));
		rotate: 1.4deg;
		animation: drop 300ms cubic-bezier(0.23, 1, 0.32, 1) both;
		animation-delay: calc(var(--i) * 70ms + 40ms);
	}
	.price .hole {
		left: 16px;
		--solid: var(--line-strong);
	}
	.price small {
		display: block;
		color: var(--muted);
		font-size: 11px;
		font-weight: 600;
		letter-spacing: 0.05em;
		text-transform: uppercase;
	}
	.price strong {
		font-family: var(--display);
		font-size: 22px;
		font-variant-numeric: tabular-nums;
		line-height: 1.1;
	}
	.price em {
		color: var(--accent-deep);
		font-family: var(--display);
		font-size: 16px;
		font-style: normal;
		font-weight: 600;
		font-variant-numeric: tabular-nums;
		text-align: right;
	}
	.price em small {
		margin-top: 1px;
	}
	@media (prefers-reduced-motion: reduce) {
		.tag,
		.price {
			animation: none;
			transition: none;
		}
	}
</style>
