<script lang="ts">
	// Layout shell — data is consumed by child pages.
</script>

<svelte:head>
	<title>Admin — knit</title>
</svelte:head>

<div class="admin-shell">
	<nav class="topbar">
		<a href="/" class="logo">knit</a>
		<a href="/admin">Feedback</a>
	</nav>
	<main>
		<slot />
	</main>
</div>

<style>
	.admin-shell {
		min-height: 100dvh;
		display: flex;
		flex-direction: column;
		background: #f8f7f4;
	}
	.topbar {
		display: flex;
		align-items: center;
		gap: 24px;
		padding: 12px 24px;
		background: #fff;
		border-bottom: 1px solid var(--line);
		font-size: 14px;
	}
	.logo {
		font-family: var(--display);
		font-weight: 650;
		font-size: 18px;
		text-decoration: none;
		color: var(--ink);
	}
	.topbar a {
		color: var(--muted);
		text-decoration: none;
		padding: 4px 8px;
		border-radius: 6px;
	}
	.topbar a:hover {
		background: var(--wash);
		color: var(--ink);
	}
	main {
		flex: 1;
		padding: 24px;
	}
</style>
