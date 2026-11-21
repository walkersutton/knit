import { describe, expect, it, vi } from 'vitest';

// Only the pure checks are used; nothing here talks to the database.
vi.mock('./db', () => ({ database: () => { throw new Error('no database in tests'); } }));
vi.mock('./auth', async () => {
	const { createHash } = await import('node:crypto');
	return { digest: (v: string) => createHash('sha256').update(v).digest('hex') };
});

import { parseCenterpiece } from '$lib/sweater/centerpiece';
import { shareable as chartShareable, cleanName as chartName, cleanNotes } from './charts';
import { shareable as patternShareable, cleanName as patternName } from './patterns';
import { centerpieces, charts, patterns, SEED_USER } from './seed';

describe('seed designs', () => {
	it('has ten of each kind, each with its own name', () => {
		for (const list of [charts, centerpieces, patterns]) {
			expect(list).toHaveLength(10);
			expect(new Set(list.map((x) => x.name)).size).toBe(10);
		}
	});
	it('shares every chart and centerpiece as a knitter could, with names and notes unchanged by cleaning', () => {
		for (const c of [...charts, ...centerpieces]) {
			expect(chartShareable(c), c.name).toBe(true);
			expect(chartName(c.name)).toBe(c.name);
			expect(cleanNotes(c.notes)).toBe(c.notes);
		}
	});
	it('keeps repeats and centerpieces apart', () => {
		for (const c of charts) expect(parseCenterpiece(c.motif), c.name).toBeNull();
		for (const c of centerpieces) expect(parseCenterpiece(c.motif), c.name).not.toBeNull();
	});
	it('only shares patterns that can be written', () => {
		for (const p of patterns) {
			expect(patternShareable(p.design), p.name).toBe(true);
			expect(patternName(p.name)).toBe(p.name);
		}
	});
	it('gives every design in a chart a contrast that shows', () => {
		for (const c of [...charts, ...centerpieces]) expect(c.color, c.name).not.toBe(c.contrast);
		for (const p of patterns) expect(p.design.color, p.name).not.toBe(p.design.contrast);
	});
	it('uses an account id no Ravelry sign-in can have', () => {
		expect(SEED_USER.ravelryUserId).not.toMatch(/^\d+$/);
	});
});
