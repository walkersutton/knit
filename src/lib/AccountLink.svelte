<script lang="ts">
	import { onMount } from 'svelte';
	import SignInPill from '$lib/SignInPill.svelte';
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

{#if username}
	<a class="account" href="/people/{encodeURIComponent(username)}" aria-label="Your page: {username}">
		<span class="tile avatar" aria-hidden="true">
			{#if photo && !broken}
				<img src={photo} alt="" width="28" height="28" referrerpolicy="no-referrer" onerror={() => (broken = true)} />
			{:else}{username[0].toUpperCase()}{/if}
		</span><span class="label">{username}</span>
	</a>
{:else}
	<SignInPill />
{/if}

<style>
	/* Signed out it is the coral SignInPill; once you are in, the pill goes quiet. */
	.account { --out: cubic-bezier(0.23, 1, 0.32, 1); display: inline-flex; align-items: center; gap: 8px; height: 36px; max-width: 20ch; padding: 0 14px 0 4px; border-radius: 999px; background: #fffdf8; box-shadow: inset 0 0 0 1.5px #c9bb92; color: #26335f; font-size: 13px; font-weight: 650; text-decoration: none; transition: transform 160ms var(--out), box-shadow 150ms ease-out, background-color 150ms ease-out; }
	.account:active { transform: scale(0.97); }
	.account:focus-visible { outline: 2px solid #2563eb; outline-offset: 2px; }
	.label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
	.tile { display: grid; place-items: center; flex: none; width: 28px; height: 28px; border-radius: 50%; }
	.avatar img { width: 100%; height: 100%; border-radius: 50%; object-fit: cover; }
	.avatar { overflow: hidden; background: #465e9d; color: #faf3dc; font: 600 14px / 1 var(--display); }
	@media (hover: hover) and (pointer: fine) {
		.account:hover { background: #fbf5e4; box-shadow: inset 0 0 0 1.5px #26335f; }
	}
</style>
