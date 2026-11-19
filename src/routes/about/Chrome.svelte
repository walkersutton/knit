<script lang="ts">
	import type { Snippet } from 'svelte';
	import HeaderSlot from '$lib/HeaderSlot.svelte';
	let { children, wide = false }: { children: Snippet; wide?: boolean } = $props();
</script>

{#snippet right()}<a class="cta" href="/design">Open the designer</a>{/snippet}
<HeaderSlot {right} />

<div class="page">
	<main class:wide>{@render children()}</main>
</div>

<style>
	.page {
		min-height: calc(100dvh - var(--bar));
		font-size: 15px;
		line-height: 1.6;
	}
	main {
		max-width: 720px;
		margin: 0 auto;
		padding: 32px 16px 64px;
	}
	main.wide {
		max-width: 912px;
	}
	.cta {
		display: inline-flex;
		align-items: center;
		height: 40px;
		padding: 0 18px;
		border-radius: 12px;
		background: #c8543e;
		box-shadow: 0 3px 0 #8f3a2a;
		color: #fff8e6;
		font-family: var(--display);
		font-size: 15px;
		font-weight: 600;
		text-decoration: none;
		transition:
			transform 120ms ease-out,
			box-shadow 120ms ease-out;
	}
	.cta:active {
		transform: translateY(2px);
		box-shadow: 0 1px 0 #8f3a2a;
	}
	a:focus-visible {
		outline: 2px solid var(--focus);
		outline-offset: 2px;
		border-radius: 4px;
	}
	@media (hover: hover) and (pointer: fine) {
		.cta:hover {
			background: #d0604a;
		}
	}
</style>
