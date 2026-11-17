<script lang="ts">
	import { onMount } from 'svelte';

	const DESIGN_KEY = 'knit-it:v1';
	const LIBRARY_KEY = 'knit-it:patterns:v1';
	const DESIGNS_KEY = 'knit-it:designs:v1';
	const DELETED_KEY = 'knit-it:deleted:v1';
	let syncing = false;
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
		const library = { ...remoteLibrary, ...localLibrary, patterns: [...patterns.values()] };
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
				if (response.status === 401) return;
				if (response.status === 409) {
					const latest = await response.json();
					revision = latest.revision;
					install(mergeData(localData(), latest.data));
					continue;
				}
				if (response.ok) revision = (await response.json()).revision;
				return;
			}
		} catch {
			// Keep local work available when the network is down; the next change retries.
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
		(async () => {
			try {
				const response = await fetch('/api/account');
				if (!response.ok) return;
				const { account, data, revision: currentRevision } = await response.json();
				if (!active || !account) return;
				revision = currentRevision;
				const merged = mergeData(localData(), data);
				install(merged);
				await push();
			} catch {
				// Offline use continues with this device's saved data.
			}
		})();
		return () => {
			active = false;
			clearTimeout(timer);
			window.removeEventListener('knit:local-save', onSave);
			window.removeEventListener('storage', onStorage);
		};
	});
</script>
