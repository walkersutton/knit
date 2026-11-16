<script lang="ts">
	import Choice from '$lib/sweater/Choice.svelte';
	import Stage from '$lib/sweater/Stage.svelte';
	import { measure, type Design } from '$lib/sweater/garment';
	import { labelOf, sections, summary, visible } from '$lib/sweater/options';
	import { estimate, writePattern } from '$lib/sweater/pattern';
	import PatternView from '$lib/sweater/PatternView.svelte';

	let design = $state<Design>({
		wearer: 'Adult',
		garment: 'Sweater',
		construction: 'Raglan',
		size: 'M',
		fit: 'Relaxed',
		bodyLength: 'Regular',
		sleeveLength: 'Full',
		neckline: 'Crew',
		sleeveShape: 'Straight',
		hemFinish: 'Ribbed',
		bodyRib: '1×1',
		bodyRibLength: 'Regular',
		slits: 'None',
		neckRib: '1×1',
		neckDepth: 'Regular',
		cuffFinish: 'Ribbed',
		sleeveRib: '1×1',
		cuffLength: 'Regular',
		pattern: 'Solid',
		color: '#465e9d',
		contrast: '#faf3dc',
		gauge: 18
	});

	const tabs = [...sections.map(({ id, label }) => ({ id, label })), { id: 'summary', label: 'Summary' }, { id: 'pattern', label: 'Pattern' }];
	let tab = $state('design');
	let tabIndex = $derived(tabs.findIndex((t) => t.id === tab));
	let section = $derived(sections.find((s) => s.id === tab));
	let panel = $state<HTMLElement>();
	function go(id: string) {
		tab = id;
		panel?.scrollTo({ top: 0 });
	}

	let size = $derived(measure(design));
	const both = (cm: number) => `${Math.round(cm)} cm · ${Math.round(cm / 1.27) / 2} in`;

	let est = $derived(estimate(design));
	let pattern = $derived(writePattern(design));
</script>

<svelte:head>
	<title>Sweater Designer</title>
	<meta name="description" content="Design your own sweater pattern and see it in 3D." />
</svelte:head>

