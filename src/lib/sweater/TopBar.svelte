<script lang="ts">
	import HowItWorks from './HowItWorks.svelte';
	import Logo from '$lib/Logo.svelte';
	import AccountLink from '$lib/AccountLink.svelte';

	type Step = { id: string; label: string; disabled?: boolean; reason?: string };
	let {
		steps,
		tab,
		onTab
	}: {
		steps: Step[];
		tab: string;
		onTab: (id: string) => void;
	} = $props();

	let index = $derived(Math.max(0, steps.findIndex((s) => s.id === tab)));
</script>

<header class="top">
	<a class="home" href="/" aria-label="Knit It home"><Logo size={26} word={false} /></a>

	<div class="steps" role="tablist" aria-label="Steps" style="--i: {index}; --n: {steps.length - 1}">
		<div class="track" aria-hidden="true"><div class="fill"></div></div>
		{#each steps as s, i (s.id)}
			<button
				type="button"
				role="tab"
				aria-selected={tab === s.id}
				aria-label={s.label}
				class:done={i < index}
				disabled={s.disabled}
				title={s.disabled ? s.reason : undefined}
				onclick={() => onTab(s.id)}
			>
				<span class="dot" aria-hidden="true">{#if i < index}✓{:else}{i + 1}{/if}</span>
				<span class="name">{s.label}</span>
			</button>
		{/each}
	</div>

	<div class="right">
		<AccountLink />
		<HowItWorks />
	</div>
</header>

<style>
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
		text-decoration: none;
	}
	a:focus-visible {
		outline: 2px solid var(--focus);
		outline-offset: 1px;
	}
	/* ── Steps: one yarn line runs through them and fills as you go ── */
	.steps {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 4px;
		justify-self: center;
		width: 420px;
		max-width: 100%;
	}
	.track {
		position: absolute;
		left: 13px;
		right: 13px;
		top: 50%;
		height: 3px;
		margin-top: -1.5px;
		border-radius: 2px;
		background: repeating-linear-gradient(90deg, var(--line-strong) 0 4px, transparent 4px 7px);
		pointer-events: none;
	}
	.fill {
		position: absolute;
		inset: 0;
		border-radius: 2px;
		background: var(--accent);
		transform-origin: left;
		transform: scaleX(calc(var(--i) / var(--n)));
		transition: transform 320ms cubic-bezier(0.23, 1, 0.32, 1);
	}
	.steps button {
		position: relative;
		display: inline-flex;
		align-items: center;
		gap: 7px;
		height: 32px;
		padding: 0 10px 0 4px;
		border: 0;
		border-radius: 999px;
		background: var(--surface);
		color: var(--muted);
		font: inherit;
		font-size: 13px;
		font-weight: 500;
		cursor: pointer;
		transition: color 150ms ease-out, transform 160ms cubic-bezier(0.23, 1, 0.32, 1);
	}
	.steps button:active:not(:disabled) {
		transform: scale(0.97);
	}
	.steps button:disabled {
		cursor: not-allowed;
		opacity: 0.55;
	}
	.steps button:focus-visible {
		outline: 2px solid var(--focus);
		outline-offset: 1px;
	}
	.steps button[aria-selected='true'] {
		color: var(--ink);
	}
	.dot {
		display: grid;
		place-items: center;
		width: 24px;
		height: 24px;
		border-radius: 50%;
		border: 1.5px solid var(--line-strong);
		background: var(--surface);
		font-size: 11px;
		font-weight: 600;
		transition: background-color 200ms ease-out, border-color 200ms ease-out, color 200ms ease-out;
	}
	.done .dot {
		border-color: var(--accent);
		background: var(--accent);
		color: #fff;
	}
	[aria-selected='true'] .dot {
		border-color: var(--accent);
		color: var(--accent-deep);
		box-shadow: 0 0 0 3px rgb(200 84 62 / 0.18);
	}
	@media (hover: hover) and (pointer: fine) {
		.steps button:hover:not(:disabled) {
			color: var(--ink);
		}
	}
	/* ── Right: links ── */
	.right {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: 6px;
		min-width: 0;
	}
	@media (prefers-reduced-motion: no-preference) {
		.fill {
			animation: draw 600ms cubic-bezier(0.23, 1, 0.32, 1) both;
		}
		@keyframes draw {
			from {
				transform: scaleX(0);
			}
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.fill {
			transition: none;
		}
	}
	/* The stepper stays dead centre because both sides share the leftover space equally. */
	@media (max-width: 1000px) {
		.steps {
			width: 360px;
		}
	}
	/* On a phone the numbers live under the model, and only the current step keeps its name. */
	@media (max-width: 760px) {
		.top {
			grid-template-columns: auto 1fr;
		}
		.right {
			display: none;
		}
		.steps {
			justify-self: end;
			width: 100%;
			max-width: 300px;
		}
		.steps button:not([aria-selected='true']) .name {
			display: none;
		}
		.steps button:not([aria-selected='true']) {
			padding-right: 4px;
		}
	}
</style>
