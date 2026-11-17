<script lang="ts">
	import type { Snippet } from 'svelte';
	import Logo from '$lib/Logo.svelte';
	import { SITE } from '$lib/site';

	let { children, wide = false }: { children: Snippet; wide?: boolean } = $props();
</script>

<div class="page">
	<header class="top"><a href="/" aria-label="Knit It home"><Logo size={24} /></a><a class="cta" href="/design">Open the designer</a></header>
	<main class:wide>{@render children()}</main>
	<footer>Knit It is open source. <a href={SITE.source} target="_blank" rel="noopener">View the code on GitHub</a>.</footer>
</div>

<style>
	.page {
		min-height: 100dvh;
		font-size: 15px;
		line-height: 1.6;
	}
	.top {
		display: flex;
		align-items: center;
		justify-content: space-between;
		height: 44px;
		padding: 0 16px;
		border-bottom: 1px solid var(--line);
		background: color-mix(in srgb, var(--paper) 88%, transparent);
		font-size: 13px;
	}
	.top a:first-child {
		color: var(--ink);
		font-weight: 600;
		text-decoration: none;
	}
	main {
		max-width: 720px;
		margin: 0 auto;
		padding: 32px 16px 64px;
	}
	main.wide {
		max-width: 1040px;
	}
	.cta {
		display: inline-flex;
		align-items: center;
		height: 32px;
		padding: 0 12px;
		border-radius: 6px;
		background: var(--ink);
		color: #fff;
		font-size: 13px;
		font-weight: 500;
		text-decoration: none;
		transition:
			background-color 120ms ease-out,
			transform 120ms ease-out;
	}
	.cta:active {
		transform: scale(0.97);
	}
	a:focus-visible {
		outline: 2px solid var(--focus);
		outline-offset: 2px;
		border-radius: 4px;
	}
	@media (hover: hover) and (pointer: fine) {
		.cta:hover {
			background: #3f3f46;
		}
	}
	footer {
		max-width: 720px;
		margin: 0 auto;
		padding: 16px 16px 32px;
		border-top: 1px solid var(--line);
		color: var(--muted);
		font-size: 13px;
	}
	footer a {
		color: inherit;
	}
</style>
