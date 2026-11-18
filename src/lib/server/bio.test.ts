import { describe, expect, it } from 'vitest';
import { cleanBio, readBio } from './bio';

describe('cleanBio', () => {
	it('keeps the plain-text fields, tidied', () => {
		expect(cleanBio({ location: ' Leeds,\n UK ', about_me: 'I knit.', fave_colors: 'navy', fave_curse: 'steeking' })).toEqual({
			location: 'Leeds, UK',
			about: 'I knit.',
			faveColors: 'navy',
			faveCurse: 'steeking'
		});
	});
	it('ignores HTML, unknown fields and wrong types', () => {
		expect(cleanBio({ about_me_html: '<script>x</script>', email: 'a@b.c', location: 5 })).toBeNull();
	});
	it('caps long text', () => {
		expect(cleanBio({ about_me: 'a'.repeat(2000) })?.about).toHaveLength(600);
	});
	it('returns null for nothing', () => {
		expect(cleanBio(undefined)).toBeNull();
		expect(cleanBio({ location: '   ' })).toBeNull();
	});
});

describe('readBio', () => {
	it('round-trips a stored bio', () => {
		const bio = { location: 'Oslo', about: 'Hi' };
		expect(readBio(bio)).toEqual(bio);
		expect(readBio(null)).toBeNull();
	});
});
