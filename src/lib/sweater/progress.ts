import type { Design } from './garment';
import { sections } from './options';
import type { PatternSection, Step } from './pattern';

/**
 * A knitter's place in a pattern.
 *
 * Progress is a number per step: rounds done for a step with a tally, otherwise 1 once ticked off.
 */
export type Progress = Record<string, number>;

/** One thing to do and tick off. Sections worked twice (sleeves) give one task per pass. */
export type Task = { key: string; section: string; pass: number; index: number; step: Step; total: number };

export const stepKey = (section: string, pass: number, index: number) => `${section}.${pass}.${index}`;

/** Every step to tick off, in knitting order. */
export function tasksOf(sections: PatternSection[]): Task[] {
	const out: Task[] = [];
	for (const s of sections)
		for (let pass = 0; pass < (s.twice ? 2 : 1); pass++)
			s.steps.forEach((step, index) => {
				if (!step.note) out.push({ key: stepKey(s.id, pass, index), section: s.id, pass, index, step, total: step.tally?.rows.length || 1 });
			});
	return out;
}

export const doneOf = (t: Task, p: Progress) => Math.min(t.total, Math.max(0, p[t.key] ?? 0));
export const isDone = (t: Task, p: Progress) => doneOf(t, p) >= t.total;

/** Steps finished, steps in all, and the first one still to do. */
export function summarize(tasks: Task[], p: Progress) {
	const done = tasks.filter((t) => isDone(t, p)).length;
	return { done, total: tasks.length, current: tasks.find((t) => !isDone(t, p)) };
}

/**
 * Identifies the written pattern a design produces. Colours are left out: they do not change the
 * steps, so recolouring a sweater keeps your place.
 */
export const signature = (d: Design) =>
	Object.entries(d)
		.filter(([key]) => key !== 'color' && key !== 'contrast')
		.sort(([a], [b]) => a.localeCompare(b))
		.map(([key, value]) => `${key}=${value}`)
		.join('|');

// ── Saved on this device ────────────────────────────────────────────────
export type Mode = 'concise' | 'beginner';
export type Saved = { design?: Design; mode?: Mode; progress: Record<string, Progress> };

const KEY = 'knit-it:v1';
/** Patterns to remember progress for; the least recently touched are dropped first. */
const KEEP = 6;

/** A saved design is only used if it has exactly the default's fields, each set to an option the designer still offers. */
function validDesign(value: unknown, like: Design): value is Design {
	if (!value || typeof value !== 'object') return false;
	const v = value as Record<string, unknown>;
	const keys = Object.keys(like);
	const fields = sections.flatMap((s) => s.groups).flatMap((g) => g.fields);
	return Object.keys(v).length === keys.length && keys.every((key) => key in v) && fields.every((f) => f.options.some((o) => o.value === v[f.key]));
}

export function load(like: Design): Saved {
	const empty: Saved = { progress: {} };
	try {
		const raw = JSON.parse(localStorage.getItem(KEY) ?? 'null');
		if (!raw || typeof raw !== 'object') return empty;
		const progress: Record<string, Progress> = {};
		for (const [sig, p] of Object.entries(raw.progress ?? {})) {
			if (!p || typeof p !== 'object') continue;
			const clean = Object.entries(p).filter(([, n]) => typeof n === 'number' && n > 0);
			if (clean.length) progress[sig] = Object.fromEntries(clean);
		}
		return { design: validDesign(raw.design, like) ? raw.design : undefined, mode: raw.mode === 'concise' || raw.mode === 'beginner' ? raw.mode : undefined, progress };
	} catch {
		return empty; // Private windows and blocked storage: carry on without saving.
	}
}

export function save(saved: Saved, current: string) {
	try {
		// Keep the current pattern last, so it is the last to be dropped.
		const entries = Object.entries(saved.progress).filter(([sig, p]) => sig !== current && Object.keys(p).length);
		const progress = Object.fromEntries(entries.slice(-(KEEP - 1)));
		if (saved.progress[current] && Object.keys(saved.progress[current]).length) progress[current] = saved.progress[current];
		localStorage.setItem(KEY, JSON.stringify({ ...saved, progress }));
	} catch {
		// Nothing to do: the page works without it.
	}
}
