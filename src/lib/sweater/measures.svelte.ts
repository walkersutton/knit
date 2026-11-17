import { clamp, fromUnit, LIMITS, round, toUnit, type Custom, type Unit } from './fit';
import { measure, type Design } from './garment';

export type Key = keyof Custom;
export const ROWS: { key: Key; label: string; hint: string }[] = [
	{ key: 'chest', label: 'Chest', hint: 'Around the fullest part, under the arms.' },
	{ key: 'length', label: 'Body length', hint: 'Back of the neck down to where the hem should end.' },
	{ key: 'arm', label: 'Arm length', hint: 'Underarm to wrist, arm relaxed.' }
];
const UNIT_KEY = 'knit-it:unit';

/** The state and rules behind the custom measurements panel: units, typing, stepping, and the finished chest. */
export class Measures {
	unit = $state<Unit>('cm');
	/** What is typed in a box right now, so a half-typed number is never rewritten under the cursor. */
	draft = $state<Partial<Record<Key, string>>>({});
	#design: () => Design;

	constructor(design: () => Design) {
		this.#design = design;
		try {
			if (localStorage.getItem(UNIT_KEY) === 'in') this.unit = 'in';
		} catch {}
	}

	get design() {
		return this.#design();
	}
	cm = (key: Key) => this.design.custom![key];
	/** The value in the chosen unit. */
	value = (key: Key) => toUnit(this.cm(key), this.unit);
	text = (key: Key) => this.draft[key] ?? String(this.value(key));
	get step() {
		return this.unit === 'in' ? 0.5 : 1;
	}
	range = (key: Key) => ({ min: toUnit(LIMITS[key].min, this.unit), max: toUnit(LIMITS[key].max, this.unit) });
	atMin = (key: Key) => this.cm(key) <= LIMITS[key].min;
	atMax = (key: Key) => this.cm(key) >= LIMITS[key].max;

	setUnit(u: Unit) {
		this.unit = u;
		this.draft = {};
		try {
			localStorage.setItem(UNIT_KEY, u);
		} catch {}
	}
	/** Set a value given in the chosen unit. */
	put(key: Key, n: number) {
		this.design.custom = { ...this.design.custom!, [key]: round(clamp(key, fromUnit(n, this.unit))) };
	}
	/** Set exact cm (for presets). */
	putCm(c: Custom) {
		this.draft = {};
		this.design.custom = { ...c };
	}
	type(key: Key, text: string) {
		this.draft[key] = text;
		const cm = fromUnit(parseFloat(text.replace(',', '.')), this.unit);
		if (Number.isFinite(cm) && cm >= LIMITS[key].min && cm <= LIMITS[key].max) this.design.custom = { ...this.design.custom!, [key]: round(cm) };
	}
	commit(key: Key) {
		const n = parseFloat((this.draft[key] ?? '').replace(',', '.'));
		if (Number.isFinite(n)) this.put(key, n);
		delete this.draft[key];
	}
	nudge(key: Key, dir: 1 | -1, by = 1) {
		delete this.draft[key];
		this.put(key, this.value(key) + dir * this.step * by);
	}

	get finished() {
		return measure(this.design).chest;
	}
	get ease() {
		return this.finished - this.cm('chest');
	}
	len = (cm: number) => `${toUnit(cm, this.unit)} ${this.unit}`;
	signed = (cm: number) => `${cm < 0 ? '−' : '+'}${toUnit(Math.abs(cm), this.unit)} ${this.unit}`;
}

/** Press and hold to keep stepping: one step at once, then faster. Keyboard activation steps once. */
export function hold(node: HTMLElement, fn: () => void) {
	let delay: ReturnType<typeof setTimeout> | undefined;
	let every: ReturnType<typeof setInterval> | undefined;
	const stop = () => {
		clearTimeout(delay);
		clearInterval(every);
	};
	const down = (e: PointerEvent) => {
		if (e.button) return;
		fn();
		stop();
		delay = setTimeout(() => (every = setInterval(fn, 55)), 380);
	};
	const click = (e: MouseEvent) => {
		if (e.detail === 0) fn();
	};
	node.addEventListener('pointerdown', down);
	node.addEventListener('click', click);
	for (const t of ['pointerup', 'pointerleave', 'pointercancel', 'blur'] as const) node.addEventListener(t, stop);
	return {
		update(next: () => void) {
			fn = next;
		},
		destroy() {
			stop();
			node.removeEventListener('pointerdown', down);
			node.removeEventListener('click', click);
			for (const t of ['pointerup', 'pointerleave', 'pointercancel', 'blur'] as const) node.removeEventListener(t, stop);
		}
	};
}
