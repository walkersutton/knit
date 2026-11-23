import { describe, expect, it } from 'vitest';
import { BulkStop, runBulk, sameValue, summarize } from './bulk';

describe('runBulk', () => {
	it('keeps going past a failed item', async () => {
		const r = await runBulk(['a', 'b', 'c'], (id) => {
			if (id === 'b') throw new Error('nope');
		});
		expect(r.done).toEqual(['a', 'c']);
		expect(r.failed).toEqual([{ id: 'b', message: 'nope' }]);
		expect(r.stopped).toBeNull();
	});
	it('stops at a BulkStop and leaves the rest alone', async () => {
		const seen: string[] = [];
		const r = await runBulk(['a', 'b', 'c'], (id) => {
			seen.push(id);
			if (id === 'b') throw new BulkStop('Limit reached.');
		});
		expect(seen).toEqual(['a', 'b']);
		expect(r.done).toEqual(['a']);
		expect(r.stopped).toBe('Limit reached.');
		expect(summarize(r, 'Shared', 'design', 3)).toBe('Shared 1 design. Limit reached. 2 designs left alone.');
	});
});

describe('summarize', () => {
	it('pluralises and reports failures', () => {
		expect(summarize({ done: ['a', 'b'], failed: [{ id: 'c', message: 'x' }], stopped: null }, 'Deleted', 'design')).toBe('Deleted 2 designs. 1 failed.');
		expect(summarize({ done: [], failed: [], stopped: null }, 'Deleted', 'design')).toBe('Nothing changed.');
	});
});

describe('sameValue', () => {
	it('ignores key order and undefined fields', () => {
		expect(sameValue({ a: 1, b: { c: [1, 2], d: 'x' } }, { b: { d: 'x', c: [1, 2] }, a: 1, z: undefined })).toBe(true);
		expect(sameValue({ a: 1 }, { a: 2 })).toBe(false);
	});
});
