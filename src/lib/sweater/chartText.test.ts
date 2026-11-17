import { describe, expect, it } from 'vitest';
import { chartToText, parseChartText } from './chartText';
import { blankMotif, starterMotif } from './motifs';

const motif = starterMotif();

describe('chart text', () => {
	it('writes a header, the colours by name, a key and 16 rows of 12', () => {
		const lines = chartToText('Hearts', motif, '#465e9d', '#faf3dc').split('\n');
		expect(lines.slice(0, 4)).toEqual(['Knit It pattern: Hearts', 'Main colour: Denim (#465e9d)', 'Pattern colour: Cream (#faf3dc)', '# = pattern colour, . = main colour']);
		expect(lines.slice(4)).toHaveLength(16);
		expect(lines.slice(4).every((l) => /^[#.]{12}$/.test(l))).toBe(true);
	});

	it('reads back exactly what it wrote', () => {
		const parsed = parseChartText(chartToText('Hearts', motif, '#465e9d', '#faf3dc'));
		expect(parsed).toEqual({ ok: true, chart: { name: 'Hearts', motif, color: '#465e9d', contrast: '#faf3dc' } });
	});

	it('takes only the rows, in other symbols, with spaces and stray lines', () => {
		const rows = Array.from({ length: 16 }, (_, j) => (j === 0 ? 'X - - - - - - - - - - X' : '- - - - - - - - - - - -'));
		const parsed = parseChartText(`hey, here's that chart\n\n${rows.join('\n')}\n\nenjoy!`);
		expect(parsed.ok && parsed.chart.motif).toBe('1' + '0'.repeat(10) + '1' + '0'.repeat(180));
		expect(parsed.ok && parsed.chart.name).toBeUndefined();
	});

	it('takes the bare noughts-and-ones form', () => {
		expect(parseChartText(` ${motif} `)).toEqual({ ok: true, chart: { motif } });
	});

	it('takes a colour by name and ignores one outside the palette', () => {
		const rows = Array(16).fill('.'.repeat(12)).join('\n');
		const parsed = parseChartText(`Main colour: forest\nPattern colour: #123456\n${rows}`);
		expect(parsed).toEqual({ ok: true, chart: { motif: blankMotif(), color: '#2f5a48' } });
	});

	it('says what is wrong with a chart it cannot read', () => {
		const row = '.'.repeat(12);
		expect(parseChartText('')).toEqual({ ok: false, error: 'Paste a chart first.' });
		expect(parseChartText('just some words')).toMatchObject({ ok: false, error: expect.stringMatching(/No chart found/) });
		expect(parseChartText(Array(15).fill(row).join('\n'))).toMatchObject({ ok: false, error: 'Found 15 rows. A chart needs 16 rows.' });
		expect(parseChartText([row, '.'.repeat(11), ...Array(14).fill(row)].join('\n'))).toMatchObject({ ok: false, error: 'Row 2 has 11 stitches. Every row needs 12.' });
	});
});

describe('fine chart text', () => {
	it('round-trips a 24 × 32 chart', async () => {
		const { chartToText, parseChartText } = await import('./chartText');
		const { starterMotif, FINE_TILE } = await import('./motifs');
		const m = starterMotif(FINE_TILE);
		const text = chartToText('Fine hearts', m, '#465e9d', '#faf3dc');
		expect(text.split('\n').filter((l) => /^[#.]{24}$/.test(l))).toHaveLength(32);
		const r = parseChartText(text);
		expect(r.ok && r.chart.motif).toBe(m);
		expect(parseChartText(m)).toMatchObject({ ok: true });
		const bad = parseChartText(text.split('\n').slice(0, -1).join('\n'));
		expect(bad.ok).toBe(false);
	});
});
