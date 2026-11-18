<script lang="ts">
	import { onMount } from 'svelte';
	import { deleteDesign, loadDesigns, type SavedDesign } from '$lib/sweater/designs';
	import { encodeDesign } from '$lib/sweater/progress';

	// Owner-only controls shown on your own profile page.
	let designs = $state<SavedDesign[]>([]);
	let signingOut = $state(false);

	onMount(() => {
		designs = loadDesigns();
		const refresh = () => (designs = loadDesigns());
		window.addEventListener('knit:account-merged', refresh);
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

<section class="mine" aria-labelledby="mine-h">
	<h2 id="mine-h">Your account</h2>
	<p class="note">Only you can see this. Saved designs, charts, and progress sync across your devices.</p>
	<div class="head"><h3>Saved sweater designs</h3><a href="/design">Make a sweater</a></div>
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
		<p class="note">Save a design from the sweater designer and it will show up here.</p>
	{/if}
	<button class="signout" onclick={signOut} disabled={signingOut}>{signingOut ? 'Signing out…' : 'Sign out'}</button>
</section>

<style>
	.mine { margin-bottom: 32px; padding: 16px; border: 1px dashed var(--line-strong, #c9bb92); border-radius: 12px; background: #fffdf8; }
	h2 { margin: 0 0 4px; font-family: var(--display); font-size: 22px; font-weight: 600; }
	.note { margin: 0 0 12px; color: var(--muted, #5d6385); font-size: 13px; line-height: 1.5; }
	.head { display: flex; justify-content: space-between; align-items: baseline; gap: 10px; }
	h3 { margin: 0; color: var(--muted, #5d6385); font-size: 12px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; }
	.head a { color: #3d5aa8; font-size: 12px; }
	ul { display: block; margin: 8px 0 0; padding: 0; list-style: none; }
	li { display: flex; align-items: center; gap: 8px; border-bottom: 1px solid #eee9de; }
	li > a { flex: 1; min-width: 0; display: flex; justify-content: space-between; gap: 12px; padding: 10px 0; color: #18181b; text-decoration: none; }
	li strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
	li span { flex: none; color: #76747b; font-size: 11px; }
	li button { border: 0; background: transparent; color: #76747b; font-size: 20px; cursor: pointer; }
	.signout { margin-top: 16px; padding: 10px 16px; border: 1px solid #dcdce0; border-radius: 10px; background: white; color: #18181b; font: inherit; font-weight: 650; cursor: pointer; }
	.signout:disabled { opacity: 0.6; }
</style>
