import { describe, expect, it, vi } from 'vitest';

vi.mock('./db', () => ({ database: () => { throw new Error('no database in tests'); } }));

import { cleanPhoto, profilePhoto } from './members';

describe('cleanPhoto', () => {
	it('keeps https URLs', () => {
		expect(cleanPhoto('https://images4-g.ravelrycache.com/uploads/a/b_small.jpg')).toBe('https://images4-g.ravelrycache.com/uploads/a/b_small.jpg');
	});
	it('drops anything else', () => {
		expect(cleanPhoto('http://example.com/a.jpg')).toBeNull();
		expect(cleanPhoto('javascript:alert(1)')).toBeNull();
		expect(cleanPhoto('not a url')).toBeNull();
		expect(cleanPhoto(null)).toBeNull();
		expect(cleanPhoto('https://example.com/' + 'a'.repeat(600))).toBeNull();
	});
});

describe('profilePhoto', () => {
	it('prefers the small photo, then the tiny one, then the full size', () => {
		const small = 'https://x.test/s.jpg';
		const tiny = 'https://x.test/t.jpg';
		const full = 'https://x.test/f.jpg';
		expect(profilePhoto({ small_photo_url: small, tiny_photo_url: tiny, photo_url: full })).toBe(small);
		expect(profilePhoto({ tiny_photo_url: tiny, photo_url: full })).toBe(tiny);
		expect(profilePhoto({ photo_url: full })).toBe(full);
		expect(profilePhoto({})).toBeNull();
		expect(profilePhoto(undefined)).toBeNull();
	});
});
