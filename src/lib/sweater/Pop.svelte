<script lang="ts">
	import type { Snippet } from 'svelte';

	/** A button that opens a small panel; closes on Escape, an outside press, or when `close()` is called from inside. */
	let {
		label,
		title,
		align = 'left',
		up = false,
		children,
		button
	}: { label: string; title?: string; align?: 'left' | 'right'; up?: boolean; children: Snippet<[() => void]>; button: Snippet } = $props();
	let open = $state(false);
	let root = $state<HTMLElement>();
	const close = () => (open = false);
</script>

<svelte:window
	onpointerdown={(e) => open && !root?.contains(e.target as Node) && close()}
	onkeydown={(e) => open && e.key === 'Escape' && (close(), root?.querySelector<HTMLElement>('.trigger')?.focus())}
/>
<div class="pop" bind:this={root}>
	<button type="button" class="trigger" aria-haspopup="true" aria-expanded={open} aria-label={label} {title} onclick={() => (open = !open)}>{@render button()}</button>
	{#if open}
		<div class="panel" class:right={align === 'right'} class:up role="group" aria-label={label}>{@render children(close)}</div>
	{/if}
</div>

<style>
	.pop {
		position: relative;
		display: inline-block;
	}
	.trigger {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		min-width: 36px;
		height: 34px;
		padding: 0 11px;
		border: 1px solid var(--line-strong);
		border-radius: 8px;
		background: #fffdf6;
		box-shadow: 0 1px 1px rgb(38 51 95 / 0.08);
		color: var(--ink);
		font: inherit;
		font-weight: 500;
		cursor: pointer;
	}
	.trigger[aria-expanded='true'] {
		background: var(--wash);
	}
	.panel {
		position: absolute;
		z-index: 20;
		top: calc(100% + 6px);
		left: 0;
		min-width: 200px;
		padding: 10px;
		border: 1px solid var(--line-strong);
		border-radius: 10px;
		background: #fffdf6;
		box-shadow: 0 2px 4px rgb(38 51 95 / 0.1), 0 12px 32px rgb(38 51 95 / 0.18);
		transform-origin: top left;
		animation: pop-in 150ms cubic-bezier(0.23, 1, 0.32, 1);
	}
	.panel.right {
		left: auto;
		right: 0;
		transform-origin: top right;
	}
	.panel.up {
		top: auto;
		bottom: calc(100% + 6px);
		transform-origin: bottom left;
	}
	.panel.up.right {
		transform-origin: bottom right;
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
	.trigger:focus-visible {
		outline: 2px solid var(--focus);
		outline-offset: 2px;
	}
	@media (hover: hover) and (pointer: fine) {
		.trigger:hover {
			background: var(--wash);
		}
	}
</style>
