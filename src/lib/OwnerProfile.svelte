<script lang="ts">
	import { onMount } from 'svelte';
	import type { Profile } from '$lib/server/profile';
	import ChartCard from '$lib/sweater/ChartCard.svelte';
	import PatternCard from '$lib/sweater/PatternCard.svelte';
	import { deleteDesign, loadDesigns, saveDesign, type SavedDesign } from '$lib/sweater/designs';
	import { DEFAULT_DESIGN } from '$lib/sweater/defaults';
	import { call, runBulk, sameValue, summarize } from '$lib/sweater/bulk';
	import { loadLibrary, newId, saveLibrary } from '$lib/sweater/library';
	import { encodeDesign } from '$lib/sweater/progress';
	import { designDetail } from '$lib/sweater/random';

	/** Your own profile page: your saved designs first (they are private), then what you have shared and liked. */
	let { p, joined }: { p: Profile; joined: string } = $props();

	type Tab = 'designs' | 'patterns' | 'charts' | 'likes';
	let designs = $state<SavedDesign[]>([]);
	let tab = $state<Tab>('designs');
	let confirming = $state<string | null>(null);
	let signingOut = $state(false);
	let broken = $state(false);
	let latest = $derived(designs[0]);
	let rest = $derived(designs.slice(1));
	let liked = $derived(p.likedCharts.length + p.likedPatterns.length);

	// What you have shared, as it changes here: the page data is cached for a minute, so edits are applied on top of it.
	let unshared = $state<string[]>([]);
	let unsharedCharts = $state<string[]>([]);
	let published = $state<Profile['patterns']>([]);
	let patterns = $derived([...p.patterns, ...published.filter((x) => !p.patterns.some((y) => y.id === x.id))].filter((x) => !unshared.includes(x.id)));
	let charts = $derived(p.charts.filter((c) => !unsharedCharts.includes(c.id)));

	// Select mode: pick several items on the current tab, then act on them together.
	type Action = 'delete' | 'share' | 'private';
	let selecting = $state(false);
	let picked = $state<string[]>([]);
	let pending = $state<Action | null>(null);
	let busy = $state(false);
	let status = $state('');
	let ids = $derived(tab === 'designs' ? designs.map((d) => d.id) : tab === 'patterns' ? patterns.map((x) => x.id) : tab === 'charts' ? charts.map((c) => c.id) : []);
	let count = $derived(picked.length);
	let tabs = $derived<{ id: Tab; label: string; n: number; private?: boolean }[]>([
		{ id: 'designs', label: 'My designs', n: designs.length, private: true },
		{ id: 'patterns', label: 'Patterns', n: patterns.length },
		{ id: 'charts', label: 'Charts', n: charts.length },
		{ id: 'likes', label: 'Likes', n: liked }
	]);

	onMount(() => {
		designs = loadDesigns();
		const refresh = () => (designs = loadDesigns());
		window.addEventListener('knit:account-merged', refresh);
		return () => window.removeEventListener('knit:account-merged', refresh);
	});

	function go(id: Tab) {
		tab = id;
		stopSelecting();
	}
	function stopSelecting() {
		selecting = false;
		picked = [];
		pending = null;
		status = '';
	}
	const toggle = (id: string) => (picked = picked.includes(id) ? picked.filter((x) => x !== id) : [...picked, id]);
	const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;
	let question = $derived(
		pending === 'delete'
			? `Delete ${plural(count, 'saved design')}? This can’t be undone.`
			: pending === 'share'
				? `Publish ${plural(count, 'design')} as public patterns? Anyone with the link can read them, and they appear in the catalogue.`
				: pending === 'private'
					? `Make ${plural(count, tab === 'charts' ? 'chart' : 'pattern')} private? Their public pages and likes are removed, and a copy stays in ${tab === 'charts' ? 'your chart library' : 'My designs'}.`
					: ''
	);

	/** Does the batch for the chosen action, then reports what happened. */
	async function confirmAction() {
		const action = pending;
		if (!action || busy) return;
		busy = true;
		pending = null;
		const chosen = [...picked];
		const json = { 'content-type': 'application/json' };
		if (action === 'delete') {
			const r = await runBulk(chosen, (id) => deleteDesign(id));
			designs = loadDesigns();
			status = summarize(r, 'Deleted', 'design', chosen.length);
			picked = picked.filter((id) => !r.done.includes(id));
		} else if (action === 'share') {
			const r = await runBulk(chosen, async (id) => {
				const d = designs.find((x) => x.id === id);
				if (!d) throw new Error('Design not found.');
				const response = await call('/api/patterns', { method: 'POST', headers: json, body: JSON.stringify({ name: d.name, design: d.design, notes: d.notes }) }, 'Could not share it.');
				const shared: { id: string; slug: string } = await response.json();
				unshared = unshared.filter((x) => x !== shared.id);
				if (!published.some((x) => x.id === shared.id)) published = [...published, { id: shared.id, slug: shared.slug, name: d.name, design: { ...DEFAULT_DESIGN, ...d.design }, author: p.username, authorPhoto: p.photo, createdAt: new Date().toISOString() }];
			});
			status = summarize(r, 'Shared', 'design', chosen.length);
			picked = picked.filter((id) => !r.done.includes(id));
		} else if (tab === 'patterns') {
			const r = await runBulk(chosen, async (id) => {
				const x = patterns.find((y) => y.id === id);
				if (!x) throw new Error('Pattern not found.');
				// Unsharing deletes the only copy of a design that was never saved, so keep one in My designs first.
				if (!loadDesigns().some((d) => sameValue({ ...DEFAULT_DESIGN, ...d.design }, { ...DEFAULT_DESIGN, ...x.design }))) saveDesign(x.design, x.name, undefined, x.notes);
				await call(`/api/patterns/${id}`, { method: 'DELETE' }, 'Could not make it private.');
				unshared = [...unshared, id];
			});
			designs = loadDesigns();
			status = summarize(r, 'Made private', 'pattern', chosen.length);
			picked = picked.filter((id) => !r.done.includes(id));
		} else {
			const r = await runBulk(chosen, async (id) => {
				const c = charts.find((y) => y.id === id);
				if (!c) throw new Error('Chart not found.');
				const library = loadLibrary();
				if (!library.patterns.some((q) => q.motif === c.motif)) saveLibrary({ ...library, patterns: [...library.patterns, { id: newId(), name: c.name, motif: c.motif }] });
				await call(`/api/charts/${id}`, { method: 'DELETE' }, 'Could not make it private.');
				unsharedCharts = [...unsharedCharts, id];
			});
			status = summarize(r, 'Made private', 'chart', chosen.length);
			picked = picked.filter((id) => !r.done.includes(id));
		}
		busy = false;
	}
	function tabKeys(e: KeyboardEvent) {
		const order = tabs.map((t) => t.id);
		const i = order.indexOf(tab);
		const n = e.key === 'ArrowRight' ? (i + 1) % order.length : e.key === 'ArrowLeft' ? (i - 1 + order.length) % order.length : e.key === 'Home' ? 0 : e.key === 'End' ? order.length - 1 : -1;
		if (n < 0) return;
		e.preventDefault();
		go(order[n]);
		requestAnimationFrame(() => document.getElementById(`t-${order[n]}`)?.focus());
	}
	const open = (d: SavedDesign) => `/design#d=${encodeDesign(d.design)}`;
	function ago(iso: string) {
		const days = Math.floor((Date.now() - Date.parse(iso)) / 864e5);
		return !iso || Number.isNaN(days) ? '' : days < 1 ? 'today' : days === 1 ? 'yesterday' : days < 30 ? `${days} days ago` : new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
	}
	function remove(id: string) {
		deleteDesign(id);
		designs = loadDesigns();
		confirming = null;
	}
	async function signOut() {
		signingOut = true;
		await fetch('/auth/logout', { method: 'POST' }).catch(() => undefined);
		location.reload();
	}
