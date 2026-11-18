<script lang="ts">
	import { goto } from '$app/navigation';
	let { size = 28, word = true }: { size?: number; word?: boolean } = $props();
	let svg: SVGSVGElement;

	// Fun click: a springy spin-and-hop, restartable on rapid clicks.
	// The logo is usually inside a link whose page unmounts on navigation, which would cut the
	// animation off, so a plain click holds navigation until the animation finishes.
	async function play(e: MouseEvent) {
		if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
		const a = (e.target as Element).closest('a');
		const plain = a && !e.defaultPrevented && e.button === 0 && !(e.metaKey || e.ctrlKey || e.shiftKey || e.altKey);
		if (plain) e.preventDefault();
		const anim = svg.animate(
			[
				{ transform: 'translateY(0) rotate(0) scale(1)', offset: 0 },
				{ transform: 'translateY(2px) rotate(0) scale(1.1, 0.8)', offset: 0.15 },
				{ transform: 'translateY(-9px) rotate(200deg) scale(0.92, 1.12)', offset: 0.5 },
				{ transform: 'translateY(0) rotate(360deg) scale(1.15, 0.85)', offset: 0.75 },
				{ transform: 'translateY(-2px) rotate(360deg) scale(0.96, 1.04)', offset: 0.88 },
				{ transform: 'translateY(0) rotate(360deg) scale(1)', offset: 1 }
			],
			{ duration: 550, easing: 'cubic-bezier(0.34, 1.2, 0.64, 1)' }
		);
		if (plain) {
			await anim.finished.catch(() => {}); // a rapid re-click cancels nothing; this just waits
			if (a.pathname !== location.pathname) await goto(a.href);
		}
	}
	const STITCH = 'M0 0C-7 -4 -10.5 -12 -9.5 -18.5C-9 -21.5 -5.5 -21.5 -4 -19C-1.5 -14.5 0 -8 0 0Z';
</script>

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
<span class="logo" onclick={play}>
	<svg bind:this={svg} width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
		<rect width="32" height="32" rx="7" fill="#465e9d" />
		<g fill="#faf3dc">
			{#each [15.5, 27] as cy}
				<g transform="translate(16 {cy}) scale(.85 .52)"><path d={STITCH} /><path d={STITCH} transform="scale(-1 1)" /></g>
			{/each}
		</g>
	</svg>
	{#if word}<span class="word">kn<strong>it</strong></span>{/if}
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
		font-weight: 500;
		line-height: 1;
		letter-spacing: -0.01em;
	}
	strong {
		font-weight: 750;
	}
	@media (hover: hover) and (pointer: fine) {
		:global(a:hover) > .logo svg {
			transform: rotate(-8deg) scale(1.08);
		}
	}
</style>
