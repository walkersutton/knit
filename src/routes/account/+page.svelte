<script lang="ts">
	import { onMount } from 'svelte';
	import Logo from '$lib/Logo.svelte';
	import Seo from '$lib/Seo.svelte';
	import { deleteDesign, loadDesigns, type SavedDesign } from '$lib/sweater/designs';
	import { encodeDesign } from '$lib/sweater/progress';

	let account = $state<{ username: string } | null>(null);
	let configured = $state(false);
	let loading = $state(true);
	let errorMessage = $state('');
	let signingOut = $state(false);
	let designs = $state<SavedDesign[]>([]);
	onMount(() => {
		designs = loadDesigns();
		const refresh = () => (designs = loadDesigns());
		window.addEventListener('knit:account-merged', refresh);
		void (async () => {
			try {
				const response = await fetch('/api/account');
				if (!response.ok) throw new Error('Account services are not configured yet.');
				const data = await response.json();
				account = data.account;
				configured = data.configured;
			} catch (error) {
				errorMessage = error instanceof Error ? error.message : 'Could not load your account.';
			} finally {
				loading = false;
			}
		})();
		return () => window.removeEventListener('knit:account-merged', refresh);
	});
	function removeDesign(id: string, name: string) {
		if (!confirm(`Delete “${name}”?`)) return;
		deleteDesign(id);
		designs = loadDesigns();
	}
	async function signOut() {
		signingOut = true;
		await fetch('/auth/logout', { method: 'POST' }).catch(() => undefined);
		location.reload();
	}
</script>

<Seo title="Your account — knit" description="Sign in to sync your knitting patterns and progress across devices." path="/account" />

<main>
	<a class="brand" href="/"><Logo /></a>
	<div class="card">
		<p class="eyebrow">Your knitting, with you</p>
		<h1>{account ? `Hello, ${account.username}` : 'Keep your patterns close'}</h1>
		{#if loading}
			<p>Checking your account…</p>
		{:else if errorMessage}
			<p class="error">{errorMessage}</p>
			<p class="fine">Sign-in is being set up. Your patterns and progress still work on this device.</p>
		{:else if account}
			<p>You’re signed in with Ravelry. Saved sweater designs, charts, and knitting progress can sync across your devices.</p>
			<section class="saved">
				<div class="section-head"><h2>Saved sweater designs</h2><a href="/design">Make a sweater</a></div>
				{#if designs.length}
					<ul>
						{#each designs as item (item.id)}
							<li>
								<a href="/design#d={encodeDesign(item.design)}"><strong>{item.name}</strong><span>{item.updatedAt ? new Date(item.updatedAt).toLocaleDateString() : ''}</span></a>
								<button type="button" aria-label={`Delete ${item.name}`} onclick={() => removeDesign(item.id, item.name)}>×</button>
							</li>
						{/each}
					</ul>
				{:else}
					<p class="fine">Save a design from the sweater designer and it will show up here.</p>
				{/if}
			</section>
			<button class="secondary" onclick={signOut} disabled={signingOut}>{signingOut ? 'Signing out…' : 'Sign out'}</button>
		{:else if configured}
			<p>Sign in with Ravelry to keep your saved sweater designs, charts, and knitting progress in sync across devices.</p>
			<a class="primary" href="/auth/ravelry">Continue with Ravelry</a>
			<p class="fine">knit uses your Ravelry account to identify you. Your knitting data is stored by knit and is not posted to Ravelry.</p>
		{:else}
			<p>Account sync is being set up. Your designs, charts, and knitting progress continue to save on this device.</p>
		{/if}
		{#if !account && designs.length}
			<section class="saved">
				<div class="section-head"><h2>Saved on this device</h2><a href="/design">Make a sweater</a></div>
				<ul>
					{#each designs as item (item.id)}
						<li>
							<a href="/design#d={encodeDesign(item.design)}"><strong>{item.name}</strong><span>{item.updatedAt ? new Date(item.updatedAt).toLocaleDateString() : ''}</span></a>
							<button type="button" aria-label={`Delete ${item.name}`} onclick={() => removeDesign(item.id, item.name)}>×</button>
						</li>
					{/each}
				</ul>
			</section>
		{/if}
		<a class="back" href="/">← Back to knit</a>
	</div>
</main>

<style>
	main { min-height: 100svh; display: grid; place-items: center; padding: 72px 20px 32px; }
	.brand { position: absolute; top: 18px; left: 20px; width: 112px; color: inherit; }
	.card { width: min(100%, 460px); padding: 32px; border: 1px solid #e2ddce; border-radius: 22px; background: #fffdf8; box-shadow: 0 16px 50px #433c2910; }
	.eyebrow { margin: 0 0 8px; color: #465e9d; font-size: 12px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; }
	h1 { margin: 0 0 12px; font: 600 clamp(26px, 7vw, 34px)/1.1 var(--display); }
	.card p { color: #55545b; font-size: 14px; line-height: 1.55; }
	.primary, .secondary { display: inline-flex; justify-content: center; align-items: center; margin-top: 12px; padding: 11px 16px; border: 0; border-radius: 10px; background: #465e9d; color: white; font: inherit; font-weight: 650; text-decoration: none; cursor: pointer; }
	.primary:hover { background: #354a80; }
	.secondary { border: 1px solid #dcdce0; background: white; color: #18181b; }
	.secondary:disabled { opacity: .6; }
	.card .fine { margin-top: 18px; color: #76747b; font-size: 12px; }
	.saved { margin: 24px 0 4px; padding-top: 18px; border-top: 1px solid #e5dfd0; }
	.section-head { display: flex; justify-content: space-between; align-items: baseline; gap: 10px; }
	.section-head h2 { margin: 0; font: 600 16px/1.2 var(--display); }
	.section-head a { color: #465e9d; font-size: 12px; }
	.saved ul { margin: 10px 0 0; padding: 0; list-style: none; }
	.saved li { display: flex; align-items: center; gap: 8px; border-bottom: 1px solid #eee9de; }
	.saved li > a { flex: 1; min-width: 0; display: flex; justify-content: space-between; gap: 12px; padding: 10px 0; color: #18181b; text-decoration: none; }
	.saved li strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
	.saved li span { flex: none; color: #76747b; font-size: 11px; }
	.saved li button { border: 0; background: transparent; color: #76747b; font-size: 20px; cursor: pointer; }
	.error { padding: 10px 12px; border-radius: 9px; background: #fff0eb; color: #8a351d !important; }
	.back { display: inline-block; margin-top: 24px; color: #465e9d; font-size: 13px; text-decoration: none; }
</style>
