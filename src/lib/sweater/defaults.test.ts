import { describe, expect, it } from 'vitest';
import { DEFAULT_DESIGN } from './defaults';
import { writePattern } from './pattern';
import { validDesign } from './progress';

describe('DEFAULT_DESIGN', () => {
	it('is a design the designer offers, and one a pattern can be written for', () => {
		expect(validDesign(DEFAULT_DESIGN, DEFAULT_DESIGN)).toBe(true);
		expect(writePattern(DEFAULT_DESIGN).ok).toBe(true);
	});
	it('is not valid with a choice the designer does not offer', () => {
		expect(validDesign({ ...DEFAULT_DESIGN, garment: 'Poncho' }, DEFAULT_DESIGN)).toBe(false);
	});
});
