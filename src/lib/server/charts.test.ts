import { describe, expect, it, vi } from 'vitest';

// The module talks to the database only inside its queries; validation is pure.
vi.mock('./db', () => ({ database: () => { throw new Error('no database in tests'); } }));

import { blankMotif, FINE_TILE, starterMotif } from '$lib/sweater/motifs';
import { colors } from '$lib/sweater/options';
import { cleanName, isId, shareable, sizeOf } from './charts';

const [a, b] = colors.map((c) => String(c.value));

describe('shareable', () => {
	it('accepts a standard or fine chart in palette colours', () => {
		expect(shareable({ motif: starterMotif(), color: a, contrast: b })).toBe(true);
		expect(shareable({ motif: blankMotif(FINE_TILE), color: a, contrast: b })).toBe(true);
	});
	it('accepts a centerpiece, and files it under its own size', () => {
		const cp = '3x3:010111010';
		expect(shareable({ motif: cp, color: a, contrast: b })).toBe(true);
		expect(sizeOf(cp)).toBe('centerpiece');
		expect(shareable({ motif: '3x3:0101', color: a, contrast: b })).toBe(false);
	});
	it('rejects malformed charts and colours outside the palette', () => {
		expect(shareable(null)).toBe(false);
		expect(shareable({ motif: '0101', color: a, contrast: b })).toBe(false);
		expect(shareable({ motif: starterMotif(), color: '#123456', contrast: b })).toBe(false);
		expect(shareable({ motif: starterMotif(), color: a })).toBe(false);
	});
});

describe('names and ids', () => {
	it('tidies names and caps them at 40 characters', () => {
		expect(cleanName('  Big   hearts ')).toBe('Big hearts');
		expect(cleanName('x'.repeat(80))).toHaveLength(40);
		expect(cleanName(7)).toBe('');
	});
	it('only passes uuids', () => {
		expect(isId('3f2b8c1e-9d4a-4f6b-8a1c-2e7d5b9c0a14')).toBe(true);
		expect(isId("1'; DROP TABLE users")).toBe(false);
	});
	it('names the size from the chart length', () => {
		expect(sizeOf(starterMotif())).toBe('standard');
		expect(sizeOf(blankMotif(FINE_TILE))).toBe('fine');
	});
});