</script>

{#snippet pick(id: string, name: string)}
	<button type="button" class="cover" role="checkbox" aria-checked={picked.includes(id)} aria-label="Select {name}" onclick={() => toggle(id)}>
		<span class="tick" aria-hidden="true"><svg viewBox="0 0 12 12" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 6.2 5 8.5l4.5-5" /></svg></span>
	</button>
{/snippet}
{#snippet swatch(d: SavedDesign)}<i style:background={d.design.color}></i><i style:background={d.design.contrast}></i>{/snippet}

<header class="who">
	<span class="avatar" aria-hidden="true">
		{#if p.photo && !broken}
			<img src={p.photo} alt="" width="72" height="72" referrerpolicy="no-referrer" onerror={() => (broken = true)} />
		{:else}{(p.username.match(/[\p{L}\p{N}]/u)?.[0] ?? '?').toUpperCase()}{/if}
	</span>
	<div class="id">
		<p class="eyebrow">You · joined {joined}</p>
		<h1>{p.username}</h1>
		<p class="loc">{#if p.bio?.location}{p.bio.location} · {/if}<a href="https://www.ravelry.com/people/{encodeURIComponent(p.username)}" target="_blank" rel="noopener">Ravelry</a></p>
	</div>
	<div class="acts">
		<a class="chunk sm" href="/design">New sweater</a>
		<button class="stitch quiet sm" type="button" onclick={signOut} disabled={signingOut}>{signingOut ? 'Signing out…' : 'Sign out'}</button>
	</div>
</header>

<div class="card">
	<!-- svelte-ignore a11y_interactive_supports_focus -->
	<div class="bar" role="tablist" aria-label="Your page" onkeydown={tabKeys}>
		{#each tabs as t (t.id)}
			<button role="tab" id="t-{t.id}" aria-selected={tab === t.id} aria-controls="panel" tabindex={tab === t.id ? 0 : -1} onclick={() => go(t.id)}>
				{t.label}{#if t.private}<svg class="lock" viewBox="0 0 16 16" width="12" height="12" role="img" aria-label="Only you can see this" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="7" width="10" height="7" rx="2" /><path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" /></svg>{/if}<span class="n">{t.n}</span>
			</button>
		{/each}
		{#if ids.length}
			<button type="button" class="pickmode" aria-pressed={selecting} onclick={() => (selecting ? stopSelecting() : (selecting = true))}>{selecting ? 'Done' : 'Select'}</button>
		{/if}
	</div>

	<div id="panel" role="tabpanel" aria-labelledby="t-{tab}" class="panel">
		{#if tab === 'designs'}
			{#if selecting}
				<ul class="tiles">
					{#each designs as item (item.id)}
						<li class="cell" class:on={picked.includes(item.id)}>
							<div class="tile">
								<span class="sw" aria-hidden="true">{@render swatch(item)}</span>
								<strong>{item.name}</strong>
								<span class="meta">{ago(item.updatedAt)}</span>
							</div>
							{@render pick(item.id, item.name)}
						</li>
					{/each}
				</ul>
			{:else if latest}
				<section class="resume" aria-label="Continue designing">
					<span class="big" aria-hidden="true">{@render swatch(latest)}</span>
					<div class="rt">
						<p class="k">Pick up where you left off</p>
						<h2>{latest.name}</h2>
						<p class="d">{designDetail(latest.design)}{#if latest.updatedAt} · edited {ago(latest.updatedAt)}{/if}</p>
						<div class="row">
							<a class="chunk sm" href={open(latest)}>Continue designing</a>
							<a class="chunk quiet sm" href="/design">New design</a>
							{#if confirming === latest.id}
								<button class="stitch danger sm" onclick={() => remove(latest.id)}>Delete “{latest.name}”</button>
								<button class="stitch quiet sm" onclick={() => (confirming = null)}>Keep</button>
							{:else}
								<button class="stitch quiet sm" onclick={() => (confirming = latest.id)}>Delete</button>
							{/if}
						</div>
					</div>
				</section>
				{#if rest.length}
					<h3>Other saved designs</h3>
					<ul class="tiles">
						{#each rest as item (item.id)}
							<li>
								<a class="tile" href={open(item)}>
									<span class="sw" aria-hidden="true">{@render swatch(item)}</span>
									<strong>{item.name}</strong>
									<span class="meta">{ago(item.updatedAt)}</span>
								</a>
								{#if confirming === item.id}
									<span class="sure"><button class="stitch danger sm" onclick={() => remove(item.id)}>Delete</button><button class="stitch quiet sm" onclick={() => (confirming = null)}>Keep</button></span>
								{:else}
									<button class="x" aria-label="Delete {item.name}" onclick={() => (confirming = item.id)}>×</button>
								{/if}
							</li>
						{/each}
					</ul>
				{/if}
				<p class="note">Saved designs, charts and progress sync across your devices. Only you can see them.</p>
			{:else}
				<p class="empty">Nothing saved yet. <a href="/design">Start a sweater</a> and save it to see it here, on every device.</p>
			{/if}
		{:else if tab === 'patterns'}
			{#if patterns.length}
				<ul class="grid" class:picking={selecting}>
					{#each patterns as x (x.id)}
						{#if selecting}<li class="cell" class:on={picked.includes(x.id)}><ul class="one"><PatternCard pattern={x} /></ul>{@render pick(x.id, x.name)}</li>{:else}<PatternCard pattern={x} />{/if}
					{/each}
				</ul>
			{:else}<p class="empty">No patterns shared yet. Finish a design and use Get my pattern to share one.</p>{/if}
		{:else if tab === 'charts'}
			{#if charts.length}
				<ul class="grid" class:picking={selecting}>
					{#each charts as c (c.id)}
						{#if selecting}<li class="cell" class:on={picked.includes(c.id)}><ul class="one"><ChartCard chart={c} /></ul>{@render pick(c.id, c.name)}</li>{:else}<ChartCard chart={c} />{/if}
					{/each}
				</ul>
			{:else}<p class="empty">No charts shared yet. <a href="/chart">Make a chart</a>.</p>{/if}
		{:else if liked}
			{#if p.likedPatterns.length}<h3>Patterns</h3><ul class="grid">{#each p.likedPatterns as x (x.id)}<PatternCard pattern={x} />{/each}</ul>{/if}
			{#if p.likedCharts.length}<h3>Charts</h3><ul class="grid">{#each p.likedCharts as c (c.id)}<ChartCard chart={c} />{/each}</ul>{/if}
		{:else}
			<p class="empty">Nothing liked yet.</p>
		{/if}
	</div>
	{#if selecting}
		<div class="actions" role="region" aria-label="Actions for selected items">
			{#if pending}
				<p class="ask">{question}</p>
				<div class="row">
					<button class="stitch sm {pending === 'delete' ? 'danger' : ''}" type="button" onclick={confirmAction}>{pending === 'delete' ? 'Delete' : pending === 'share' ? 'Publish' : 'Make private'}</button>
					<button class="stitch quiet sm" type="button" onclick={() => (pending = null)}>Cancel</button>
				</div>
			{:else}
				<p class="count" role="status" aria-live="polite">{busy ? 'Working…' : status || (count ? `${count} selected` : 'Choose what to change')}</p>
				<div class="row">
					<button class="linkish" type="button" onclick={() => (picked = count === ids.length ? [] : [...ids])}>{count === ids.length ? 'Select none' : 'Select all'}</button>
					{#if tab === 'designs'}
						<button class="stitch sm" type="button" disabled={!count || busy} onclick={() => (pending = 'share')}>Share…</button>
						<button class="stitch danger sm" type="button" disabled={!count || busy} onclick={() => (pending = 'delete')}>Delete…</button>
					{:else}
						<button class="stitch quiet sm" type="button" disabled={!count || busy} onclick={() => (pending = 'private')}>Make private…</button>
					{/if}
				</div>
			{/if}
		</div>
	{/if}
</div>

<svelte:window onkeydown={(e) => { if (e.key === 'Escape' && selecting && !busy) { if (pending) pending = null; else stopSelecting(); } }} />

<style>
	.who { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; margin-bottom: 20px; }
	.avatar { display: grid; place-items: center; flex: none; width: 72px; height: 72px; overflow: hidden; border-radius: 50%; background: #465e9d; color: #faf3dc; font: 600 30px / 1 var(--display); box-shadow: 0 0 0 3px #faf3dc, 0 3px 0 3px #465e9d; }
	.avatar img { width: 100%; height: 100%; object-fit: cover; }
	.id { flex: 1; min-width: 180px; }
	.eyebrow { margin: 0 0 4px; color: var(--accent-deep); font-size: 12px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; }
	h1 { margin: 0; font-family: var(--display); font-size: 36px; font-weight: 600; line-height: 1.1; overflow-wrap: anywhere; }
	.loc { margin: 4px 0 0; color: var(--muted); font-size: 13px; }
	.loc a, .empty a { color: #3d5aa8; }
	.acts { display: flex; gap: 8px; align-items: center; }
	@media (max-width: 560px) { .acts { width: 100%; } }
	.card { overflow: clip; border: 1px solid var(--line-strong); border-radius: 16px; background: #fffdf8; }
	.bar { display: flex; gap: 4px; padding: 8px; overflow-x: auto; border-bottom: 1px solid var(--line-strong); background: #f3e9c966; scrollbar-width: none; }
	.bar button { display: flex; align-items: center; gap: 6px; height: 34px; padding: 0 12px; border: 0; border-radius: 9px; background: none; color: var(--muted); font: 500 14px var(--display); white-space: nowrap; cursor: pointer; transition: color 150ms ease-out, background-color 150ms ease-out, box-shadow 150ms ease-out, transform 160ms cubic-bezier(0.23, 1, 0.32, 1); }
	@media (hover: hover) and (pointer: fine) { .bar button[aria-selected='false']:hover { background: #26335f0f; color: var(--ink); } }
	.bar button:active { transform: scale(0.97); }
	.bar button[aria-selected='true'] { background: #fffdf8; color: var(--ink); box-shadow: 0 0 0 1px #c9bb9299, 0 1px 2px #1a234426; }
	.bar button:focus-visible { outline: 2px solid var(--focus); outline-offset: 1px; }
	.pickmode { margin-left: auto; flex: none; height: 34px; padding: 0 12px; border: 0; border-radius: 9px; background: none; color: var(--muted); font: 500 14px var(--display); cursor: pointer; transition: color 150ms ease-out, background-color 150ms ease-out; }
	.pickmode[aria-pressed='true'] { background: #465e9d; color: #faf3dc; }
	@media (hover: hover) and (pointer: fine) { .pickmode:not([aria-pressed='true']):hover { background: #26335f0f; color: var(--ink); } }
	.pickmode:focus-visible { outline: 2px solid var(--focus); outline-offset: 1px; }
	.cell { position: relative; list-style: none; border-radius: 14px; transition: box-shadow 120ms ease-out; }
	.cell.on { box-shadow: 0 0 0 2px #465e9d; }
	.cell > .tile { height: 100%; }
	.one { height: 100%; }
	.cover { position: absolute; inset: 0; z-index: 3; border: 0; border-radius: 14px; background: none; cursor: pointer; }
	.cover:focus-visible { outline: 2px solid var(--focus); outline-offset: 2px; }
	.tick { position: absolute; top: 8px; left: 8px; display: grid; place-items: center; width: 22px; height: 22px; border-radius: 50%; border: 1.5px solid #c9bb92; background: #fffdf8; color: transparent; transition: background-color 120ms ease-out, color 120ms ease-out, border-color 120ms ease-out, transform 160ms cubic-bezier(0.23, 1, 0.32, 1); }
	.cover[aria-checked='true'] .tick { border-color: #465e9d; background: #465e9d; color: #faf3dc; }
	.cover:active .tick { transform: scale(0.92); }
	.actions { position: sticky; bottom: 0; z-index: 4; display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; padding: 10px 16px; border-top: 1px solid var(--line-strong); background: #f3e9c9f2; backdrop-filter: blur(6px); }
	.count, .ask { margin: 0; font-size: 14px; }
	.count { color: var(--muted); }
	.ask { flex: 1; min-width: 220px; line-height: 1.4; }
	.linkish { padding: 0 4px; border: 0; background: none; color: #3d5aa8; font: inherit; font-size: 13px; text-decoration: underline; cursor: pointer; }
	.actions .row { align-items: center; }
	@media (prefers-reduced-motion: reduce) { .cell, .tick, .pickmode { transition: none; } }
	.n { color: var(--muted); font: 400 12px system-ui, sans-serif; font-variant-numeric: tabular-nums; opacity: 0.8; }
	.lock { flex: none; }
	@media (prefers-reduced-motion: reduce) { .bar button { transition: none; } }
	.panel { padding: 20px; animation: in 200ms cubic-bezier(0.23, 1, 0.32, 1); }
	@keyframes in { from { opacity: 0; transform: translateY(4px); } }
	@media (prefers-reduced-motion: reduce) { .panel { animation: none; } }
	.resume { display: flex; gap: 20px; align-items: center; flex-wrap: wrap; margin-bottom: 28px; padding: 20px; border: 1px solid var(--line-strong); border-radius: 16px; background: var(--wash); }
	.big { display: flex; flex: none; width: 128px; height: 128px; overflow: hidden; border-radius: 20px; box-shadow: 0 0 0 1px rgb(38 51 95 / 0.15), 0 4px 0 rgb(38 51 95 / 0.12); }
	i { flex: 1; }
	.rt { flex: 1; min-width: 220px; }
	.k { margin: 0 0 4px; color: var(--accent-deep); font-size: 12px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; }
	h2 { margin: 0; font-family: var(--display); font-size: 28px; font-weight: 600; overflow-wrap: anywhere; }
	.d { margin: 4px 0 16px; color: var(--muted); font-size: 14px; }
	.row { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
	h3 { margin: 0 0 8px; color: var(--muted); font-size: 12px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; }
	.grid + h3 { margin-top: 20px; }
	ul { margin: 0; padding: 0; list-style: none; }
	.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 12px; }
	.tiles { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 12px; }
	.tiles li { position: relative; }
	.tile { display: grid; gap: 6px; padding: 10px; border: 1px solid var(--line-strong); border-radius: 14px; background: var(--surface); color: var(--ink); text-decoration: none; transition: transform 160ms cubic-bezier(0.23, 1, 0.32, 1); }
	.tile:active { transform: scale(0.98); }
	.tile:focus-visible { outline: 2px solid var(--focus); outline-offset: 2px; }
	.sw { display: flex; height: 72px; overflow: hidden; border-radius: 8px; }
	.tile strong { overflow: hidden; font-size: 14px; text-overflow: ellipsis; white-space: nowrap; }
	.meta { color: var(--muted); font-size: 12px; }
	.x { position: absolute; top: 14px; right: 14px; display: grid; place-items: center; width: 28px; height: 28px; border: 0; border-radius: 50%; background: #fffdf8cc; color: var(--muted); font-size: 18px; cursor: pointer; opacity: 0; transition: opacity 120ms ease-out; }
	li:hover .x, .x:focus-visible { opacity: 1; }
	@media (hover: none) { .x { opacity: 1; } }
	.sure { position: absolute; inset: auto 8px 8px; display: flex; gap: 6px; justify-content: center; }
	.note { margin: 16px 0 0; color: var(--muted); font-size: 13px; line-height: 1.5; }
	.empty { margin: 0; padding: 32px 0; color: var(--muted); text-align: center; }
</style>
