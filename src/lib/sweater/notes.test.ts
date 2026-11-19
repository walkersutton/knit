import { describe, expect, it } from 'vitest';
import { cleanNotes, NOTES_MAX, parseLibrary } from './library';
import { starterMotif } from './motifs';

describe('chart and pattern notes', () => {
	it('keeps plain text with Unix line ends, trimmed and capped', () => {
		expect(cleanNotes('  Worsted, 4.5 mm\r\nfor Sam\r ')).toBe('Worsted, 4.5 mm\nfor Sam');
		expect(cleanNotes('x'.repeat(NOTES_MAX + 50))).toHaveLength(NOTES_MAX);
		expect(cleanNotes(42)).toBe('');
		expect(cleanNotes(null)).toBe('');
	});
	it('a stored chart keeps its notes, and a chart without any gets no empty field', () => {
		const motif = starterMotif();
		const lib = parseLibrary({ patterns: [{ id: 'a', name: 'Hearts', motif, notes: ' Use the red. ' }, { id: 'b', name: 'Plain', motif, notes: '   ' }] });
		expect(lib.patterns[0]).toEqual({ id: 'a', name: 'Hearts', motif, notes: 'Use the red.' });
		expect(lib.patterns[1]).toEqual({ id: 'b', name: 'Plain', motif });
	});
});
