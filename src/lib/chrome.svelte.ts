import type { Snippet } from 'svelte';

/**
 * What the page asks the shared site header to show. The header lives in the root layout so it
 * stays mounted across navigation; `wide` stretches the bar and footer to the catalogue's width; pages hand it content through `HeaderSlot` instead of
 * rendering a bar of their own.
 */
export const chrome = $state<{ left?: Snippet; center?: Snippet; right?: Snippet; app: boolean; wide: boolean }>({ app: false, wide: false });
