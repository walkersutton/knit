import { describe, expect, it, vi } from 'vitest';

// The module talks to the database only inside its queries; naming is pure.
vi.mock('./db', () => ({ database: () => { throw new Error('no database in tests'); } }));
vi.mock('./auth', () => ({ digest: (s: string) => s }));

import { isSlug, nextSlug, slugify } from './patterns';

describe('slugify', () => {
	it('turns a name into lowercase words joined by hyphens', () => {
		expect(slugify('Cosy Fair Isle!')).toBe('cosy-fair-isle');
		expect(slugify('  My   sweater  ')).toBe('my-sweater');
		expect(slugify("Gran's #1 jumper")).toBe('gran-s-1-jumper');
	});
	it('drops accents', () => {
		expect(slugify('Pull à la Française')).toBe('pull-a-la-francaise');
	});
	it('falls back to "pattern" for a name with no letters or digits', () => {
		expect(slugify('❤️ ✨')).toBe('pattern');
		expect(slugify('')).toBe('pattern');
	});
	it('stays short and never ends in a hyphen', () => {
		const slug = slugify('a'.repeat(49) + ' b');
		expect(slug.length).toBeLessThanOrEqual(50);
		expect(slug.endsWith('-')).toBe(false);
	});
	it('always makes something isSlug accepts', () => {
		for (const name of ['Cosy Fair Isle!', '--x--', 'Ünïcödé', '❤️']) expect(isSlug(slugify(name))).toBe(true);
	});
});

describe('nextSlug', () => {
	it('keeps the name when it is free', () => {
		expect(nextSlug('cosy', [])).toBe('cosy');
	});
	it('numbers a name that is taken', () => {
		expect(nextSlug('cosy', ['cosy'])).toBe('cosy-2');
		expect(nextSlug('cosy', ['cosy', 'cosy-2', 'cosy-3'])).toBe('cosy-4');
	});
	it('never takes a path that is a page of its own', () => {
		expect(nextSlug('view', [])).toBe('view-2');
		expect(nextSlug('view', ['view-2'])).toBe('view-3');
	});
	it('skips a number someone named their pattern with', () => {
		expect(nextSlug('cosy', ['cosy', 'cosy-2'])).toBe('cosy-3');
	});
});

describe('isSlug', () => {
	it('rejects anything that is not lowercase words and hyphens', () => {
		expect(isSlug('cosy-fair-isle')).toBe(true);
		expect(isSlug('Cosy')).toBe(false);
		expect(isSlug('-cosy')).toBe(false);
		expect(isSlug("x'; DROP TABLE users")).toBe(false);
	});
});
