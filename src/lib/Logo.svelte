<script lang="ts">
	let { size = 28, word = true }: { size?: number; word?: boolean } = $props();
	const STITCH = 'M0 0C-7 -4 -10.5 -12 -9.5 -18.5C-9 -21.5 -5.5 -21.5 -4 -19C-1.5 -14.5 0 -8 0 0Z';
</script>

<span class="logo">
	<svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
		<rect width="32" height="32" rx="7" fill="#465e9d" />
		<g fill="#faf3dc">
			{#each [15.5, 27] as cy}
				<g transform="translate(16 {cy}) scale(.85 .52)"><path d={STITCH} /><path d={STITCH} transform="scale(-1 1)" /></g>
			{/each}
		</g>
	</svg>
	{#if word}<span class="word">Knit <em>It</em></span>{/if}
</span>

<style>
	.logo {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		color: var(--ink);
	}
	svg {
		flex: none;
		transition: transform 200ms cubic-bezier(0.34, 1.56, 0.64, 1);
	}
	.word {
		font-family: var(--display);
		font-size: 1.35em;
		font-weight: 700;
		line-height: 1;
		letter-spacing: -0.01em;
	}
	em {
		color: #c8543e;
		font-style: normal;
	}
	@media (hover: hover) and (pointer: fine) {
		:global(a:hover) > .logo svg {
			transform: rotate(-8deg) scale(1.08);
		}
	}
</style>
