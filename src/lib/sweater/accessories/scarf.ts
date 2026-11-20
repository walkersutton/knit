import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { Design, Garment, Measurements } from '../garment';
import { flip, knitAt, lerp, sheet, smooth, wob } from '../mesh';
import { fabricScale, finishGarment, type GarmentParts } from './common';

/**
 * A scarf hung over an invisible rail: folded a little off centre, with the shorter tail in front and the longer
 * one behind and to the side, both rippling softly. Ribbed ends and fringe hang at the bottom of each tail.
 */
export function buildScarf(d: Design, m: Measurements): Garment {
	const { wraps, vOf, k } = fabricScale(d, m);
	const W = m.scarfW ?? m.chest;
	const L = m.scarfL ?? m.L;
	const fringe = m.fringeLen ?? 0;
	const COLS = 40;
	const ribbedEnds = d.scarfEnds === 'Ribbed';
	const end = Math.min(L / 4, 4 * k);

	// The path along the scarf's length: up the front tail, over the fold, down the back tail.
	const fold = 1.6 * k;
	const arc = Math.PI * fold;
	const front = L * 0.44;
	const back = L - front - arc;
	const top = Math.max(front, back);
	const drift = W * 0.42; // the back tail sits to the side, so both tails show
	const centre = (s: number, out: THREE.Vector3, normal: THREE.Vector3) => {
		if (s <= front) {
			const y = top - (front - s);
			// The tails sway a little as they hang.
			out.set(-drift / 2 + 0.06 * W * Math.sin((top - y) / (22 * k)), y, fold);
			normal.set(0, 0, 1);
		} else if (s <= front + arc) {
			const phi = ((s - front) / arc) * Math.PI;
			out.set(lerp(-drift / 2, drift / 2, smooth(0, 1, phi / Math.PI)), top + fold * Math.sin(phi), fold * Math.cos(phi));
			normal.set(0, Math.sin(phi), Math.cos(phi));
		} else {
			const y = top - (s - front - arc);
			out.set(drift / 2 - 0.05 * W * Math.sin((top - y) / (26 * k)), y, -fold);
			normal.set(0, 0, -1);
		}
		return out;
	};

	const c = new THREE.Vector3();
	const nrm = new THREE.Vector3();
	const point = (x: number, s: number, out: THREE.Vector3) => {
		centre(s, c, nrm);
		// Gentle lengthwise ripples, more towards the hanging ends, and edges that curl slightly in.
		const hang = Math.min(Math.abs(s - front - arc / 2), L) / (12 * k);
		const ripple = 0.8 * k * Math.min(1, hang) * Math.sin(s / (7 * k) + x / (6 * k)) + 0.25 * k * wob(x / (4 * k), s / (8 * k), 0.7);
		const curl = Math.pow(Math.abs(x) / (W / 2), 3) * 0.5 * k;
		// Over the fold the fabric bunches a little narrower.
		const gather = 1 - 0.12 * Math.max(0, 1 - Math.abs(s - front - arc / 2) / (arc * 1.5));
		return out.set(c.x + x * gather, c.y, c.z).addScaledVector(nrm, ripple - curl);
	};
	const inside = (x: number, s: number, out: THREE.Vector3) => {
		centre(s, out, nrm);
		return out.set(out.x + x, out.y, 0).addScaledVector(nrm, -5 * k);
	};
	const panel = (from: number, to: number, rows: number) =>
		sheet(
			COLS,
			rows,
			(i, j, out) => point(lerp(-W / 2, W / 2, i / COLS), lerp(from, to, j / rows), out),
			(i, j) => [(i / COLS) * wraps(W), vOf(lerp(from, to, j / rows))],
			(i, j, out) => inside(lerp(-W / 2, W / 2, i / COLS), lerp(from, to, j / rows), out),
			false,
			(i, j, p) => {
				const s = lerp(from, to, j / rows);
				const behind = s > front + arc ? 0.04 : 0;
				return 1 - behind - 0.06 * Math.abs(i / COLS - 0.5) + 0.05 * wob(p.x / (5 * k), p.y / (5 * k), p.z);
			}
		);

	const fabric: THREE.BufferGeometry[] = [];
	const ribEnds: THREE.BufferGeometry[] = [];
	const rowsFor = (len: number) => Math.max(4, Math.round(len / (1.2 * k)));
	const addPanel = (from: number, to: number) => {
		const rows = rowsFor(to - from);
		const g = knitAt(panel(from, to, rows), 0, (j) => lerp(from, to, j / rows) / L, COLS);
		// A scarf has no inside: its reverse is knitted fabric too, a hair behind the front.
		const reverse = g.clone();
		flip(reverse);
		const pos = reverse.getAttribute('position') as THREE.BufferAttribute;
		const nor = reverse.getAttribute('normal') as THREE.BufferAttribute;
		for (let v = 0; v < pos.count; v++) pos.setXYZ(v, pos.getX(v) + nor.getX(v) * 0.06 * k, pos.getY(v) + nor.getY(v) * 0.06 * k, pos.getZ(v) + nor.getZ(v) * 0.06 * k);
		(ribbedEnds && (from === 0 || to === L) ? ribEnds : fabric).push(g, reverse);
	};
	if (ribbedEnds) {
		addPanel(0, end);
		addPanel(end, L - end);
		addPanel(L - end, L);
	} else addPanel(0, L);

	const trim: THREE.BufferGeometry[] = [];
	if (fringe > 0) {
		// Tassels of yarn knotted along each end, hanging straight down with a little sway.
		const strands = Math.max(8, Math.round(W / (1.1 * k)));
		const strandR = 0.32 * Math.sqrt(k);
		const tail = (s: number) => {
			const geos: THREE.BufferGeometry[] = [];
			for (let t = 0; t < strands; t++) {
				const x = lerp(-W / 2 + W / (strands * 2), W / 2 - W / (strands * 2), t / (strands - 1));
				const root = point(x, s, new THREE.Vector3());
				const len = fringe * (0.92 + 0.16 * Math.abs(Math.sin(t * 12.9898)));
				const g = new THREE.CylinderGeometry(strandR, strandR * 0.8, len, 6, 4, false);
				g.translate(0, -len / 2, 0);
				g.rotateZ(0.06 * Math.sin(t * 2.3));
				g.rotateX(0.05 * Math.cos(t * 1.7));
				g.translate(root.x, root.y + 0.2 * k, root.z);
				geos.push(g);
			}
			return geos;
		};
		for (const g of [...tail(0), ...tail(L)]) trim.push(knitAt(g, 1, 1));
	}

	const parts: GarmentParts = {
		fabric,
		ribs: ribbedEnds ? [{ kind: d.scarfEnds, geometry: mergeGeometries(ribEnds)! }] : [],
		trim,
		wraps: wraps(W),
		pieces: fringe > 0 ? ['scarf', 'fringe'] : ['scarf'],
		whole: fringe > 0 ? [1, 1] : [1],
		bodyWhen: (y) => Math.min(1, Math.max(0, (top - y) / top))
	};
	return finishGarment(parts);
}
