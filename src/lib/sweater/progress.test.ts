import { describe, expect, it } from 'vitest';
import { writePattern } from './pattern';
import { doneOf, isDone, signature, summarize, tasksOf } from './progress';
import { baseDesign, randomDesigns, singleVariations } from './testDesigns';

const sectionsOf = (d = baseDesign) => {
	const p = writePattern(d);
	if (!p.ok) throw new Error(p.reason);
	return p.sections;
};

describe('tasksOf', () => {
	it('lists the steps to tick off in knitting order, sleeves twice', () => {
		const sections = sectionsOf();
		const tasks = tasksOf(sections);
		expect(new Set(tasks.map((t) => t.key)).size).toBe(tasks.length);
		expect(tasks.every((t) => !t.step.note)).toBe(true);
		expect([...new Set(tasks.map((t) => t.section))]).toEqual(['yoke', 'body', 'sleeves', 'neck', 'finishing']);
		const sleeves = tasks.filter((t) => t.section === 'sleeves');
		expect(sleeves.filter((t) => t.pass === 0).length).toBe(sleeves.filter((t) => t.pass === 1).length);
		expect(sleeves.length).toBeGreaterThan(0);
	});

	it('counts every round of the yoke once', () => {
		for (const d of [...singleVariations(), ...randomDesigns(200, 3)]) {
			const p = writePattern(d);
			if (!p.ok) continue;
			const yoke = p.sections.find((s) => s.id === 'yoke')!;
			const tallies = yoke.steps.flatMap((s) => (s.tally ? [s.tally] : []));
			// Short rows are not numbered; everything after them is.
			expect(tallies.reduce((n, t) => n + t.rows.length, 0)).toBe(p.counts.yokeRows - 2 * p.counts.shortRowPairs);
			for (const s of p.sections) for (const step of s.steps) if (step.tally) expect(step.tally.rows.length).toBeGreaterThan(0);
		}
	});

	it('gives the sleeve decreases a round-by-round tally that matches the text', () => {
		const step = sectionsOf()
			.find((s) => s.id === 'sleeves')!
			.steps.find((s) => s.text.startsWith('Work a dec round'))!;
		const [every, times] = [...step.text.matchAll(/\*\*(\d+)\*\*/g)].map((m) => +m[1]);
		expect(step.tally!.rows.filter((r) => r === 'Dec round').length).toBe(times);
		expect(step.tally!.rows.length).toBe((times - 1) * every + 1);
		expect(step.tally!.rows[0]).toBe('Dec round');
		expect(step.tally!.rows.at(-1)).toBe('Dec round');
	});
});

describe('summarize', () => {
	it('finds the first step still to do', () => {
		const tasks = tasksOf(sectionsOf());
		expect(summarize(tasks, {})).toMatchObject({ done: 0, total: tasks.length, current: tasks[0] });
		const counted = tasks.find((t) => t.total > 1)!;
		const before = tasks.slice(0, tasks.indexOf(counted));
		const p = Object.fromEntries(before.map((t) => [t.key, t.total]));
		p[counted.key] = counted.total - 1;
		expect(summarize(tasks, p)).toMatchObject({ done: before.length, current: counted });
		expect(isDone(counted, p)).toBe(false);
		p[counted.key] = counted.total + 5;
		expect(isDone(counted, p)).toBe(true);
		expect(doneOf(counted, p)).toBe(counted.total);
		const all = Object.fromEntries(tasks.map((t) => [t.key, t.total]));
		expect(summarize(tasks, all)).toMatchObject({ done: tasks.length, current: undefined });
	});
});

describe('signature', () => {
	it('ignores colours but not anything that changes the pattern', () => {
		expect(signature({ ...baseDesign, color: '#000000', contrast: '#ffffff' })).toBe(signature(baseDesign));
		expect(signature({ ...baseDesign, size: 'L' })).not.toBe(signature(baseDesign));
		expect(signature({ ...baseDesign, gauge: 22 })).not.toBe(signature(baseDesign));
	});
});
