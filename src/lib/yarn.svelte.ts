/** The yarn on the needle. Its colour drifts through the palette as the pointer travels. */
const PALETTE = ['#c8543e', '#e8bd53', '#78917a', '#9dbfe0', '#b45c89', '#d99172'].map((hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)));
/** Pixels of travel per step through the palette. */
const PER_COLOUR = 260;

export function yarnAt(distance: number): string {
	const t = (distance / PER_COLOUR) % PALETTE.length;
	const i = Math.floor(t);
	const f = t - i;
	const [a, b] = [PALETTE[i], PALETTE[(i + 1) % PALETTE.length]];
	return `rgb(${a.map((v, k) => Math.round(v + (b[k] - v) * f)).join(' ')})`;
}

export const yarn = $state({ color: yarnAt(0), travelled: 0 });
