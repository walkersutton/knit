<script lang="ts">
	import { onMount } from 'svelte';

	const DESIGN_KEY = 'knit-it:v1';
	const LIBRARY_KEY = 'knit-it:patterns:v1';
	const DESIGNS_KEY = 'knit-it:designs:v1';
	const DELETED_KEY = 'knit-it:deleted:v1';
	let syncing = false;
	let failed = $state(false);
	let lastPull = 0;
	let retry: () => void = () => {};
	let pending = false;
	let revision = 0;
	let timer: ReturnType<typeof setTimeout>;

	function localData() {
		try {
			return {
				design: JSON.parse(localStorage.getItem(DESIGN_KEY) ?? 'null'),
				library: JSON.parse(localStorage.getItem(LIBRARY_KEY) ?? 'null'),
				designs: JSON.parse(localStorage.getItem(DESIGNS_KEY) ?? '[]'),
				deleted: JSON.parse(localStorage.getItem(DELETED_KEY) ?? '[]')
			};
		} catch {
			return { design: null, library: null, designs: [], deleted: [] };
		}
	}

	function mergeData(local: any, remote: any) {
		const a = local?.design && typeof local.design === 'object' ? local.design : {};
		const b = remote?.design && typeof remote.design === 'object' ? remote.design : {};
		const progress: Record<string, Record<string, number>> = {};
		for (const source of [b.progress, a.progress]) {
			if (!source || typeof source !== 'object') continue;
			for (const [signature, steps] of Object.entries(source)) {
				const current = (progress[signature] ??= {});
				if (!steps || typeof steps !== 'object') continue;
				for (const [step, count] of Object.entries(steps)) {
					if (typeof count === 'number' && count > (current[step] ?? 0)) current[step] = count;
				}
			}
		}
		const design = {
			...b,
			...a,
			needles: a.needles?.length ? a.needles : b.needles ?? [],
			mode: a.mode ?? b.mode,
			progress
		};
		const localLibrary = local?.library && typeof local.library === 'object' ? local.library : {};
		const remoteLibrary = remote?.library && typeof remote.library === 'object' ? remote.library : {};
		const deleted = new Set<string>([
			...(Array.isArray(remote?.deleted) ? remote.deleted : []),
			...(Array.isArray(local?.deleted) ? local.deleted : [])
		].filter((value) => typeof value === 'string'));
		const patterns = new Map<string, unknown>();
		for (const pattern of [
			...(Array.isArray(remoteLibrary.patterns) ? remoteLibrary.patterns : []),
			...(Array.isArray(localLibrary.patterns) ? localLibrary.patterns : [])
		]) {
			if (pattern && typeof pattern.id === 'string' && !deleted.has(`chart:${pattern.id}`)) patterns.set(pattern.id, pattern);
		}
		const centerpieces = new Map<string, unknown>();
		for (const item of [
			...(Array.isArray(remoteLibrary.centerpieces) ? remoteLibrary.centerpieces : []),
			...(Array.isArray(localLibrary.centerpieces) ? localLibrary.centerpieces : [])
		]) {
			if (item && typeof item.id === 'string' && !deleted.has(`centerpiece:${item.id}`)) centerpieces.set(item.id, item);
		}
		const library = { ...remoteLibrary, ...localLibrary, patterns: [...patterns.values()], centerpieces: [...centerpieces.values()] };
		const designs = new Map<string, unknown>();
		for (const item of [
			...(Array.isArray(remote?.designs) ? remote.designs : []),
			...(Array.isArray(local?.designs) ? local.designs : [])
		]) {
			if (item && typeof item.id === 'string' && !deleted.has(`design:${item.id}`)) designs.set(item.id, item);
		}
		return { design, library, designs: [...designs.values()], deleted: [...deleted] };
	}

	function install(merged: ReturnType<typeof mergeData>) {
		localStorage.setItem(DESIGN_KEY, JSON.stringify(merged.design));
		localStorage.setItem(LIBRARY_KEY, JSON.stringify(merged.library));
		localStorage.setItem(DESIGNS_KEY, JSON.stringify(merged.designs));
		localStorage.setItem(DELETED_KEY, JSON.stringify(merged.deleted));
		window.dispatchEvent(new Event('knit:account-merged'));
	}

	async function push() {
		if (syncing) {
			pending = true;
			return;
		}
		syncing = true;
		try {
			for (let attempt = 0; attempt < 3; attempt++) {
				const response = await fetch('/api/account', {
					method: 'PUT',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({ revision, data: localData() })
				});
				if (response.status === 401) {
					failed = false;
					return;
				}
				if (response.status === 409) {
					const latest = await response.json();
					revision = latest.revision;
					install(mergeData(localData(), latest.data));
					continue;
				}
				if (response.ok) {
					revision = (await response.json()).revision;
					failed = false;
				} else failed = true;
				return;
			}
			failed = true;
		} catch {
			// Keep local work available when the network is down; the next change retries.
			failed = true;
		} finally {
			syncing = false;
			if (pending) {
				pending = false;
				schedulePush();
			}
		}
	}

	function schedulePush() {
		clearTimeout(timer);
		timer = setTimeout(push, 700);
	}

	onMount(() => {
		let active = true;
		const onSave = () => schedulePush();
		const onStorage = (event: StorageEvent) => {
			if (event.key === DESIGN_KEY || event.key === LIBRARY_KEY || event.key === DESIGNS_KEY || event.key === DELETED_KEY) schedulePush();
		};
		window.addEventListener('knit:local-save', onSave);
		window.addEventListener('storage', onStorage);
		async function pull(force: boolean) {
			if (syncing || Date.now() - lastPull < 5000 && !force) return;
			lastPull = Date.now();
			try {
				const response = await fetch('/api/account', { cache: 'no-store' });
				if (!response.ok) {
					failed = true;
					return;
				}
				const { account, data, revision: currentRevision } = await response.json();
				if (!active || !account) return;
				// Nothing new on the server: our own pushes already cover local edits.
				if (currentRevision === revision && revision !== 0) {
					failed = false;
					return;
				}
				revision = currentRevision;
				install(mergeData(localData(), data));
				await push();
			} catch {
				// Offline use continues with this device's saved data.
				failed = true;
			}
		}
		const onVisible = () => {
			if (document.visibilityState === 'visible') pull(false);
		};
		document.addEventListener('visibilitychange', onVisible);
		window.addEventListener('focus', onVisible);
		window.addEventListener('online', onVisible);
		retry = () => pull(true);
		pull(true);
		return () => {
			active = false;
			clearTimeout(timer);
			window.removeEventListener('knit:local-save', onSave);
			window.removeEventListener('storage', onStorage);
			document.removeEventListener('visibilitychange', onVisible);
			window.removeEventListener('focus', onVisible);
			window.removeEventListener('online', onVisible);
		};
	});
</script>

{#if failed}
	<div class="sync-note" role="status">
		<span>Couldn't sync your patterns.</span>
		<button type="button" class="stitch quiet sm" onclick={() => {
			failed = false;
			retry();
		}}>Try again</button>
	</div>
{/if}

<style>
	.sync-note {
		position: fixed;
		inset: auto 16px 16px auto;
		z-index: 50;
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 8px 12px;
		border-radius: 12px;
		background: var(--cream, #fff8ec);
		color: var(--navy, #1f2a44);
		box-shadow: 0 2px 10px rgb(0 0 0 / 0.15);
		font-size: 0.9rem;
	}
</style>
