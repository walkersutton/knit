<script lang="ts">
	import type { Pattern } from './pattern';

	let { pattern, contrast = '#c8543e', main = '#465e9d' }: { pattern: Pattern; contrast?: string; main?: string } = $props();

	/** Split "Cast on **86** sts" into plain and bold parts. */
	const parts = (s: string) => s.split(/\*\*(\d+)\*\*/).map((text, i) => ({ text, bold: i % 2 === 1 }));
	const CELL = 14;
</script>

{#snippet rich(s: string)}{#each parts(s) as p, i (i)}{#if p.bold}<b>{p.text}</b>{:else}{p.text}{/if}{/each}{/snippet}

<article class="pattern">
	{#if !pattern.ok}
		<p class="unsupported">{pattern.reason}</p>
	{:else}
		<header>
			<h1>{pattern.title}</h1>
			<p class="meta">Top-down raglan · {pattern.level}</p>
		</header>

		<section>
			<h2>Materials</h2>
			<dl>
				{#each pattern.materials as [label, value] (label)}<div><dt>{label}</dt><dd>{value}</dd></div>{/each}
			</dl>
		</section>
		<section>
			<h2>Gauge</h2>
			<p>{pattern.gauge}</p>
		</section>
		<section>
			<h2>Finished measurements</h2>
			<dl class="measure">
				{#each pattern.measurements as [label, value] (label)}<div><dt>{label}</dt><dd>{value}</dd></div>{/each}
			</dl>
		</section>

		{#each pattern.sections as s (s.id)}
			<section>
				<h2>{s.title}</h2>
				<ol>
					{#each s.steps as step, i (i)}
						<li>
							<span>{@render rich(step.text)}</span>
							{#if step.count}<span class="count">{@render rich(step.count)}</span>{/if}
						</li>
					{/each}
				</ol>
				{#if s.id === 'colour' && pattern.chart}
					{@const rows = pattern.chart.length}
					{@const cols = pattern.chart[0].length}
					<figure>
						<svg viewBox="0 0 {cols * CELL + 24} {rows * CELL}" width={cols * CELL + 24} height={rows * CELL} role="img" aria-label="Fair Isle chart, {cols} stitches by {rows} rows">
							{#each pattern.chart as row, j (j)}
								{#each row as on, i (i)}
									<rect x={i * CELL} y={j * CELL} width={CELL} height={CELL} fill={on ? contrast : main} stroke="rgba(0,0,0,0.25)" stroke-width="0.5" />
								{/each}
								<text x={cols * CELL + 6} y={j * CELL + CELL - 3.5}>{j + 1}</text>
							{/each}
						</svg>
						<figcaption>Chart: {cols} sts × {rows} rows. Work rows 1 → {rows}, top to bottom; read each row right to left.</figcaption>
					</figure>
				{/if}
			</section>
		{/each}

		<section>
			<h2>Abbreviations</h2>
			<dl class="abbr">
				{#each pattern.abbreviations as [label, value] (label)}<div><dt>{label}</dt><dd>{value}</dd></div>{/each}
			</dl>
		</section>
	{/if}
</article>

<style>
	.pattern {
		font-size: 13px;
		line-height: 1.5;
	}
	header {
		padding: 14px 0 10px;
		border-bottom: 1px solid var(--line, #dcdce0);
	}
	h1 {
		margin: 0;
		font-size: 16px;
		font-weight: 600;
		line-height: 1.3;
	}
	.meta {
		margin: 2px 0 0;
		color: var(--muted, #6b6b74);
	}
	section {
		padding: 14px 0;
		border-bottom: 1px solid var(--line, #dcdce0);
		break-inside: avoid-page;
	}
	section:last-child {
		border-bottom: 0;
	}
	h2 {
		margin: 0 0 8px;
		font-size: 13px;
		font-weight: 600;
	}
	p {
		margin: 0;
	}
	dl {
		display: grid;
		gap: 6px;
		margin: 0;
	}
	dl div {
		display: grid;
		grid-template-columns: 110px 1fr;
		gap: 10px;
	}
	.measure div {
		grid-template-columns: 1fr auto;
	}
	.abbr div {
		grid-template-columns: 70px 1fr;
	}
	dt {
		color: var(--muted, #6b6b74);
	}
	dd {
		margin: 0;
		font-variant-numeric: tabular-nums;
	}
	ol {
		display: grid;
		gap: 8px;
		margin: 0;
		padding-left: 20px;
	}
	li::marker {
		color: var(--muted, #6b6b74);
		font-variant-numeric: tabular-nums;
	}
	.count {
		display: block;
		margin-top: 1px;
		color: var(--muted, #6b6b74);
		font-size: 12px;
		font-variant-numeric: tabular-nums;
	}
	.count :global(b) {
		color: var(--ink, #18181b);
	}
	b {
		font-weight: 600;
		font-variant-numeric: tabular-nums;
	}
	figure {
		margin: 12px 0 0;
	}
	svg {
		display: block;
		max-width: 100%;
		height: auto;
	}
	svg text {
		font-size: 9px;
		fill: var(--muted, #6b6b74);
		font-variant-numeric: tabular-nums;
	}
	figcaption {
		margin-top: 6px;
		color: var(--muted, #6b6b74);
		font-size: 12px;
	}
	.unsupported {
		margin: 16px 0;
		padding: 12px;
		border: 1px solid var(--line, #dcdce0);
		border-radius: 6px;
		background: var(--wash, #f4f4f5);
	}
	@media print {
		.pattern {
			font-size: 10.5pt;
		}
		h1 {
			font-size: 15pt;
		}
		h2 {
			font-size: 11pt;
		}
		.count {
			font-size: 9.5pt;
		}
	}
</style>
