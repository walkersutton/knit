import { describe, expect, it } from 'vitest';
import { ago, buildFacets, parseSort } from './browse';

const rows = [
	{ size: 'standard', colour: '#c8543e' },
	{ size: 'standard', colour: '#2f5a48' },
	{ size: 'fine', colour: '#c8543e' }
];
const specs = [
	{ key: 'size', label: 'Size', words: { standard: 'Standard', fine: 'Fine' }, order: ['standard', 'fine'] },
	{ key: 'colour', label: 'Colour', swatch: true }
];

describe('buildFacets', () => {
	it('lists each answer once, in the order given, with its count', () => {
		const [size] = buildFacets(rows, specs, {});
		expect(size.options.map((o) => [o.label, o.count])).toEqual([['Standard', 2], ['Fine', 1]]);
	});

	it('counts what an answer would leave given the other chosen facets', () => {
		const [size, colour] = buildFacets(rows, specs, { colour: '#c8543e' });
		expect(size.options.map((o) => o.count)).toEqual([1, 1]);
		// Choosing a colour does not shrink that facet's own counts.
		expect(colour.options.map((o) => o.count)).toEqual([2, 1]);
	});

	it('names colours from the palette and puts them in palette order', () => {
		const [, colour] = buildFacets(rows, specs, {});
		expect(colour.options.map((o) => o.label)).toEqual(['Brick', 'Forest']);
		expect(colour.options[0].swatch).toBe('#c8543e');
	});

	it('keeps a chosen answer even when nothing has it', () => {
		const [size] = buildFacets(rows, specs, { size: 'centerpiece' });
		expect(size.options.find((o) => o.value === 'centerpiece')?.count).toBe(0);
		expect(size.value).toBe('centerpiece');
	});
});

describe('parseSort', () => {
	it('is newest unless asked for the most loved', () => {
		expect(parseSort('loved')).toBe('loved');
		expect(parseSort('whatever')).toBe('new');
		expect(parseSort(null)).toBe('new');
	});
});

describe('ago', () => {
	const now = Date.UTC(2026, 10, 22);
	it('words the time since sharing', () => {
		expect(ago(new Date(now), now)).toBe('today');
		expect(ago(new Date(now - 3 * 86_400_000), now)).toBe('3d ago');
		expect(ago(new Date(now - 21 * 86_400_000), now)).toBe('3w ago');
		expect(ago(new Date(now - 150 * 86_400_000), now)).toBe('5mo ago');
	});
});
