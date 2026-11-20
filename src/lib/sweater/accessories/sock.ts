import * as THREE from 'three';
import type { Design, Garment, Measurements } from '../garment';
import { knitAt, lerp, se, sheet, smooth, TAU, wob } from '../mesh';
import { fabricScale, finishGarment, type GarmentParts } from './common';

/**
 * One slice through the sock. It runs from `A` (the back of the leg, the heel, the sole) to `B` (the shin, the
 * instep, the top of the foot): `c` is its middle, `b` points from A to B, `n` points across. `rx` is the half-width,
 * `ry` half of |AB|; `e` and `eTop` shape the sole side and the top side (2 is round, more is flatter), and `taper`
 * narrows the top of the foot against the sole.
 */
type Ring = { c: THREE.Vector3; n: THREE.Vector3; b: THREE.Vector3; rx: number; ry: number; e: number; eTop: number; taper: number; heel: number; s: number };

/** Side view of the sock, as (y up, z towards the toe) pairs. */
type P2 = [number, number];

/** Where a ray from `o` along `d` first leaves through the polyline `line`. */
function hit(o: P2, d: P2, line: P2[]): P2 {
	let best = Infinity;
	for (let i = 0; i < line.length - 1; i++) {
		const [ay, az] = line[i];
		const ey = line[i + 1][0] - ay;
		const ez = line[i + 1][1] - az;
		const den = d[0] * ez - d[1] * ey;
		if (Math.abs(den) < 1e-12) continue;
		const t = ((ay - o[0]) * ez - (az - o[1]) * ey) / den;
		const u = ((ay - o[0]) * d[1] - (az - o[1]) * d[0]) / den;
		if (t > 1e-9 && u >= -1e-9 && u <= 1 + 1e-9) best = Math.min(best, t);
	}
	return [o[0] + d[0] * best, o[1] + d[1] * best];
}

/**
 * A pair of socks standing side by side, as if on invisible feet, built from a side view of a real foot: a ribbed
 * cuff, a leg that narrows to the ankle (with a calf on knee socks), a heel that sits out behind the Achilles, an
 * instep that slopes down from the ankle crease to a broad, low ball, and a closed toe (a flat wedge when grafted, a
 * rounder point when drawn closed) that leans towards the big toe.
 */