<div class="app">
	<header class="top"><strong>Sweater designer</strong><span>{summary(design)}</span></header>
	<div class="layout">
		<aside bind:this={panel}>
			<div class="tabs" role="tablist" aria-label="Pattern steps">
				{#each tabs as t, i (t.id)}
					<button type="button" role="tab" id="tab-{t.id}" aria-selected={tab === t.id} aria-controls="panel" onclick={() => go(t.id)}>
						<span class="num">{i + 1}</span>{t.label}
					</button>
				{/each}
			</div>
			<div id="panel" role="tabpanel" aria-labelledby="tab-{tab}">
				{#if tab === 'pattern'}
					<PatternView {pattern} main={design.color} contrast={design.contrast} />
				{:else if section}
					{#each section.groups as group (group.id)}
						{@const fields = visible(group, design)}
						{#if fields.length}
							<section>
								<h2>{group.label}</h2>
								{#each fields as field (field.key)}
									<div class="field">
										<div class="label"><span>{field.label}</span>{#if field.kind === 'color'}<em>{labelOf(field, design)}</em>{/if}</div>
										<Choice {field} bind:design />
									</div>
								{/each}
							</section>
						{/if}
					{/each}
				{:else}
					<section>
						<h2>Finished size</h2>
						<dl class="spec">
							<div><dt>Chest</dt><dd>{both(size.chest)}</dd></div>
							<div><dt>Body length</dt><dd>{both(size.L)}</dd></div>
						</dl>
					</section>
					{#each sections as s (s.id)}
						<section>
							<div class="head">
								<h2>{s.label}</h2>
								<button type="button" class="edit" onclick={() => go(s.id)}>Edit</button>
							</div>
							{#each s.groups as group (group.id)}
								{@const fields = visible(group, design)}
								{#if fields.length}
									{#if s.groups.length > 1}<h3>{group.label}</h3>{/if}
									<dl class="spec">
										{#each fields as field (field.key)}
											<div>
												<dt>{field.label}</dt>
												<dd>
													{#if field.kind === 'color'}<i class="chip" style:--c={String(design[field.key])}></i>{/if}{labelOf(field, design)}
												</dd>
											</div>
										{/each}
									</dl>
								{/if}
							{/each}
						</section>
					{/each}
				{/if}
			</div>
			<div class="steps">
				{#if tabIndex > 0}
					<button type="button" class="step" onclick={() => go(tabs[tabIndex - 1].id)}>Back</button>
				{/if}
				{#if tabIndex < tabs.length - 1}
					<button type="button" class="step next" onclick={() => go(tabs[tabIndex + 1].id)}>Next: {tabs[tabIndex + 1].label}</button>
				{/if}
			</div>
		</aside>
		<main>
			<div class="stage"><Stage {design} /></div>
			<div class="pattern">
				<dl>
					<div><dt>Yarn</dt><dd>{est.yards} yd · {est.skeins} {est.skeins === 1 ? 'skein' : 'skeins'}</dd></div>
					<div><dt>Needles</dt><dd>{est.yarn.needle}</dd></div>
					<div><dt>Gauge</dt><dd>{design.gauge} sts / 4 in</dd></div>
					<div><dt>Skill</dt><dd>{est.level}</dd></div>
				</dl>
				{#if tab !== 'pattern' && pattern.ok}
					<button type="button" class="step view" onclick={() => go('pattern')}>View pattern</button>
				{/if}
				<button type="button" class="save" onclick={() => window.print()} disabled={!pattern.ok} title={pattern.ok ? 'Print, or choose “Save as PDF” in the print dialog' : pattern.reason}>
					Print pattern
				</button>
			</div>
		</main>
	</div>
</div>
<div class="print-only"><PatternView {pattern} main={design.color} contrast={design.contrast} /></div>

<style>
	:global(*) {
		box-sizing: border-box;
	}
	:global(body) {
		margin: 0;
		background: #f4f4f5;
		color: #18181b;
		font: 13px/1.35 system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
		-webkit-font-smoothing: antialiased;
	}
	.app {
		--ink: #18181b;
		--muted: #6b6b74;
		--line: #dcdce0;
		--surface: #fff;
		--wash: #f4f4f5;
		--focus: #2563eb;
		display: flex;
		flex-direction: column;
		height: 100dvh;
	}
	.top {
		display: flex;
		align-items: center;
		justify-content: space-between;
		flex: none;
		height: 44px;
		padding: 0 16px;
		border-bottom: 1px solid var(--line);
		background: var(--surface);
	}
	.top strong {
		font-weight: 600;
	}
	.top span {
		color: var(--muted);
	}
	.layout {
		display: grid;
		grid-template-columns: 400px minmax(0, 1fr);
		flex: 1;
		min-height: 0;
	}
	aside {
		overflow-y: auto;
		padding: 4px 16px 24px;
		border-right: 1px solid var(--line);
		background: var(--surface);
	}
	.tabs {
		position: sticky;
		top: 0;
		z-index: 1;
		display: grid;
		grid-template-columns: repeat(5, 1fr);
		gap: 2px;
		margin: 0 -16px;
		padding: 8px 12px 0;
		border-bottom: 1px solid var(--line);
		background: var(--surface);
	}
	.tabs button {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 5px;
		height: 38px;
		padding: 0 4px;
		border: 0;
		border-bottom: 2px solid transparent;
		margin-bottom: -1px;
		background: none;
		color: var(--muted);
		font: inherit;
		font-weight: 500;
		white-space: nowrap;
		cursor: pointer;
		transition: color 120ms ease-out, border-color 120ms ease-out;
	}
	.tabs button[aria-selected='true'] {
		border-bottom-color: var(--ink);
		color: var(--ink);
	}
	.tabs button:focus-visible,
	.step:focus-visible,
	.edit:focus-visible {
		outline: 2px solid var(--focus);
		outline-offset: -2px;
	}
	@media (hover: hover) and (pointer: fine) {
		.tabs button:hover {
			color: var(--ink);
		}
		.step:hover,
		.edit:hover {
			background: var(--wash);
		}
		.step.next:hover {
			background: #3f3f46;
		}
	}
	.num {
		display: inline-grid;
		place-items: center;
		width: 18px;
		height: 18px;
		border-radius: 50%;
		background: var(--wash);
		font-size: 11px;
		font-variant-numeric: tabular-nums;
	}
	[aria-selected='true'] .num {
		background: var(--ink);
		color: #fff;
	}
	section {
		padding: 14px 0 16px;
		border-bottom: 1px solid var(--line);
	}
	section:last-child {
		border-bottom: 0;
	}
	.head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 8px;
	}
	.head h2 {
		margin: 0;
	}
	.edit {
		height: 28px;
		padding: 0 10px;
		border: 1px solid var(--line);
		border-radius: 6px;
		background: var(--surface);
		color: var(--ink);
		font: inherit;
		font-size: 12px;
		cursor: pointer;
	}
	.spec {
		display: grid;
		grid-template-columns: 1fr;
		gap: 0;
	}
	h3 {
		margin: 10px 0 0;
		font-size: 11px;
		font-weight: 600;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		color: var(--muted);
	}
	.spec div {
		display: flex;
		justify-content: space-between;
		gap: 12px;
		padding: 5px 0;
	}
	.spec dt {
		font-size: 13px;
	}
	.spec dd {
		display: flex;
		align-items: center;
		gap: 6px;
		text-align: right;
	}
	.chip {
		width: 12px;
		height: 12px;
		border: 1px solid rgba(0, 0, 0, 0.18);
		border-radius: 50%;
		background: var(--c);
	}
	.steps {
		display: flex;
		gap: 8px;
		padding-top: 16px;
		border-top: 1px solid var(--line);
	}
	.step {
		flex: 1;
		height: 36px;
		padding: 0 14px;
		border: 1px solid var(--line);
		border-radius: 6px;
		background: var(--surface);
		color: var(--ink);
		font: inherit;
		font-weight: 500;
		cursor: pointer;
		transition: background-color 120ms ease-out, transform 120ms ease-out;
	}
	.step.next {
		border-color: var(--ink);
		background: var(--ink);
		color: #fff;
	}
	.step:active,
	.edit:active {
		transform: scale(0.97);
	}
	h2 {
		margin: 0 0 10px;
		font-size: 13px;
		font-weight: 600;
	}
	.field + .field {
		margin-top: 12px;
	}
	.label {
		display: flex;
		justify-content: space-between;
		margin-bottom: 5px;
		font-size: 12px;
		color: var(--muted);
	}
	em {
		font-style: normal;
		color: var(--ink);
	}
	main {
		display: flex;
		flex-direction: column;
		min-width: 0;
		min-height: 0;
	}
	.stage {
		flex: 1;
		min-height: 0;
	}
	.pattern {
		display: flex;
		align-items: center;
		gap: 12px;
		flex: none;
		padding: 10px 16px;
		border-top: 1px solid var(--line);
		background: var(--surface);
	}
	dl {
		display: flex;
		flex-wrap: wrap;
		gap: 4px 28px;
		flex: 1;
		margin: 0;
	}
	dt {
		font-size: 12px;
		color: var(--muted);
	}
	dd {
		margin: 0;
		font-weight: 500;
		font-variant-numeric: tabular-nums;
	}
	.step.view {
		flex: none;
		white-space: nowrap;
	}
	.save {
		height: 36px;
		padding: 0 16px;
		border: 1px solid var(--ink);
		border-radius: 6px;
		background: var(--ink);
		color: #fff;
		font: inherit;
		font-weight: 500;
		white-space: nowrap;
		cursor: pointer;
		transition: transform 120ms ease-out;
	}
	.save:active:not(:disabled) {
		transform: scale(0.97);
	}
	.save:disabled {
		border-color: var(--line);
		background: var(--wash);
		color: var(--muted);
		cursor: not-allowed;
	}
	.print-only {
		display: none;
	}
	@media print {
		:global(body) {
			background: #fff;
		}
		.app {
			display: none;
		}
		.print-only {
			display: block;
			max-width: 170mm;
			margin: 0 auto;
		}
	}
	.save:focus-visible {
		outline: 2px solid var(--focus);
		outline-offset: 2px;
	}
	@media (max-width: 760px) {
		.app {
			height: auto;
			min-height: 100dvh;
		}
		.layout {
			display: flex;
			flex-direction: column-reverse;
		}
		main {
			position: sticky;
			top: 0;
			z-index: 1;
			border-bottom: 1px solid var(--line);
		}
		.stage {
			flex: none;
			height: 40dvh;
		}
		.pattern {
			padding: 8px 12px;
		}
		dl {
			gap: 2px 16px;
		}
		.step.view {
			display: none;
		}
		aside {
			overflow: visible;
			border-right: 0;
		}
		.tabs {
			position: static;
		}
	}
</style>
