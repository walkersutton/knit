<script lang="ts">
	import Logo from '$lib/Logo.svelte';
	import AccountLink from '$lib/AccountLink.svelte';
	import { chrome } from '$lib/chrome.svelte';
</script>

<header class:app={chrome.app} class:wide={chrome.wide} class:has-center={!!chrome.center}>
	<div class="left">
		<a class="home" href="/" aria-label="knit home"><Logo size={32} word={false} /></a>
		{#if chrome.left}{@render chrome.left()}{/if}
	</div>
	{#if chrome.center}<div class="center">{@render chrome.center()}</div>{/if}
	<div class="right">
		{#if chrome.right}
			{@render chrome.right()}
		{:else}
			<a class="nav" href="/pattern">Patterns</a><a class="nav" href="/chart">Charts</a><AccountLink />
		{/if}
	</div>
</header>

<style>
	/* One bar for the whole site. The designer's colours are set here so every page reads the same. */
	header {
		--ink: #26335f;
		--ink-hover: #36457a;
		--on-ink: #faf3dc;
		--muted: #5d6385;
		--line: #e6dcc0;
		--line-strong: #c9bb92;
		--surface: #fbf5e4;
		--wash: #f3e9c9;
		--good: #4f7a58;
		--link: #3d5aa8;
		--hairline: rgb(38 51 95 / 0.12);
		--accent: #c8543e;
		--accent-deep: #8f3a2a;
		display: grid;
		grid-template-columns: auto 1fr;
		align-items: center;
		gap: 16px;
		position: relative;
		z-index: 2;
		width: 100%;
		max-width: 912px;
		height: var(--bar);
		margin: 0 auto;
		padding: 0 16px;
		color: var(--ink);
		font-size: 14px;
	}
	header.has-center {
		grid-template-columns: 1fr auto 1fr;
	}
	/* The catalogue pages are wider than a reading page, so the bar opens up to match their edges. */
	header.wide {
		max-width: 1180px;
	}
	/* The designers run edge to edge, on a frosted strip above their panels. */
	header.app {
		max-width: none;
		padding: 0 14px;
		border-bottom: 1px solid var(--hairline);
		background: color-mix(in srgb, var(--surface) 82%, transparent);
		backdrop-filter: saturate(180%) blur(20px);
		-webkit-backdrop-filter: saturate(180%) blur(20px);
	}
	.left {
		justify-self: start;
		display: flex;
		align-items: center;
		gap: 12px;
		min-width: 0;
	}
	.home {
		display: flex;
		align-items: center;
		height: 44px;
		color: var(--ink);
		text-decoration: none;
	}
	.center {
		justify-self: center;
		display: flex;
		align-items: center;
		min-width: 0;
		max-width: 100%;
	}
	.right {
		justify-self: end;
		display: flex;
		align-items: center;
		gap: 16px;
		min-width: 0;
	}
	.nav {
		display: flex;
		align-items: center;
		height: 44px;
		color: var(--ink);
		font-weight: 500;
		text-decoration: none;
	}
	a:focus-visible {
		outline: 2px solid var(--focus);
		outline-offset: 2px;
		border-radius: 4px;
	}
	/* On a phone the stepper takes the room and the links step aside. */
	@media (max-width: 760px) {
		header.has-center {
			grid-template-columns: auto 1fr;
		}
		header.has-center .right {
			display: none;
		}
		header.has-center .center {
			justify-self: end;
			width: 100%;
		}
	}
</style>
