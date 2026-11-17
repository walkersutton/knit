<script lang="ts">
	import { onMount } from 'svelte';
	import { yarn, yarnAt } from './yarn.svelte';

	/**
	 * The needle is a real OS cursor (CSS `cursor: url()`), not an element chasing the pointer: it has no lag,
	 * an exact hotspot, and everything else stays native — the hand over links and buttons, the I-beam in text fields.
	 * Only the yarn colour is ours to change, and it is re-issued every so often as the pointer travels.
	 */
	const STEP = 24;

	function needle(color: string): string {
		const yarnColor = color.replace(/rgb\((\d+) (\d+) (\d+)\)/, 'rgb($1,$2,$3)');
		const shapes = `<path d="M-2.1 9C-2.5 3.5 2.5 3.5 2.1 9" fill="none" stroke-linecap="round"/><rect x="-1.3" y="5" width="2.6" height="30" rx="1.3"/><path d="M-1.3 6C-1.3 3.5 -.4 1.5 0 0C.4 1.5 1.3 3.5 1.3 6Z"/><circle cy="35" r="2.8"/>`;
		const svg =
			`<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">` +
			// A pale edge keeps it visible on navy as well as cream, like the outline on the system arrow.
			`<g transform="translate(3.5 2.5) rotate(-38) scale(.78)" stroke="#fffaf0" stroke-width="2.4" stroke-linejoin="round" fill="#fffaf0">${shapes}</g>` +
			`<g transform="translate(3.5 2.5) rotate(-38) scale(.78)">` +
			`<path d="M-2.1 9C-2.5 3.5 2.5 3.5 2.1 9" fill="none" stroke="${yarnColor}" stroke-width="1.8" stroke-linecap="round"/>` +
			`<rect x="-1.3" y="5" width="2.6" height="30" rx="1.3" fill="#d9b27c"/>` +
			`<path d="M-1.3 6C-1.3 3.5 -.4 1.5 0 0C.4 1.5 1.3 3.5 1.3 6Z" fill="#e6c391"/>` +
			`<circle cy="35" r="2.8" fill="#c8543e"/></g></svg>`;
		return `url("data:image/svg+xml,${encodeURIComponent(svg)}") 3 2, auto`;
	}

	onMount(() => {
		// Only for a real mouse: touch has no cursor to replace.
		if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return;
		const root = document.documentElement;
		const set = () => root.style.setProperty('--needle', needle(yarn.color));
		set();
		root.classList.add('needle');
		let lx = NaN;
		let ly = 0;
		let issued = 0;
		function move(e: PointerEvent) {
			if (e.pointerType === 'touch') return;
			if (!Number.isNaN(lx)) {
				yarn.travelled += Math.hypot(e.clientX - lx, e.clientY - ly);
				yarn.color = yarnAt(yarn.travelled);
				if (yarn.travelled - issued >= STEP) {
					issued = yarn.travelled;
					set();
				}
			}
			lx = e.clientX;
			ly = e.clientY;
		}
		addEventListener('pointermove', move, { passive: true });
		return () => {
			root.classList.remove('needle');
			root.style.removeProperty('--needle');
			removeEventListener('pointermove', move);
		};
	});
</script>

<style>
	/* The needle is the arrow. Controls keep the system hand, text fields their I-beam, disabled things their no-go sign. */
	:global(html.needle) {
		cursor: var(--needle);
	}
	:global(html.needle :is(a, button, label, summary, [role='tab'], [role='radio'], [role='button'], input[type='range'], input[type='checkbox'], input[type='radio'], select):not(:disabled, [aria-disabled='true'])) {
		cursor: pointer;
	}
	:global(html.needle :is(input:not([type='range'], [type='checkbox'], [type='radio']), textarea, [contenteditable])) {
		cursor: text;
	}
	:global(html.needle :is(button, input, select):disabled) {
		cursor: not-allowed;
	}
</style>
