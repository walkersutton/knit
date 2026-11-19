import { describe, expect, it } from 'vitest';
import { chartDesign } from './library';
import { blankCenterpiece, encodeCenterpiece } from './centerpiece';
import { CUSTOM_PATTERN, starterMotif } from './motifs';

const MOTIF = starterMotif();

describe('chartDesign', () => {
	it('knits a repeating chart all over the chosen garment', () => {
		const d = chartDesign(MOTIF, '#111111', '#eeeeee', 'Cardigan');
		expect(d).toMatchObject({ garment: 'Cardigan', pattern: CUSTOM_PATTERN, motif: MOTIF, color: '#111111', contrast: '#eeeeee', centerpiece: '' });
	});

	it('gives a T-shirt short sleeves', () => {
		expect(chartDesign(MOTIF, '#111111', '#eeeeee', 'T-shirt').sleeveLength).toBe('Short');
		expect(chartDesign(MOTIF, '#111111', '#eeeeee', 'Sweater').sleeveLength).toBe('Full');
	});

	it('works a centerpiece once on the front of a plain garment', () => {
		const cp = encodeCenterpiece(blankCenterpiece(10, 6));
		expect(chartDesign(cp, '#111111', '#eeeeee', 'Slipover')).toMatchObject({ garment: 'Slipover', centerpiece: cp, pattern: 'Solid' });
	});

	it('falls back to a sweater for an unknown garment', () => {
		expect(chartDesign(MOTIF, '#111111', '#eeeeee', 'Hat').garment).toBe('Sweater');
	});
});
