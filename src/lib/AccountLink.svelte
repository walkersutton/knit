<script lang="ts">
	import { onMount } from 'svelte';
	import { openSignIn } from '$lib/signin.svelte';
	import mark from '$lib/ravelry-mark.svg?raw';
	let username = $state<string>();
	let photo = $state<string | null>(null);
	let broken = $state(false);
	onMount(async () => {
		try {
			const response = await fetch('/api/account');
			if (response.ok) {
				const account = (await response.json()).account;
				username = account?.username;
				photo = account?.photo ?? null;
			}
		} catch {
			// The designer remains usable if account services are offline.
		}
	});
</script>

{#snippet inner()}
	{#if username}
		<span class="tile avatar" aria-hidden="true">
			{#if photo && !broken}
				<img src={photo} alt="" width="28" height="28" referrerpolicy="no-referrer" onerror={() => (broken = true)} />
			{:else}{username[0].toUpperCase()}{/if}
		</span>
	{:else}
		<span class="tile ball" aria-hidden="true">{@html mark}</span>
	{/if}<span class="label">{username ?? 'Sign in'}</span>
{/snippet}

{#if username}
	<a class="account in" href="/people/{encodeURIComponent(username)}" aria-label="Your page: {username}">{@render inner()}</a>
{:else}
	<button class="account" type="button" onclick={openSignIn} aria-label="Sign in with Ravelry">{@render inner()}</button>
{/if}

<style>
	/* Coral is the invitation: it is only there while you are signed out, then the pill goes quiet. */
	.account { border: 0; font-family: inherit; cursor: pointer; --out: cubic-bezier(0.23, 1, 0.32, 1); display: inline-flex; align-items: center; gap: 8px; height: 36px; max-width: 20ch; padding: 0 14px 0 4px; border-radius: 999px; background: #fdf0e9; box-shadow: inset 0 0 0 1.5px #ee6e62; color: #26335f; font-size: 13px; font-weight: 650; text-decoration: none; transition: transform 160ms var(--out), box-shadow 150ms ease-out, background-color 150ms ease-out; }
	.account.in { background: #fffdf8; box-shadow: inset 0 0 0 1.5px #c9bb92; }
	.account:active { transform: scale(0.97); }
	.account:focus-visible { outline: 2px solid #2563eb; outline-offset: 2px; }
	.label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
	.tile { display: grid; place-items: center; flex: none; width: 28px; height: 28px; border-radius: 50%; transition: transform 200ms var(--out); }
	.ball { padding: 6px; background: #ee6e62; color: #fff8e6; }
	.ball :global(svg) { width: 100%; height: 100%; }
	.avatar img { width: 100%; height: 100%; border-radius: 50%; object-fit: cover; }
	.avatar { overflow: hidden; background: #465e9d; color: #faf3dc; font: 600 14px / 1 var(--display); }
	@media (hover: hover) and (pointer: fine) {
		.account:hover { background: #fbe3d8; }
		.account.in:hover { background: #fbf5e4; box-shadow: inset 0 0 0 1.5px #26335f; }
		.account:hover .ball { transform: rotate(40deg); }
	}
	@media (prefers-reduced-motion: reduce) { .tile { transition: none; } .account:hover .ball { transform: none; } }
</style>
