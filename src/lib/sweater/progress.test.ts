import { describe, expect, it } from 'vitest';
import { writePattern } from './pattern';
import { doneOf, isDone, knittedOf, progressAt, signature, summarize, tasksOf } from './progress';
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
			if (!p.ok || p.construction !== 'Raglan') continue;
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

describe('knittedOf', () => {
	const sections = sectionsOf();
	const tasks = tasksOf(sections);
	const upTo = (n: number) => Object.fromEntries(tasks.slice(0, n).map((t) => [t.key, t.total]));
	const first = (section: string, pass = 0) => tasks.findIndex((t) => t.section === section && t.pass === pass);

	it('is nothing before the cast-on and everything at the end', () => {
		expect(knittedOf(sections, {})).toBeNull();
		expect(knittedOf(sections, upTo(tasks.length))).toMatchObject({ yoke: 1, body: 1, sleeves: [1, 1], neck: 1, bands: 0 });
		const cardigan = sectionsOf({ ...baseDesign, garment: 'Cardigan' });
		expect(knittedOf(cardigan, Object.fromEntries(tasksOf(cardigan).map((t) => [t.key, t.total])))!.bands).toBe(1);
	});

	it('grows piece by piece in knitting order', () => {
		let last = 0;
		for (let n = 1; n <= tasks.length; n++) {
			const k = knittedOf(sections, upTo(n))!;
			const sum = k.yoke + k.body + k.sleeves[0] + k.sleeves[1] + k.neck;
			expect(sum).toBeGreaterThanOrEqual(last);
			last = sum;
		}
		expect(knittedOf(sections, upTo(1))).toMatchObject({ body: 0, sleeves: [0, 0], neck: 0 });
		expect(knittedOf(sections, upTo(1))!.yoke).toBeGreaterThan(0);
		expect(knittedOf(sections, upTo(first('body')))).toMatchObject({ yoke: 1, body: 0 });
		expect(knittedOf(sections, upTo(first('sleeves', 1)))).toMatchObject({ body: 1, sleeves: [1, 0], neck: 0 });
	});

	it('follows the round counter part-way through a step', () => {
		const counted = tasks.find((t) => t.section === 'yoke' && t.total > 3)!;
		const p = upTo(tasks.indexOf(counted));
		const before = knittedOf(sections, p)!.yoke;
		p[counted.key] = 2;
		const during = knittedOf(sections, p)!.yoke;
		p[counted.key] = counted.total;
		expect(during).toBeGreaterThan(before);
		expect(knittedOf(sections, p)!.yoke).toBeGreaterThan(during);
	});

	it('takes a later step as proof of the fabric before it', () => {
		const until = tasks.find((t) => t.section === 'body')!;
		const k = knittedOf(sections, { [until.key]: 1 })!;
		expect(k.yoke).toBe(1);
		expect(k.body).toBeGreaterThan(0.5);
		expect(k.body).toBeLessThan(1);
	});

	it('gives every knitted piece a length, for every design', () => {
		for (const d of [...singleVariations(), ...randomDesigns(200, 5)]) {
			const p = writePattern(d);
			if (!p.ok) continue;
			const all = Object.fromEntries(tasksOf(p.sections).map((t) => [t.key, t.total]));
			const k = knittedOf(p.sections, all);
			expect(k).not.toBeNull();
			if (['Beanie', 'Socks', 'Scarf'].includes(d.garment)) {
				expect(Object.values(k!.parts).some((v) => v > 0)).toBe(true);
			} else {
				expect(k).toMatchObject({ yoke: 1, body: 1, sleeves: d.garment === 'Slipover' ? [0, 0] : [1, 1], neck: 1, bands: d.garment === 'Cardigan' ? 1 : 0 });
			}
			for (const s of p.sections) for (const step of s.steps) expect(step.adds ?? 0).toBeGreaterThanOrEqual(0);
		}
	});

	it('counts a whole sock across all its sections and keeps the two socks separate', () => {
		const sections = sectionsOf({ ...baseDesign, garment: 'Socks' });
		const tasks = tasksOf(sections);
		const upTo = (n: number) => Object.fromEntries(tasks.slice(0, n).map((t) => [t.key, t.total]));
		const first = tasks.filter((t) => t.pass === 0);
		const firstPass = (n: number) => Object.fromEntries(first.slice(0, n).map((t) => [t.key, t.total]));
		const beforeFoot = knittedOf(sections, firstPass(first.findIndex((t) => t.section === 'foot')))!;
		// Cuff, leg and heel are a little under half a crew sock's length.
		expect(beforeFoot.parts.sock1).toBeGreaterThan(0.4);
		expect(beforeFoot.parts.sock1).toBeLessThan(1);
		expect(beforeFoot.parts.sock2).toBe(-1);
		const both = knittedOf(sections, upTo(tasks.length))!;
		expect(both.parts.sock1).toBeCloseTo(1);
		expect(both.parts.sock2).toBeCloseTo(1);
	});
});

