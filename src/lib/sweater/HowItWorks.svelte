<script lang="ts">
	let dialog = $state<HTMLDialogElement>();

	const steps = [
		{ id: 'design', title: 'Design it', text: 'Pick the garment, size, fit, neckline and sleeves. Every choice shows up on the 3D model, which you can drag to see the back.' },
			{ id: 'yarn', title: 'Choose your yarn', text: 'The yarn weight sets the gauge. Tell us which needles you own and we use them.' },
		{ id: 'pattern', title: 'Knit it', text: 'Get a written top-down pattern with the stitch counts worked out. Tick steps off as you go.' }
	];

	/** A click on the backdrop lands on the dialog itself rather than on anything inside it. */
	function backdrop(e: MouseEvent) {
		if (e.target === dialog) dialog?.close();
	}
</script>

<button type="button" class="help" aria-label="How it works" title="How it works" onclick={() => dialog?.showModal()}>?</button>

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
<dialog bind:this={dialog} aria-labelledby="how-title" onclick={backdrop}>
	<div class="card">
		<button type="button" class="close" aria-label="Close" onclick={() => dialog?.close()}>×</button>
		<h2 id="how-title">How knit works</h2>
		<p class="lede">Design a sweater, see it in 3D, and get a pattern with the maths done.</p>
		<ol>
			{#each steps as s, i (s.id)}
				<li style="--d: {i * 90}ms">
					<svg viewBox="0 0 120 90" aria-hidden="true">
						{#if s.id === 'design'}
							<path class="shirt paint" d="M40 14 L52 10 Q60 18 68 10 L80 14 L104 40 L92 50 L82 40 L82 80 L38 80 L38 40 L28 50 L16 40 Z" />
							<path class="ink" d="M52 10 Q60 18 68 10" fill="none" />
							<circle class="dot a" cx="46" cy="86" r="3" /><circle class="dot b" cx="60" cy="86" r="3" /><circle class="dot c" cx="74" cy="86" r="3" />
						{:else if s.id === 'yarn'}
							<circle class="shirt" cx="34" cy="52" r="22" />
							<path class="ink" d="M16 44 Q34 56 50 40 M14 54 Q34 66 54 50 M20 66 Q36 70 48 64" fill="none" />
							<path class="ink strand" d="M54 40 Q68 28 78 44" fill="none" />
							<path class="needle" d="M62 76 L108 18" /><path class="needle" d="M70 78 L112 28" />
							<g class="stitches">
								{#each [0, 1, 2, 3] as k (k)}
									<path class="ink" style="--k: {k}" d="M{74 + k * 9} 62 l4 7 l4 -7" fill="none" />
								{/each}
							</g>
						{:else}
							<rect class="paper" x="28" y="8" width="64" height="76" rx="5" />
							{#each [0, 1, 2] as k (k)}
								<path class="tick" style="--k: {k}" d="M38 {26 + k * 20} l4 4 l8 -9" fill="none" />
								<path class="ink" d="M58 {26 + k * 20} H82" fill="none" opacity="0.5" />
							{/each}
						{/if}
					</svg>
					<h3><span>{i + 1}</span>{s.title}</h3>
					<p>{s.text}</p>
				</li>
			{/each}
		</ol>
		<div class="foot">
			<a href="/about">Read the full guide and FAQ</a>
			<button type="button" class="go" onclick={() => dialog?.close()}>Start designing</button>
		</div>
	</div>
</dialog>

<style>
	.help {
		display: grid;
		place-items: center;
		width: 28px;
		height: 28px;
		padding: 0;
		border: 0;
		border-radius: 50%;
		background: none;
		color: var(--muted);
		font: inherit;
		font-size: 13px;
		font-weight: 600;
		cursor: pointer;
		transition: background-color 120ms ease-out;
	}
	.help:focus-visible,
	.close:focus-visible,
	.go:focus-visible,
	.foot a:focus-visible {
		outline: 2px solid var(--focus);
		outline-offset: 1px;
	}
	@media (hover: hover) and (pointer: fine) {
		.help:hover {
			background: rgb(38 51 95 / 0.08);
		}
	}
	dialog {
		width: min(640px, calc(100vw - 24px));
		max-height: calc(100dvh - 24px);
		padding: 0;
		border: 0;
		border-radius: 16px;
		background: var(--on-ink, #faf3dc);
		color: var(--ink);
		box-shadow: 0 24px 60px rgb(38 51 95 / 0.35);
		overflow: auto;
	}
	dialog::backdrop {
		background: rgb(38 51 95 / 0.4);
		backdrop-filter: blur(3px);
	}
	.card {
		position: relative;
		padding: 28px 24px 22px;
	}
	.close {
		position: absolute;
		top: 12px;
		right: 12px;
		display: grid;
		place-items: center;
		width: 32px;
		height: 32px;
		padding: 0;
		border: 0;
		border-radius: 50%;
		background: none;
		color: var(--muted);
		font-size: 22px;
		line-height: 1;
		cursor: pointer;
	}
	h2 {
		margin: 0;
		font-size: 22px;
		letter-spacing: -0.01em;
	}
	.lede {
		margin: 4px 0 18px;
		color: var(--muted);
		font-size: 14px;
	}
	ol {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 12px;
		margin: 0;
		padding: 0;
		list-style: none;
	}
	li {
		padding: 12px 14px 14px;
		border: 1px solid var(--line);
		border-radius: 12px;
		background: var(--surface);
	}
	svg {
		display: block;
		width: 100%;
		height: 96px;
		margin-bottom: 8px;
		overflow: visible;
	}
	h3 {
		display: flex;
		align-items: center;
		gap: 8px;
		margin: 0 0 4px;
		font-size: 14px;
	}
	h3 span {
		display: grid;
		place-items: center;
		width: 20px;
		height: 20px;
		border-radius: 50%;
		background: var(--accent);
		color: #fff;
		font-size: 11px;
	}
	li p {
		margin: 0;
		color: var(--muted);
		font-size: 13px;
		line-height: 1.45;
	}
	.foot {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		margin-top: 18px;
	}
	.foot a {
		color: var(--link);
		font-size: 13px;
	}
	.go {
		height: 36px;
		padding: 0 16px;
		border: 0;
		border-radius: 999px;
		background: var(--ink);
		color: var(--on-ink);
		font: inherit;
		font-size: 13px;
		font-weight: 600;
		cursor: pointer;
	}
	@media (hover: hover) and (pointer: fine) {
		.go:hover {
			background: var(--ink-hover);
		}
	}
	/* ── Pictures ── */
	.shirt {
		fill: var(--accent);
		stroke: var(--ink);
		stroke-width: 2;
		stroke-linejoin: round;
	}
	.ink {
		stroke: var(--ink);
		stroke-width: 2;
		stroke-linecap: round;
		stroke-linejoin: round;
	}
	.paper {
		fill: #fff;
		stroke: var(--ink);
		stroke-width: 2;
	}
	.tick {
		stroke: var(--good);
		stroke-width: 3;
		stroke-linecap: round;
		stroke-linejoin: round;
	}
	.needle {
		stroke: var(--ink);
		stroke-width: 4;
		stroke-linecap: round;
	}
	circle.shirt {
		stroke-width: 2;
	}
	.dot.a { fill: #465e9d; }
	.dot.b { fill: #c8543e; }
	.dot.c { fill: #6f9a6b; }
	dialog:not([open]) * {
		animation: none !important;
	}
	@media (prefers-reduced-motion: no-preference) {
		li {
			animation: rise 420ms cubic-bezier(0.23, 1, 0.32, 1) both;
			animation-delay: var(--d);
		}
		.paint {
			animation: paint 6s ease-in-out infinite;
		}
		.strand {
			stroke-dasharray: 60;
			animation: pull 2.6s ease-in-out infinite;
		}
		.stitches path {
			animation: pop 2.6s ease-out infinite;
			animation-delay: calc(var(--k) * 220ms);
		}
		.tick {
			stroke-dasharray: 20;
			animation: check 3.2s ease-out infinite;
			animation-delay: calc(var(--k) * 500ms);
		}
		@keyframes rise {
			from {
				opacity: 0;
				transform: translateY(8px);
			}
		}
		@keyframes paint {
			0%, 28% { fill: #c8543e; }
			33%, 61% { fill: #465e9d; }
			66%, 94% { fill: #6f9a6b; }
			100% { fill: #c8543e; }
		}
		@keyframes pull {
			0% { stroke-dashoffset: 60; }
			60%, 100% { stroke-dashoffset: 0; }
		}
		@keyframes pop {
			0%, 10% { opacity: 0; transform: translateY(4px); }
			30%, 85% { opacity: 1; transform: none; }
			100% { opacity: 0; }
		}
		@keyframes check {
			0% { stroke-dashoffset: 20; }
			25%, 90% { stroke-dashoffset: 0; }
			100% { stroke-dashoffset: 20; }
		}
	}
	@media (max-width: 560px) {
		ol {
			grid-template-columns: 1fr;
		}
		svg {
			height: 80px;
		}
	}
</style>
