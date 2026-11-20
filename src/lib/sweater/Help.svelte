<script lang="ts">
	import type { Field } from './options';

	/** A small "?" beside a field's label that opens what each of its options means. Closes on Escape or an outside press. */
	let { field }: { field: Field } = $props();
	let open = $state(false);
	let root = $state<HTMLElement>();
	const id = $props.id();
	const close = () => (open = false);
	const explained = $derived(field.options.filter((o) => o.hint));
</script>

<svelte:window
	onpointerdown={(e) => open && !root?.contains(e.target as Node) && close()}
	onkeydown={(e) => open && e.key === 'Escape' && (close(), root?.querySelector<HTMLElement>('button')?.focus())}
/>
<span class="help" bind:this={root}>
	<button type="button" aria-label="What the {field.label.toLowerCase()} choices mean" aria-expanded={open} aria-controls={id} onclick={() => (open = !open)}>?</button>
	{#if open}
		<div class="panel" {id} role="group" aria-label="{field.label} choices">
			<dl>
				{#each explained as o (o.value)}
					<dt>{o.label}</dt>
					<dd>{o.hint}</dd>
				{/each}
			</dl>
		</div>
	{/if}
</span>

<style>
	.help {
		position: relative;
		display: inline-flex;
		margin-left: 6px;
		vertical-align: middle;
	}
	button {
		display: inline-grid;
		place-items: center;
		width: 16px;
		height: 16px;
		padding: 0;
		border: 1px solid var(--line-strong);
		border-radius: 50%;
		background: transparent;
		color: var(--muted);
		font: inherit;
		font-size: 10.5px;
		font-weight: 600;
		line-height: 1;
		cursor: pointer;
		transition: color 120ms ease-out, border-color 120ms ease-out, background-color 120ms ease-out;
	}
	/* A bigger hit area than the little circle shows. */
	button::before {
		content: '';
		position: absolute;
		inset: -8px;
	}
	button[aria-expanded='true'] {
		border-color: var(--ink);
		background: var(--ink);
		color: var(--surface);
	}
	button:focus-visible {
		outline: 2px solid var(--focus);
		outline-offset: 2px;
	}
	@media (hover: hover) and (pointer: fine) {
		button:hover {
			border-color: var(--ink);
			color: var(--ink);
		}
	}
	.panel {
		position: absolute;
		z-index: 20;
		top: calc(100% + 8px);
		left: -10px;
		width: min(280px, calc(100vw - 48px));
		padding: 12px 14px;
		border: 1px solid var(--line-strong);
		border-radius: 10px;
		background: #fffdf6;
		box-shadow: 0 2px 4px rgb(38 51 95 / 0.1), 0 12px 32px rgb(38 51 95 / 0.18);
		color: var(--ink);
		font-size: 12.5px;
		font-weight: 400;
		line-height: 1.45;
		text-align: left;
		transform-origin: top left;
		animation: pop-in 150ms cubic-bezier(0.23, 1, 0.32, 1);
	}
	dl {
		margin: 0;
	}
	dt {
		font-weight: 600;
	}
	dd {
		margin: 2px 0 0;
		color: var(--muted);
		text-wrap: pretty;
	}
	dd + dt {
		margin-top: 10px;
	}
	@keyframes pop-in {
		from {
			opacity: 0;
			transform: scale(0.96);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.panel {
			animation: none;
		}
	}
</style>