export function buildSocks(d: Design, m: Measurements): Garment {
	const { wraps, vOf, k } = fabricScale(d, m);
	const circ = m.sockCirc ?? m.chest;
	const legLen = m.legLen ?? 16 * k;
	// A true-length foot reads as too long next to the slim leg, so the model draws it a little shorter than the
	// pattern's foot length.
	const FOOT_DRAWN = 0.8;
	const L = (m.footLen ?? 25 * k) * FOOT_DRAWN;
	const toeLen = (m.toeLen ?? L * 0.22) * FOOT_DRAWN;
	const cuffLen = m.cuffLen ?? 5 * k;
	const R = circ / TAU;
	const knee = d.sockLength === 'Knee';
	const flap = d.heel === 'Flap';
	const wedge = d.toe === 'Grafted';
	const SC = 56;

	// ── The side view ──────────────────────────────────────────────────
	// The heel is a rounded corner behind and below the leg: its back at z = 0, its sole on y = 0. A flap heel is
	// deeper and squarer than a short-row one.
	const hr = R * (flap ? 1.0 : 0.92);
	const heelE = flap ? 2.6 : 2.1;
	// The leg stands over the heel, its back (the Achilles) a little in front of the heel's.
	const rAnkle = R * 0.86;
	const legZ = R * 0.42 + rAnkle;
	const ankleY = hr + R * 1.25;
	// The pattern measures the leg from the cast-on, so the cuff is part of it (at least a little plain leg is drawn).
	const plainLeg = Math.max(k, legLen - cuffLen);
	const topY = ankleY + cuffLen + plainLeg;
	// The crease at the front of the ankle is a fillet of radius `rc`; every heel slice passes through its centre,
	// which lies outside the foot, so the slices fan round the heel without crossing.
	const rc = R * 0.42;
	const pivot: P2 = [ankleY, legZ + rAnkle + rc];
	const zJ = pivot[1];
	const instepY = ankleY - rc;
	const toeZ = Math.max(zJ + 2 * k, L - toeLen);
	const ballZ = lerp(zJ, toeZ, 0.82);
	const ballY = R * 1.45;
	const toeY = R * 1.28;
	// The top of the foot: down from the instep, flattening out over the ball.
	const topAt = (z: number) => {
		const t = Math.min(1, Math.max(0, (z - zJ) / (ballZ - zJ)));
		return z <= ballZ ? lerp(instepY, ballY, 1 - Math.pow(1 - t, 1.25)) : lerp(ballY, toeY, (z - ballZ) / (toeZ - ballZ));
	};
	// Half-width: narrow at the heel, broadest across the ball.
	const heelW = R * 1.0;
	const ballW = R * 1.3;
	const widthAt = (z: number) => {
		if (z <= ballZ) return lerp(heelW, ballW, smooth(zJ * 0.6, ballZ, z));
		return lerp(ballW, ballW * 0.96, (z - ballZ) / (toeZ - ballZ));
	};

	// Behind and under: the Achilles curves back into the heel, round its corner and along the sole.
	const backLine: P2[] = [];
	const achilles: [P2, P2, P2, P2] = [
		[ankleY, legZ - rAnkle],
		[lerp(ankleY, hr, 0.45), legZ - rAnkle],
		[lerp(ankleY, hr, 0.55), 0],
		[hr, 0]
	];
	for (let j = 0; j <= 12; j++) {
		const t = j / 12;
		const u = 1 - t;
		const w = [u * u * u, 3 * u * u * t, 3 * u * t * t, t * t * t];
		backLine.push([0, 1].map((q) => achilles.reduce((s, p, i) => s + p[q] * w[i], 0)) as P2);
	}
	for (let j = 1; j <= 16; j++) {
		const th = (j / 16) * (Math.PI / 2);
		backLine.push([hr - hr * se(Math.sin(th), heelE), hr - hr * se(Math.cos(th), heelE)]);
	}
	backLine.push([0, toeZ]);

	const rings: Ring[] = [];
	const x = new THREE.Vector3(1, 0, 0);
	const push = (A: P2, B: P2, rx: number, foot: number, heel = 0, shift = 0) => {
		const c = new THREE.Vector3(shift, (A[0] + B[0]) / 2, (A[1] + B[1]) / 2);
		const b = new THREE.Vector3(0, B[0] - A[0], B[1] - A[1]);
		const ry = b.length() / 2;
		b.normalize();
		const prev = rings.at(-1);
		rings.push({ c, n: x, b, rx, ry, e: lerp(2, 3, foot), eTop: lerp(2, 2.3, foot), taper: 0.16 * foot, heel, s: prev ? prev.s + prev.c.distanceTo(c) : 0 });
	};

	// ── Cuff and leg ───────────────────────────────────────────────────
	// The leg narrows to just above the ankle bone; a knee sock swells over the calf, mostly behind.
	const rTop = R * (knee ? 1.08 : 1.02);
	const legAt = (y: number) => {
		const h = y - ankleY;
		const span = cuffLen + plainLeg;
		const r = lerp(rAnkle, rTop, smooth(R * 0.4, Math.min(span, 12 * k), h));
		const calf = knee ? 0.24 * R * Math.pow(Math.sin(Math.PI * Math.min(1, Math.max(0, (h - 0.25 * span) / (0.75 * span)))), 1.4) : 0;
		return { back: legZ - r - calf * 1.4, front: legZ + r + calf * 0.4, w: (r + calf) * 1.04 };
	};
	const CUFF = 7;
	for (let j = 0; j < CUFF; j++) {
		const y = topY - (j / (CUFF - 1)) * cuffLen;
		const { back, front, w } = legAt(y);
		push([y, back], [y, front], w, 0);
	}
	const cuffRows = rings.length;
	const LEG = knee ? 34 : 22;
	for (let j = 1; j <= LEG; j++) {
		const y = topY - cuffLen - (j / LEG) * plainLeg;
		const { back, front, w } = legAt(y);
		push([y, back], [y, front], w, 0);
	}

	// ── The heel turn ──────────────────────────────────────────────────
	// Slices swing a quarter turn round the crease, from level across the ankle to upright across the foot.
	const HEEL = 22;
	const wAnkle = legAt(ankleY).w;
	for (let j = 1; j <= HEEL; j++) {
		const t = j / HEEL;
		const phi = t * (Math.PI / 2);
		const dir: P2 = [-Math.sin(phi), -Math.cos(phi)];
		const B: P2 = [pivot[0] + rc * dir[0], pivot[1] + rc * dir[1]];
		const A = hit(pivot, dir, backLine);
		// Fuller across the heel than the ankle above it, then easing into the foot.
		const w = lerp(wAnkle, widthAt(zJ), smooth(0, 1, t)) * (1 + 0.06 * Math.sin(Math.PI * t));
		push(A, B, w, smooth(0.3, 1, t), Math.sin(Math.PI * t) * (flap ? 0.5 : 0.35));
	}

	// ── The foot ───────────────────────────────────────────────────────
	// Upright slices, sole on the floor. The forefoot drifts towards the big toe.
	const lean = R * 0.22;
	const leanAt = (z: number) => lean * smooth(zJ, L, z);
	const FOOT = 22;
	for (let j = 1; j <= FOOT; j++) {
		const z = lerp(zJ, toeZ, j / FOOT);
		push([0, z], [topAt(z), z], widthAt(z), 1, 0, leanAt(z));
	}

	// ── The toe ────────────────────────────────────────────────────────
	// A grafted toe is a flat wedge, wide to the end; a drawn-closed toe is a rounder dome. Both close at mid-height
	// a little above the floor.
	const TOE = 16;
	const w0 = widthAt(toeZ);
	const h0 = toeY;
	for (let j = 1; j <= TOE; j++) {
		const t = j / TOE;
		const wx = wedge ? Math.sqrt(Math.max(0, 1 - Math.pow(t, 4))) * (1 - 0.2 * t) : Math.sqrt(Math.max(0, 1 - Math.pow(t, 2.6)));
		const wy = wedge ? Math.sqrt(Math.max(0, 1 - Math.pow(t, 2.4))) * (1 - 0.12 * t) : Math.sqrt(Math.max(0, 1 - Math.pow(t, 2.6)));
		const z = toeZ + toeLen * t;
		const mid = lerp(h0 / 2, h0 * 0.45, t);
		const half = Math.max((h0 / 2) * wy, h0 * 0.005);
		push([Math.max(0, mid - half), z], [mid + half, z], Math.max(w0 * wx, h0 * 0.005), 1, 0, leanAt(z));
	}

	const total = rings.at(-1)!.s;
	const ringPoint = (ring: Ring, i: number, sign: number, out: THREE.Vector3) => {
		const a = (i / SC) * TAU;
		const ca = Math.cos(a);
		const ex = ca > 0 ? ring.e : ring.eTop;
		const narrow = 1 - ring.taper * Math.max(0, -ca);
		const wobble = 1 + 0.012 * wob(Math.sin(a) * 2, ring.s / (5 * k), ca * 2);
		return out
			.copy(ring.c)
			.setX(ring.c.x * sign)
			.addScaledVector(ring.n, -se(Math.sin(a), ex) * ring.rx * narrow * wobble)
			.addScaledVector(ring.b, -se(ca, ex) * ring.ry * wobble);
	};
	const tube = (from: number, to: number, sign: number) =>
		sheet(
			SC,
			to - from,
			(i, j, out) => ringPoint(rings[from + j], i, sign, out),
			(i, j) => [(i / SC) * wraps(circ), vOf(rings[from + j].s)],
			(_i, j, out) => out.copy(rings[from + j].c).setX(rings[from + j].c.x * sign),
			true,
			(i, j, p) => {
				const a = (i / SC) * TAU;
				const ring = rings[from + j];
				return 1 - 0.1 * Math.max(0, Math.cos(a)) - 0.06 * (1 - ring.s / total) + 0.08 * ring.heel * Math.max(0, Math.cos(a)) + 0.025 * wob(p.x / (2 * k), p.y / (2 * k), p.z / (2 * k));
			}
		);

	// Stand the pair in profile, toes to the left, the second a step behind and along; each leans towards the other.
	const fabric: THREE.BufferGeometry[] = [];
	const ribs: { kind: string; geometry: THREE.BufferGeometry }[] = [];
	const turn = new THREE.Matrix4().makeRotationY(-Math.PI / 2);
	const placements: [number, number, number][] = [
		[-L * 0.14, R * 1.6, -1],
		[L * 0.14, -R * 1.6, 1]
	];
	placements.forEach(([px, pz, sign], piece) => {
		const body = knitAt(tube(cuffRows - 1, rings.length - 1, sign), 0, (j) => (2 * rings[cuffRows - 1 + j].s) / total, SC);
		const cuff = knitAt(tube(0, cuffRows - 1, sign), 0, (j) => (2 * rings[j].s) / total, SC);
		const place = (g: THREE.BufferGeometry) => {
			const copy = g.applyMatrix4(turn);
			const knit = copy.getAttribute('knit') as THREE.BufferAttribute;
			for (let v = 0; v < knit.count; v++) knit.setX(v, piece);
			return copy.translate(px, 0, pz);
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
		bodyWhen: (y) => Math.min(2, Math.max(0, (topY - y) / (cuffLen + plainLeg)))
	};
	return finishGarment(parts);
}
