import * as THREE from 'three';
import type { Design, Garment, Measurements } from '../garment';
import { knitAt, lerp, se, sheet, smooth, TAU, wob } from '../mesh';
import { fabricScale, finishGarment, type GarmentParts } from './common';

/** One cross-section of the sock: a centre, its frame (side `n`, front/top `b`), half-width, half-height and heel bulge. */
type Ring = { c: THREE.Vector3; n: THREE.Vector3; b: THREE.Vector3; rx: number; ry: number; e: number; heel: number; instep: number; s: number };

/**
 * A pair of socks standing side by side, as if on invisible feet: a ribbed cuff, the leg, a cupped heel that turns
 * the corner, a foot that is wider than it is tall with the sole on the floor, and a closed toe (a flat wedge when
 * grafted, a rounder point when drawn closed).
 */
export function buildSocks(d: Design, m: Measurements): Garment {
	const { wraps, vOf, k } = fabricScale(d, m);
	const circ = m.sockCirc ?? m.chest;
	const legLen = m.legLen ?? 16 * k;
	const footLen = m.footLen ?? 25 * k;
	const toeLen = m.toeLen ?? footLen * 0.22;
	const cuffLen = m.cuffLen ?? 5 * k;
	const R = circ / TAU;
	const knee = d.sockLength === 'Knee';
	const flap = d.heel === 'Flap';
	const wedge = d.toe === 'Grafted';
	const SC = 56;

	// The foot is wider than it is tall, its sole resting on y = 0.
	const footW = R * 1.0;
	const footH = R * 0.9;
	// The heel turns a tight corner; the instep gives way so the fabric does not fold through itself.
	const rho = R * 0.72;
	const footY = footH;
	const ankleY = footY + rho;
	const topY = ankleY + legLen + cuffLen;
	const footRun = Math.max(2 * k, footLen - R - rho - toeLen);

	const rings: Ring[] = [];
	const push = (c: THREE.Vector3, tangent: THREE.Vector3, rx: number, ry: number, e: number, heel = 0, instep = 1) => {
		const n = new THREE.Vector3(1, 0, 0);
		// `b` points to the front of the leg and the top of the foot; a = 0 lies opposite, at the back and the sole.
		const b = new THREE.Vector3(0, tangent.z, -tangent.y).normalize();
		const prev = rings.at(-1);
		rings.push({ c, n, b, rx, ry, e, heel, instep, s: prev ? prev.s + prev.c.distanceTo(c) : 0 });
	};
	const down = new THREE.Vector3(0, -1, 0);

	// Cuff and leg: a calf for knee socks, narrowing to the ankle.
	const legTop = knee ? 1.12 : 1.02;
	const CUFF = 7;
	for (let j = 0; j < CUFF; j++) {
		const t = j / (CUFF - 1);
		const r = R * legTop * (0.97 + 0.01 * Math.sin(Math.PI * t));
		push(new THREE.Vector3(0, topY - t * cuffLen, 0), down, r, r, 2);
	}
	const cuffRows = rings.length;
	const LEG = knee ? 34 : 22;
	for (let j = 1; j <= LEG; j++) {
		const t = j / LEG;
		const calf = knee ? 1 + 0.05 * Math.sin(Math.PI * Math.min(1, t * 1.8)) : 1;
		const r = R * lerp(legTop * calf, 0.9, smooth(0.35, 1, t));
		push(new THREE.Vector3(0, topY - cuffLen - t * legLen, 0), down, r, r, 2);
	}

	// The heel: a quarter turn from the leg into the foot, cupped out behind.
	const HEEL = 16;
	for (let j = 1; j <= HEEL; j++) {
		const phi = (j / HEEL) * (Math.PI / 2);
		const t = j / HEEL;
		const c = new THREE.Vector3(0, ankleY - rho * Math.sin(phi), rho * (1 - Math.cos(phi)));
		const tangent = new THREE.Vector3(0, -Math.cos(phi), Math.sin(phi));
		const cup = Math.pow(Math.sin(Math.PI * t), 1.2) * (flap ? 0.6 : 0.45);
		const ry = lerp(R * 0.9, footH, smooth(0, 1, t));
		push(c, tangent, lerp(R * 0.9, footW, t), ry, lerp(2, 2.5, t), cup, Math.min(1, (rho * 0.92) / ry + (1 - Math.sin(Math.PI * t))));
	}

	// The foot, straight to the toe.
	const forward = new THREE.Vector3(0, 0, 1);
	const FOOT = 16;
	for (let j = 1; j <= FOOT; j++) {
		const t = j / FOOT;
		push(new THREE.Vector3(0, footY, rho + footRun * t), forward, footW * (1 + 0.03 * Math.sin(Math.PI * t)), footH, 2.5);
	}

	// The toe closes to a point, its sole staying on the floor.
	const TOE = 16;
	for (let j = 1; j <= TOE; j++) {
		const t = j / TOE;
		const wx = wedge ? Math.sqrt(Math.max(0, 1 - Math.pow(t, 3.2))) * (1 - 0.2 * t) : Math.sqrt(Math.max(0, 1 - Math.pow(t, 2.2)));
		const wy = wedge ? Math.sqrt(Math.max(0, 1 - Math.pow(t, 1.7))) * (1 - 0.15 * t) : Math.sqrt(Math.max(0, 1 - Math.pow(t, 2.2)));
		push(new THREE.Vector3(0, footH * Math.max(wy, 0.02), rho + footRun + toeLen * t), forward, footW * wx, footH * wy, wedge ? 2.6 : 2.2);
	}

	const total = rings.at(-1)!.s;
	const ringPoint = (ring: Ring, i: number, out: THREE.Vector3) => {
		const a = (i / SC) * TAU;
		const back = Math.max(0, Math.cos(a));
		const bulge = Math.cos(a) > 0 ? 1 + ring.heel * Math.pow(back, 2) : lerp(1, ring.instep, Math.pow(-Math.cos(a), 1.5));
		const wobble = 1 + 0.012 * wob(Math.sin(a) * 2, ring.s / (5 * k), Math.cos(a) * 2);
		return out
			.copy(ring.c)
			.addScaledVector(ring.n, -se(Math.sin(a), ring.e) * ring.rx * wobble)
			.addScaledVector(ring.b, -se(Math.cos(a), ring.e) * ring.ry * bulge * wobble);
	};
	const tube = (from: number, to: number) =>
		sheet(
			SC,
			to - from,
			(i, j, out) => ringPoint(rings[from + j], i, out),
			(i, j) => [(i / SC) * wraps(circ), vOf(rings[from + j].s)],
			(_i, j, out) => out.copy(rings[from + j].c),
			true,
			(i, j, p) => {
				const a = (i / SC) * TAU;
				const ring = rings[from + j];
				return 1 - 0.1 * Math.max(0, Math.cos(a)) - 0.06 * (1 - ring.s / total) + 0.08 * ring.heel * Math.max(0, Math.cos(a)) + 0.025 * wob(p.x / (2 * k), p.y / (2 * k), p.z / (2 * k));
			}
		);

	const body = knitAt(tube(cuffRows - 1, rings.length - 1), 0, (j) => (2 * rings[cuffRows - 1 + j].s) / total, SC);
	const cuff = knitAt(tube(0, cuffRows - 1), 0, (j) => (2 * rings[j].s) / total, SC);

	// Stand the pair in profile, toes to the left, the second a step behind and along.
	const fabric: THREE.BufferGeometry[] = [];
	const ribs: { kind: string; geometry: THREE.BufferGeometry }[] = [];
	const turn = new THREE.Matrix4().makeRotationY(-Math.PI / 2);
	const placements: [number, number][] = [
		[-footLen * 0.14, R * 1.3],
		[footLen * 0.14, -R * 1.3]
	];
	placements.forEach(([x, z], piece) => {
		const place = (g: THREE.BufferGeometry) => {
			const copy = g.clone().applyMatrix4(turn);
			const knit = copy.getAttribute('knit') as THREE.BufferAttribute;
			for (let v = 0; v < knit.count; v++) knit.setX(v, piece);
			return copy.translate(x, 0, z);
		};
		fabric.push(place(body));
		ribs.push({ kind: d.sockRib, geometry: place(cuff) });
	});

	const parts: GarmentParts = {
		fabric,
		ribs,
		wraps: wraps(circ),
		pieces: ['sock1', 'sock2'],
		whole: [2, 2],
		bodyWhen: (y) => Math.min(2, Math.max(0, (topY - y) / legLen))
	};
	return finishGarment(parts);
}
