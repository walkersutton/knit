<script lang="ts">
	/** A knitter's name as a link to their page, with their Ravelry photo (or an initial) in a small circle beside it. */
	let { name, photo = null }: { name: string; photo?: string | null } = $props();
	let broken = $state(false);
	const TONES = ['#f4d5c3', '#f6e2a4', '#d7e4d3', '#d3e3f2'];
	let tone = $derived(TONES[[...name].reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % TONES.length]);
	let initial = $derived((name.match(/[\p{L}\p{N}]/u)?.[0] ?? '?').toUpperCase());
</script>

<a class="author" href="/people/{encodeURIComponent(name)}">
	<span class="av" aria-hidden="true" style="--tone: {tone}">
		{#if photo && !broken}
			<img src={photo} alt="" width="18" height="18" loading="lazy" referrerpolicy="no-referrer" onerror={() => (broken = true)} />
		{:else}{initial}{/if}
	</span><span class="n">{name}</span>
</a>

<style>
	.author {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		max-width: 100%;
		vertical-align: middle;
		color: inherit;
		text-decoration: none;
	}
	.av {
		display: grid;
		place-items: center;
		flex: none;
		width: 18px;
		height: 18px;
		overflow: hidden;
		border-radius: 50%;
		background: var(--tone);
		box-shadow: 0 0 0 1px rgb(38 51 95 / 0.2);
		color: #26335f;
		font: 600 11px / 1 var(--display);
		text-transform: none;
	}
	img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
	.n {
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.author:focus-visible {
		outline: 2px solid var(--focus);
		outline-offset: 2px;
		border-radius: 999px;
	}
	@media (hover: hover) and (pointer: fine) {
		.author:hover .n {
			text-decoration: underline;
		}
	}
</style>