describe('progressAt', () => {
	const sections = sectionsOf();
	const tasks = tasksOf(sections);

	it('is the place of someone who has just finished that step', () => {
		const at = tasks.findIndex((t) => t.section === 'body');
		const p = progressAt(tasks, tasks[at].key);
		expect(Object.keys(p)).toEqual(tasks.slice(0, at + 1).map((t) => t.key));
		expect(summarize(tasks, p)).toMatchObject({ done: at + 1, current: tasks[at + 1] });
		expect(knittedOf(sections, p)).toMatchObject({ yoke: 1, sleeves: [0, 0], neck: 0 });
		expect(progressAt(tasks, 'nothing.0.0')).toEqual({});
	});

	it('shows a step part-way through when its rounds are being counted', () => {
		const counted = tasks.find((t) => t.section === 'yoke' && t.total > 3)!;
		expect(progressAt(tasks, counted.key)[counted.key]).toBe(counted.total);
		expect(progressAt(tasks, counted.key, { [counted.key]: 2 })[counted.key]).toBe(2);
		const whole = knittedOf(sections, progressAt(tasks, counted.key))!.yoke;
		expect(knittedOf(sections, progressAt(tasks, counted.key, { [counted.key]: 2 }))!.yoke).toBeLessThan(whole);
	});
});

describe('signature', () => {
	it('ignores colours but not anything that changes the pattern', () => {
		expect(signature({ ...baseDesign, color: '#000000', contrast: '#ffffff' })).toBe(signature(baseDesign));
		expect(signature({ ...baseDesign, size: 'L' })).not.toBe(signature(baseDesign));
		expect(signature({ ...baseDesign, gauge: 22 })).not.toBe(signature(baseDesign));
		// A different main needle changes the gauge; a different ribbing needle changes no step.
		expect(signature({ ...baseDesign, needle: 4.5 })).not.toBe(signature(baseDesign));
		expect(signature({ ...baseDesign, ribNeedle: 3.5 })).toBe(signature(baseDesign));
	});

	it('keeps an old top\'s place when accessory fields are added, but follows accessory choices', () => {
		const accessoryFields = new Set(['hatLength', 'crown', 'pomPom', 'brimFinish', 'brimRib', 'brimLength', 'sockLength', 'shoeSize', 'heel', 'toe', 'sockRib', 'sockCuff', 'scarfWidth', 'scarfLength', 'scarfEnds', 'fringe']);
		const oldTop = Object.fromEntries(Object.entries(baseDesign).filter(([key]) => !accessoryFields.has(key)));
		expect(signature(oldTop as typeof baseDesign)).toBe(signature(baseDesign));
		const hat = { ...baseDesign, garment: 'Beanie' };
		expect(signature({ ...hat, crown: 'Gathered' })).not.toBe(signature(hat));
		expect(signature({ ...hat, neckline: 'V-neck' })).toBe(signature(hat));
	});
});

describe('design links', () => {
	it('round-trips a design and rejects anything else', async () => {
		const { encodeDesign, decodeDesign } = await import('./progress');
		const { randomDesign, seeded } = await import('./random');
		const like = randomDesign(seeded(1));
		for (let i = 2; i < 40; i++) {
			const d = randomDesign(seeded(i));
			expect(decodeDesign(encodeDesign(d), like)).toEqual(d);
		}
		expect(decodeDesign('nonsense', like)).toBeUndefined();
		expect(decodeDesign(encodeDesign({ ...like, fit: 'Nope' }), like)).toBeUndefined();
	});
});
