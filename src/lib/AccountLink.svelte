<script lang="ts">
	import { onMount } from 'svelte';
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

<a class="account" href="/account" aria-label={username ? `Account: ${username}` : 'Sign in or create an account'}>
	<span aria-hidden="true">{username ? '●' : '♙'}</span>{username ?? 'Sign in'}
</a>

<style>
	.account {
		display: inline-flex;
		align-items: center;
		gap: 7px;
		padding: 6px 9px;
		border: 1px solid #dcdce0;
		border-radius: 999px;
		background: #fff;
		color: #18181b;
		font-size: 12px;
		font-weight: 650;
		text-decoration: none;
	}
	.account:hover { background: #f4f4f5; }
	.account:focus-visible { outline: 2px solid #2563eb; outline-offset: 2px; }
	.account span { color: #2563eb; }
</style>
