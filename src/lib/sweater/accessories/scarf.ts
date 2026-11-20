import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { Design, Garment, Measurements } from '../garment';
import { knitAt, lerp, sheet, wob } from '../mesh';
import { accessoryScale, fabricScale, finishGarment, type GarmentParts } from './common';

/** A flat scarf with soft ripples, optional ribbed ends and optional fringe. */
export function buildScarf(d: Design, m: Measurements): Garment {
	const { wraps, vOf, k } = fabricScale(d, m);
	const W = m.scarfW ?? m.chest;
	const L = m.scarfL ?? m.L;
	const fringe = m.fringeLen ?? 0;
	const COLS = 64;
	const ribbedEnds = d.scarfEnds === 'Ribbed';
	const end = Math.min(L / 4, 4 * k);

	const point = (x: number, y: number, out: THREE.Vector3) => {
		const edgeCurl = Math.pow(Math.abs(x) / (W / 2), 3) * 0.55 * k;
		out.set(x, y, 0.6 * k * Math.sin(y / (9 * k) + x / (5 * k)) + 0.3 * k * wob(x / (4 * k), y / (7 * k), 0.7) + edgeCurl);
	};
	const panel = (from: number, to: number, rows: number) =>
		sheet(
			COLS,
			rows,
			(i, j, out) => point(lerp(-W / 2, W / 2, i / COLS), lerp(from, to, j / rows), out),
			(i, j) => [(i / COLS) * wraps(W), vOf(lerp(from, to, j / rows))],
			(i, j, out) => out.set(lerp(-W / 2, W / 2, i / COLS), lerp(from, to, j / rows), -5 * k),
			false,
			(i, j, p) => 1 - 0.08 * (1 - j / rows) + 0.05 * wob(p.x / (5 * k), p.y / (5 * k), p.z)
		);

	const fabric: THREE.BufferGeometry[] = [];
	const ribEnds: THREE.BufferGeometry[] = [];
	const addPanel = (from: number, to: number, rows: number) => {
		const g = knitAt(panel(from, to, rows), 0, (j) => lerp(from, to, j / rows) / L, COLS);
		(ribbedEnds && (from === 0 || to === L) ? ribEnds : fabric).push(g);
	};
	if (ribbedEnds) {
		addPanel(0, end, 6);
		addPanel(end, L - end, 36);
		addPanel(L - end, L, 6);
	} else addPanel(0, L, 48);

	const trim: THREE.BufferGeometry[] = [];
	if (fringe > 0) {
		const N = 26;
		const fringeSheet = (atEnd: boolean) =>
			sheet(
				N * 2,
				4,
				(i, j, out) => {
					const strand = Math.floor(i / 2);
					const x = lerp(-W / 2 + W / (N * 2), W / 2 - W / (N * 2), strand / (N - 1));
					const y = atEnd ? L + (j / 4) * fringe : -(j / 4) * fringe;
					out.set(x, y, 0.4 * k * Math.sin(strand * 1.7 + j * 0.6));
				},
				(i, j) => [(i / (N * 2)) * wraps(W), vOf((j / 4) * fringe)],
				(_i, j, out) => out.set(0, atEnd ? L + (j / 4) * fringe : -(j / 4) * fringe, -5 * k),
				false
			);
		trim.push(knitAt(fringeSheet(false), 1, (j) => j / 4, N * 2), knitAt(fringeSheet(true), 1, (j) => j / 4, N * 2));
	}

	const parts: GarmentParts = {
		fabric,
		ribs: ribbedEnds ? [{ kind: d.scarfEnds, geometry: mergeGeometries(ribEnds)! }] : [],
		trim,
		wraps: wraps(W),
		pieces: fringe > 0 ? ['scarf', 'fringe'] : ['scarf'],
		whole: fringe > 0 ? [1, 1] : [1],
		bodyWhen: (y) => Math.min(1, Math.max(0, y / L)),
		scale: accessoryScale(m)
	};
	return finishGarment(parts);
}
