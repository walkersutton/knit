import * as THREE from 'three';
import type { Design, Garment, Measurements } from '../garment';
import { knitAt, mirrorX, sheet, smooth, TAU } from '../mesh';
import { accessoryScale, fabricScale, finishGarment, type GarmentParts } from './common';

type Ring = { c: THREE.Vector3; r: number; v: number; when: number; n: THREE.Vector3; b: THREE.Vector3 };

/** One sock, worked from the cuff down the leg, round the heel and along the foot to the toe. */
export function buildSocks(d: Design, m: Measurements): Garment {
	const { wraps, vOf, k } = fabricScale(d, m);
	const circ = m.sockCirc ?? m.chest;
	const legLen = m.legLen ?? 16 * k;
	const footLen = m.footLen ?? 25 * k;
	const heelLen = m.heelLen ?? footLen * 0.3;
	const toeLen = m.toeLen ?? footLen * 0.22;
	const cuffLen = m.cuffLen ?? 5 * k;
	const R = circ / TAU;
	const Rf = R * 1.05;
	const heelR = Math.max(2.5 * k, heelLen * 0.55);
	const footY = heelR;
	const legBottom = footY + heelR;
	const topY = legBottom + legLen;
	const footEndZ = heelR + Math.max(2 * k, footLen - heelR - toeLen);
	const totalV = cuffLen + legLen + heelLen + footLen;
	const SC = 48;

	const rings: Ring[] = [];
	const add = (count: number, vFrom: number, vTo: number, at: (t: number) => [number, number, number]) => {
		for (let j = 0; j < count; j++) {
			const t = j / (count - 1);
			const [y, z, r] = at(t);
			const v = vFrom + (vTo - vFrom) * t;
			rings.push({ c: new THREE.Vector3(0, y, z), r, v, when: (2 * v) / totalV, n: new THREE.Vector3(1, 0, 0), b: new THREE.Vector3(0, 0, 1) });
		}
	};
	// A ribbed cuff sits at the top of the leg; the heel is a soft right-angle turn into the foot.
	add(6, 0, cuffLen, (t) => [topY - t * cuffLen, 0, R * (1.03 - 0.03 * t)]);
	const cuffRows = rings.length;
	add(24, cuffLen, cuffLen + legLen, (t) => [topY - cuffLen - t * legLen, 0, R * (1 - 0.14 * smooth(0.4, 1, t))]);
	const turn = (t: number) => smooth(0, 1, t);
	add(12, cuffLen + legLen, cuffLen + legLen + heelLen, (t) => [legBottom - heelR * turn(t), heelR * turn(t), R * (0.86 + 0.19 * turn(t))]);
	add(18, cuffLen + legLen + heelLen, cuffLen + legLen + heelLen + (footEndZ - heelR), (t) => [footY, heelR + (footEndZ - heelR) * t, Rf]);
	add(10, cuffLen + legLen + heelLen + (footEndZ - heelR), totalV, (t) => [footY, footEndZ + toeLen * t, Rf * (1 - 0.88 * smooth(0, 1, t))]);

	for (let i = 0; i < rings.length; i++) {
		const a = rings[Math.max(0, i - 1)].c;
		const b = rings[Math.min(rings.length - 1, i + 1)].c;
		const t = new THREE.Vector3().subVectors(b, a).normalize();
		rings[i].b.set(0, t.z, -t.y).normalize();
	}

	const ringPoint = (ring: Ring, i: number, out: THREE.Vector3) => {
		const a = (i / SC) * TAU;
		out.copy(ring.c).addScaledVector(ring.n, -Math.sin(a) * ring.r).addScaledVector(ring.b, -Math.cos(a) * ring.r * 0.94);
	};
	const tube = (from: number, to: number) =>
		sheet(
			SC,
			to - from - 1,
			(i, j, out) => ringPoint(rings[from + j], i, out),
			(i, j) => [(i / SC) * wraps(circ), vOf(rings[from + j].v)],
			(_i, j, out) => out.copy(rings[from + j].c),
			true,
			(i, j, p) => {
				const a = (i / SC) * TAU;
				const inside = Math.max(0, Math.cos(a));
				return 1 - 0.12 * inside - 0.06 * (1 - j / (rings.length - 1)) + 0.03 * Math.sin(p.y / (2 * k) + a * 2);
			}
		);

	const fabric: THREE.BufferGeometry[] = [];
	const ribs: { kind: string; geometry: THREE.BufferGeometry }[] = [];
	const body = knitAt(tube(cuffRows, rings.length), 0, (j) => rings[cuffRows + j].when, SC);
	const cuff = knitAt(tube(0, cuffRows), 0, (j) => rings[j].when, SC);
	const offset = R * 2.4;
	for (const [piece, mirror] of [
		[0, false],
		[1, true]
	] as const) {
		const place = (g: THREE.BufferGeometry) => {
			const copy = mirror ? mirrorX(g) : g.clone();
			const knit = copy.getAttribute('knit') as THREE.BufferAttribute;
			for (let i = 0; i < knit.count; i++) knit.setX(i, piece);
			copy.translate((piece ? 1 : -1) * offset, 0, 0);
			return copy;
		};
		fabric.push(place(body));
		ribs.push({ kind: d.sockRib, geometry: place(cuff) });
	}

	const parts: GarmentParts = {
		fabric,
		ribs,
		wraps: wraps(circ),
		pieces: ['sock1', 'sock2'],
		whole: [2, 2],
		bodyWhen: (y) => Math.min(2, Math.max(0, (topY - y) / legLen)),
		scale: accessoryScale(m)
	};
	return finishGarment(parts);
}
