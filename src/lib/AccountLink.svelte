<script lang="ts">
	import { onMount } from 'svelte';
	import mark from '$lib/ravelry-mark.svg?raw';
	let username = $state<string>();
	onMount(async () => {
		try {
			const response = await fetch('/api/account');
			if (response.ok) username = (await response.json()).account?.username;
		} catch {
			// The designer remains usable if account services are offline.
		}
	});
</script>

<a class="account" class:in={username} href="/account" aria-label={username ? `Account: ${username}` : 'Sign in with Ravelry'}>
	{#if username}
		<span class="tile avatar" aria-hidden="true">{username[0].toUpperCase()}</span>
	{:else}
		<span class="tile ball" aria-hidden="true">{@html mark}</span>
	{/if}<span class="label">{username ?? 'Sign in'}</span>
</a>

<style>
	/* Coral is the invitation: it is only there while you are signed out, then the pill goes quiet. */
	.account { --out: cubic-bezier(0.23, 1, 0.32, 1); display: inline-flex; align-items: center; gap: 8px; height: 36px; max-width: 20ch; padding: 0 14px 0 4px; border-radius: 999px; background: #fdf0e9; box-shadow: inset 0 0 0 1.5px #ee6e62; color: #26335f; font-size: 13px; font-weight: 650; text-decoration: none; transition: transform 160ms var(--out), box-shadow 150ms ease-out, background-color 150ms ease-out; }
	.account.in { background: #fffdf8; box-shadow: inset 0 0 0 1.5px #c9bb92; }
	.account:active { transform: scale(0.97); }
	.account:focus-visible { outline: 2px solid #2563eb; outline-offset: 2px; }
	.label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
	.tile { display: grid; place-items: center; flex: none; width: 28px; height: 28px; border-radius: 50%; transition: transform 200ms var(--out); }
	.ball { padding: 6px; background: #ee6e62; color: #fff8e6; }
	.ball :global(svg) { width: 100%; height: 100%; }
	.avatar { background: #465e9d; color: #faf3dc; font: 600 14px / 1 var(--display); }
	@media (hover: hover) and (pointer: fine) {
		.account:hover { background: #fbe3d8; }
		.account.in:hover { background: #fbf5e4; box-shadow: inset 0 0 0 1.5px #26335f; }
		.account:hover .ball { transform: rotate(40deg); }
	}
	@media (prefers-reduced-motion: reduce) { .tile { transition: none; } .account:hover .ball { transform: none; } }
</style>
