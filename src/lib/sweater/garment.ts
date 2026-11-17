import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { ARM_SHARE, CUSTOM, sizeStep, wearerScale, type Custom } from './fit';
import { stitchGauge } from './needles';
import { TILE_ROWS, TILE_ST, tileFor } from './motifs';

export type Design = {
	wearer: string;
	garment: string;
	construction: string;
	/** XS to XL, or 'Custom' to use `custom`. */
	size: string;
	/** The knitter's own measurements, used while `size` is 'Custom' and kept when they switch back. */
	custom: Custom | null;
	fit: string;
	bodyLength: string;
	sleeveLength: string;
	neckline: string;
	sleeveShape: string;
	/** Body hem: 'Ribbed' | 'Folded hem' | 'Rolled edge' | 'I-cord' */
	hemFinish: string;
	bodyRib: string;
	bodyRibLength: string;
	slits: string;
	neckRib: string;
	neckDepth: string;
	cuffFinish: string;
	sleeveRib: string;
	cuffLength: string;
	pattern: string;
	/** The knitter's own chart (TILE_ST × TILE_ROWS cells of 0/1, rows top to bottom), used while `pattern` is Custom. */
	motif: string;
	color: string;
	contrast: string;
	/** Yarn weight, as its standard gauge (stitches per 4 in). */
	gauge: number;
	/** Main needle in mm when it is not the yarn weight's standard one (0). It changes the stitch gauge: see `stitchGauge`. */
	needle: number;
	/** Ribbing needle in mm when it is not the usual one for the main needle (0). */
	ribNeedle: number;
};

/** The pieces a knitter works one after another; the first value of the `knit` vertex attribute. */
export const PIECE = { body: 0, sleeve: 1, sleeve2: 2, neck: 3, bands: 4 } as const;

/**
 * Every knitted geometry carries a `knit` attribute (piece, when), so the viewer can show a garment
 * part-way through its pattern. For the body and sleeves `when` runs from 0 at the neck to 1 at the
 * underarm (the yoke), then on to 2 at the hem or cuff; for the neckband and front bands, 0 to 1.
 */
export type Garment = {
	fabric: THREE.BufferGeometry;
	/** Ribbed parts, one geometry per rib structure ('1×1', '2×2', …). */
	ribs: { kind: string; geometry: THREE.BufferGeometry }[];
	trim: THREE.BufferGeometry | null;
	/** Openings shown as the dark inside of the garment (slipover armholes). */
	holes: THREE.BufferGeometry | null;
	/** Raglan seam paths in the XY plane; the viewer projects them onto the surface. */
	seams: [THREE.Vector2, THREE.Vector2][];
	/** `when` (see above) for a point on the body at height y. */
	bodyWhen: (y: number) => number;
	/** Relative size of the wearer, for camera framing. */
	scale: number;
};

/** Everything that changes the mesh (colour and pattern only change the textures). */
export const shapeKey = (d: Design) => {
	const { color: _c, contrast: _x, pattern: _p, motif: _m, ribNeedle: _r, ...shape } = d;
	// A finer colourwork chart repeats half as often, which changes the UVs but nothing else.
	return JSON.stringify({ ...shape, fine: tileFor(d.pattern, stitchGauge(d) || 18).fine });
};

/** Rib depth in cm (adult) for the 'Rib length' choice. */
const ribDepth = (len: string) => (len === 'Short' ? 3 : len === 'Long' ? 10 : 6);

/**
 * Finished measurements (cm) for a design. The 3D model and the written pattern both read from here,
 * so the pattern always describes the garment the viewer shows.
 *
 * Heights are measured up from the hem (0) to the back of the neck (L). Body widths and depths are
 * half-measurements: W is half the chest width, D half the chest depth (front to back).
 */
export function measure(d: Design) {
	// ── Wearer and size ─────────────────────────────────────────────────
	// Custom measurements stand in for both: the proportions scale with the chest instead of the wearer.
	const c = d.size === CUSTOM ? d.custom : null;
	const k = c ? Math.min(1.5, Math.max(0.4, c.chest / 96)) : wearerScale(d.wearer);
	const sizeAdj = c ? 0 : sizeStep(d.size);
	const fitAdj = d.fit === 'Fitted' ? -3 : d.fit === 'Oversized' ? 5 : 0;
	const hasSleeves = d.garment !== 'Slipover';
	const raglan = d.construction === 'Raglan' && hasSleeves;

	// ── Gauge ───────────────────────────────────────────────────────────
	const gauge = Math.min(40, Math.max(8, stitchGauge(d) || 18)); // stitches per 4 in (10.16 cm)
	const stPerCm = gauge / 10.16;
	const rowPerCm = stPerCm * 1.35; // assumed stockinette row:stitch ratio

	// ── Body ────────────────────────────────────────────────────────────
	// Half chest width. For a custom fit it is the body plus ease: relaxed adds 4 cm round the chest (less on a small body).
	const W = c ? c.chest / 4 + (fitAdj + 1) * Math.min(1, k) : (25 + sizeAdj + fitAdj) * k;
	const D = W * 0.38; // half chest depth
	const L = c ? c.length : (d.bodyLength === 'Cropped' ? 44 : d.bodyLength === 'Long' ? 66 : 56) * k; // hem to back neck
	// Underarm height. A raglan yoke sits deeper so its increases keep the usual every-other-round rhythm.
	const ya = L - (20 + (raglan ? 3 : 0) + fitAdj * 0.4) * k;
	const ys = L - (raglan ? 6 : 3.5) * k; // shoulder-point height
	const S = hasSleeves ? W * (d.fit === 'Oversized' ? 0.92 : raglan ? 0.78 : 0.82) : W * 0.64; // half shoulder width
	const hemH = d.hemFinish === 'Ribbed' ? ribDepth(d.bodyRibLength) * k : d.hemFinish === 'Folded hem' ? 3 * k : 0; // 0 = rolled / I-cord rim
	const slitH = (d.slits === 'Short' ? 6 : d.slits === 'Long' ? 12 : 0) * k;

	// ── Neck opening ────────────────────────────────────────────────────
	const iCordNeck = d.neckline === 'I-cord';
	// An I-cord neck has no band, so the opening itself is cut a little wider and deeper.
	const N = (d.neckline === 'Boat' ? 13.5 : iCordNeck ? 9.4 : d.neckline === 'Crew' || d.neckline === 'V-neck' ? 8.6 : 8) * k; // half width
	const Nd = N * (d.neckline === 'Boat' ? 0.5 : 0.82); // half depth
	const dropF = (d.neckline === 'V-neck' ? 15 : d.neckline === 'Crew' ? 5 : iCordNeck ? 6 : d.neckline === 'Boat' ? 1.5 : 3) * k; // front neck drop
	const dropB = (iCordNeck ? 1.8 : 1.2) * k; // back neck drop

	// ── Neckband / collar ───────────────────────────────────────────────
	// Stand-up collar height as knitted. A turtleneck is knitted twice as tall as it is worn and folded down.
	const standH = d.neckline === 'Turtleneck' ? 18 * k : d.neckline === 'Mock neck' ? 4.5 * k : 0;
	const bandDepth = d.neckDepth === 'Narrow' ? 0.6 : d.neckDepth === 'Wide' ? 1.7 : 1;
	const collarH = iCordNeck ? 0 : standH || (d.neckline === 'Boat' ? 1.6 : d.neckline === 'V-neck' ? 2 : 2.5) * bandDepth * k;

	// ── Sleeves ─────────────────────────────────────────────────────────
	// Upper arm: 36% of the chest, a standard garment proportion. The tube is slightly flattened
	// (about 0.93 of a circle's perimeter), so the radius is set to give that circumference.
	const chest = 4 * W;
	const upperArm = 0.36 * chest;
	const R = upperArm / (2 * Math.PI * 0.93); // upper-arm radius
	// Wrist and balloon cuff keep the same proportion to the upper arm as the original sleeve shape.
	const armScale = R / ((9 + fitAdj * 0.4 + sizeAdj * 0.25) * k);
	const wrist = (5.5 + fitAdj * 0.15) * k * armScale; // wrist radius
	const cuffRibbed = d.cuffFinish === 'Ribbed';
	const cuffLen = (cuffRibbed ? ribDepth(d.cuffLength) * (d.sleeveLength === 'Short' ? 0.45 : 1) : d.cuffFinish === 'Folded hem' ? 2.5 : 0) * k;
	// Shoulder to cuff. A raglan's deeper underarm needs a longer short sleeve to reach below it.
	// A custom arm is measured underarm to wrist: the sleeve length covers its share, and the cuff is part of that.
	const sleeveLen = c
		? Math.max(2 * k, c.arm * (ARM_SHARE[d.sleeveLength] ?? 1) - cuffLen) + (8 + (raglan ? 3 : 0)) * k
		: (d.sleeveLength === 'Short' ? (raglan ? 16 : 13) : d.sleeveLength === '3/4' ? 34 : 50) * k;
	/** Underarm to the start of the cuff: what a knitter measures. */
	const sleeveBody = Math.max(2 * k, sleeveLen - (8 + (raglan ? 3 : 0)) * k);
	// The model's sleeve tube starts this far inside the shoulder; arm lengths below count from there.
	const sleeveInside = 5 * k;
	/** Plain tapered arm radius at length l along the tube, before balloon / puff shaping. */
	const armR = (l: number) => lerp(R, wrist, Math.pow(Math.min(1, l / (50 * k)), 0.85));
	const tubeLen = sleeveLen + sleeveInside;
	const cuffR = d.sleeveShape === 'Balloon' ? (d.sleeveLength === 'Short' ? armR(tubeLen) * 0.78 : 4.7 * k * armScale) : armR(tubeLen) * 0.98;
	/** Sleeve radius at length l along the tube, with balloon / puff shaping and the gather into the cuff. */
	const sleeveR = (l: number) => {
		const t = l / tubeLen;
		const r = armR(l) * sleeveShape(t);
		return d.sleeveShape === 'Balloon' ? lerp(r, cuffR, smooth(0.86, 1, t)) : r;
	};
	/** Width factor at fraction t of the tube length: balloon swells below the elbow, puff just below the shoulder. */
	const sleeveShape = (t: number) =>
		d.sleeveShape === 'Balloon' ? 1 + 0.36 * Math.sin(Math.PI * Math.pow(t, 1.7)) : d.sleeveShape === 'Puff' ? 1 + 0.42 * Math.exp(-Math.pow((t - 0.27) / 0.16, 2)) : 1;

	return {
		k, sizeAdj, fitAdj, hasSleeves, raglan,
		gauge, stPerCm, rowPerCm,
		W, D, L, ya, ys, S, hemH, slitH, chest,
		N, Nd, dropF, dropB,
		standH, collarH,
		upperArm, R, wrist, sleeveLen, sleeveBody, sleeveInside, tubeLen, armR, sleeveShape, sleeveR, cuffR, cuffLen, cuffRibbed
	};
}

const TAU = Math.PI * 2;
/** How a flat half-chest measurement sits on a body: its share across, and front to back. */
const WORN_W = 0.7;
const WORN_D = 0.54;
/** Sharpness of the blend where sleeve meets body: lower is a softer, wider fillet. */
const BLEND = 6;
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth = (a: number, b: number, x: number) => {
	const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
	return t * t * (3 - 2 * t);
};
/** Superellipse coordinate: e = 2 is a circle, larger is boxier. */
const se = (c: number, e: number) => Math.sign(c) * Math.pow(Math.abs(c), 2 / e);

/** Cheap smooth noise in -1..1, for uneven cloth. */
const wob = (x: number, y: number, z: number) =>
	(Math.sin(x * 1.7 + y * 0.9 + 1.3) * Math.sin(y * 1.3 - z * 1.1 + 0.4) + Math.sin(x * 0.6 - z * 1.9 + 2.1) * Math.sin(y * 2.3 + x * 0.8) * 0.6) / 1.6;

type PosFn = (i: number, j: number, out: THREE.Vector3) => void;

type TintFn = (i: number, j: number, p: THREE.Vector3) => number;

/** A (cols × rows) quad sheet. `center` gives a point "inside" each vertex so faces can be wound outward; `tint` bakes soft shading into vertex colours. */
function sheet(cols: number, rows: number, pos: PosFn, uv: (i: number, j: number) => [number, number], center: PosFn, closed = true, tint?: TintFn) {
	const stride = cols + 1;
	const P = new Float32Array(stride * (rows + 1) * 3);
	const U = new Float32Array(stride * (rows + 1) * 2);
	const C = new Float32Array(stride * (rows + 1) * 3).fill(1);
	const v = new THREE.Vector3();
	for (let j = 0; j <= rows; j++)
		for (let i = 0; i <= cols; i++) {
			const k = j * stride + i;
			pos(i, j, v);
			P.set([v.x, v.y, v.z], k * 3);
			U.set(uv(i, j), k * 2);
			if (tint) C.fill(Math.min(1.08, Math.max(0.35, tint(i, j, v))), k * 3, k * 3 + 3);
		}
	const idx: number[] = [];
	for (let j = 0; j < rows; j++)
		for (let i = 0; i < cols; i++) {
			const a = j * stride + i;
			idx.push(a, a + stride, a + 1, a + 1, a + stride, a + stride + 1);
		}
	const g = new THREE.BufferGeometry();
	g.setAttribute('position', new THREE.BufferAttribute(P, 3));
	g.setAttribute('uv', new THREE.BufferAttribute(U, 2));
	g.setAttribute('color', new THREE.BufferAttribute(C, 3));
	g.setIndex(idx);
	g.computeVertexNormals();
	const n = g.getAttribute('normal') as THREE.BufferAttribute;
	if (closed)
		for (let j = 0; j <= rows; j++) {
			const a = j * stride;
			const b = a + cols;
			v.set(n.getX(a) + n.getX(b), n.getY(a) + n.getY(b), n.getZ(a) + n.getZ(b)).normalize();
			n.setXYZ(a, v.x, v.y, v.z);
			n.setXYZ(b, v.x, v.y, v.z);
		}
	// Wind faces outward.
	let facing = 0;
	const c = new THREE.Vector3();
	for (let j = 0; j <= rows; j += 2)
		for (let i = 0; i <= cols; i += 3) {
			const k = j * stride + i;
			center(i, j, c);
			facing += (P[k * 3] - c.x) * n.getX(k) + (P[k * 3 + 1] - c.y) * n.getY(k) + (P[k * 3 + 2] - c.z) * n.getZ(k);
		}
	if (facing < 0) flip(g);
	return g;
}

/** Tags a geometry with the piece it belongs to and when it is knitted: one value, or one per row of a sheet `cols` wide. */
function knitAt(g: THREE.BufferGeometry, piece: number, when: number | ((row: number) => number), cols = 0) {
	const n = g.getAttribute('position').count;
	const K = new Float32Array(n * 2);
	for (let k = 0; k < n; k++) K.set([piece, typeof when === 'number' ? when : when(Math.floor(k / (cols + 1)))], k * 2);
	g.setAttribute('knit', new THREE.BufferAttribute(K, 2));
	return g;
}

function flip(g: THREE.BufferGeometry) {
	const idx = g.getIndex()!;
	for (let k = 0; k < idx.count; k += 3) {
		const a = idx.getX(k);
		idx.setX(k, idx.getX(k + 1));
		idx.setX(k + 1, a);
	}
	const n = g.getAttribute('normal');
	for (let k = 0; k < n.count; k++) n.setXYZ(k, -n.getX(k), -n.getY(k), -n.getZ(k));
}

function mirrorX(src: THREE.BufferGeometry) {
	const g = src.clone();
	const p = g.getAttribute('position');
	const n = g.getAttribute('normal');
	for (let k = 0; k < p.count; k++) {
		p.setX(k, -p.getX(k));
		n.setX(k, -n.getX(k));
	}
	const idx = g.getIndex()!;
	for (let k = 0; k < idx.count; k += 3) {
		const a = idx.getX(k);
		idx.setX(k, idx.getX(k + 1));
		idx.setX(k + 1, a);
	}
	return g;
}

export function buildGarment(d: Design): Garment {
	const m = measure(d);
	const { k, W, L, ya, ys, S, hemH, slitH, N, Nd, dropF, dropB, hasSleeves, raglan, stPerCm, rowPerCm, gauge } = m;
	const ribbed = d.hemFinish === 'Ribbed';
	// Rib draws in and gathers the fabric above it; a stockinette band lies flat at full width.
	const drawn = (kind: string) => (kind === 'Stockinette' ? 1 : 1.5);
	const hemDraws = ribbed && d.bodyRib !== 'Stockinette';
	const iCordNeck = d.neckline === 'I-cord';

	// Whole chart repeats round every tube, so the texture meets at the seam. The UVs count standard tiles; a fine chart is two of them wide.
	const unit = tileFor(d.pattern, gauge).fine ? 2 : 1;
	const wraps = (circ: number, stretch = 1) => unit * Math.max(1, Math.round((circ * stPerCm * stretch) / (TILE_ST * unit)));
	const vOf = (cm: number) => (cm * rowPerCm) / TILE_ROWS;

	// Knitted top down: the yoke from the neck to the underarm, then the body on to the hem.
	const bodyWhen = (y: number) => (y >= ya ? (L - y) / (L - ya) : 1 + (ya - y) / ya);

	const pull = hemDraws ? 0.93 : 1;
	const E = 2.5;

	// Side slits: the hem is lifted into a narrow notch at each side seam (a = π/2, 3π/2).
	const slitTop = hemH + slitH + 8 * k;
	const lift = (a: number, y: number) => {
		if (!slitH || y >= slitTop) return y;
		const t = Math.min(Math.abs(a - Math.PI / 2), Math.abs(a - (3 * Math.PI) / 2)) / 0.13;
		return y + slitH * Math.max(0, 1 - t * t) * (1 - y / slitTop);
	};

	// ── Body profile: half-width as a function of height ───────────────
	// The measurements describe the garment laid flat. Worn, the same fabric wraps a torso: narrower
	// across and much deeper front to back, with the shoulders about as wide as the chest.
	const Wm = W * WORN_W; // half width as worn
	const Dm = W * WORN_D; // half depth as worn
	const Sm = hasSleeves ? Math.min(S, Wm * 1.04) : Math.min(S, Wm * 0.84); // shoulder point as worn
	const pts: [number, number][] = [
		[Wm * pull, 0],
		[Wm * pull * 1.01, Math.max(hemH, 2 * k)],
		[Wm, hemH + 7 * k],
		[Wm, ya - 3 * k]
	];
	if (hasSleeves) pts.push([lerp(Wm, Sm, 0.45), lerp(ya, ys, 0.55)], [Sm, ys]);
	else pts.push([lerp(Sm, Wm, 0.22), ya + 5 * k], [Sm, ya + 11 * k], [Sm, ys]);
	pts.push([lerp(Sm, N, 0.5), lerp(ys, L, 0.58)], [N, L]);
	const prof = new THREE.SplineCurve(pts.map(([x, y]) => new THREE.Vector2(x, y))).getSpacedPoints(180);
	for (let i = 1; i < prof.length; i++) prof[i].y = Math.max(prof[i].y, prof[i - 1].y + 1e-4);
	prof[prof.length - 1].y = L;
	// Half-width by height, tabulated so the many lookups below stay cheap.
	const WN = 512;
	const wTab = new Float32Array(WN + 1);
	for (let n = 0, i = 1; n <= WN; n++) {
		const y = (n / WN) * L;
		while (i < prof.length - 1 && prof[i].y < y) i++;
		wTab[n] = lerp(prof[i - 1].x, prof[i].x, Math.min(1, Math.max(0, (y - prof[i - 1].y) / (prof[i].y - prof[i - 1].y))));
	}
	const wAt = (y: number) => {
		const f = Math.min(WN - 1e-6, Math.max(0, (y / L) * WN));
		const n = Math.floor(f);
		return lerp(wTab[n], wTab[n + 1], f - n);
	};
	const dAt = (y: number) => lerp(Dm * (wAt(Math.min(y, ya)) / Wm), Nd, Math.pow(smooth(ya - 2 * k, L, y), 1.3));
	// Boxy through the body, rounding off over the shoulders the way a torso does.
	const eAt = (y: number) => lerp(E, 2.05, smooth(ya - 2 * k, ys, y));
	/** Body as a field: below 1 inside the cloth, 1 on it, above 1 outside. */
	const bodyQ = (x: number, y: number, z: number) => {
		if (y > L || y < 0) return 9;
		const e = eAt(y);
		return Math.pow(Math.pow(Math.abs(x) / wAt(y), e) + Math.pow(Math.abs(z) / dAt(y), e), 1 / e);
	};
	// Distance round the chest, for laying the stitches on at their true size.
	let girth = 0;
	for (let n = 0, px = 0, pz = Dm; n <= 64; n++) {
		const a = (n / 64) * (Math.PI / 2);
		const x = se(Math.sin(a), E) * Wm;
		const z = se(Math.cos(a), E) * Dm;
		girth += 4 * Math.hypot(x - px, z - pz);
		px = x;
		pz = z;
	}
	const bodyPoint = (a: number, y: number, out: THREE.Vector3) => out.set(-se(Math.sin(a), eAt(y)) * wAt(y), y, -se(Math.cos(a), eAt(y)) * dAt(y));
	const bodyZ = (x: number, y: number) => dAt(y) * Math.pow(Math.max(0, 1 - Math.pow(Math.min(1, Math.abs(x) / wAt(y)), eAt(y))), 1 / eAt(y));

	// ── Neckline: per-column top height, so the opening is a true cut ──
	const COLS = 168;
	const cut = (xn: number, front: boolean) =>
		!front ? dropB * (1 - xn * xn) : d.neckline === 'V-neck' ? dropF * (1 - xn) : d.neckline === 'Boat' ? dropF * (1 - xn * xn) : dropF * Math.sqrt(Math.max(0, 1 - xn * xn));
	const top: number[] = [];
	for (let i = 0; i <= COLS; i++) {
		const a = (i / COLS) * TAU;
		const front = Math.cos(a) < 0;
		let lo = L - Math.max(dropF, dropB) - 0.01;
		let hi = L;
		for (let n = 0; n < 24; n++) {
			const mid = (lo + hi) / 2;
			if (mid - (L - cut(Math.min(1, (Math.abs(se(Math.sin(a), eAt(mid))) * wAt(mid)) / N), front)) > 0) hi = mid;
			else lo = mid;
		}
		top.push(hi);
	}
	const y0 = Math.min(ya, L - dropF - 6 * k);
	const remap = (i: number, y: number) => (y <= y0 ? y : y0 + ((y - y0) * (top[i] - y0)) / (L - y0));

	// ── Sleeve skeleton: a centreline of rings from inside the shoulder to the cuff ──
	type Ring = { c: THREE.Vector3; t: THREE.Vector3; n: THREE.Vector3; r: number; zs: number; l: number };
	const rings: Ring[] = [];
	const STEPS = 72;
	const inside = m.sleeveInside;
	const len = m.sleeveLen + inside;
	const total = len + m.cuffLen;
	const step = total / STEPS;
	if (hasSleeves) {
		const { sleeveR, cuffR: endR, cuffLen } = m;
		const r0 = sleeveR(inside) * 1.1; // a little ease at the top of the sleeve
		// The sleeve leaves the armhole at the angle that makes it span shoulder point to underarm…
		const aS = Math.min(1.05, Math.max(0.62, Math.asin(Math.min(1, (2 * r0) / (ys - ya)))));
		const aE = 0.08; // …and then hangs like a relaxed arm
		const aIn = Math.PI / 2 - Math.atan2(L - ys, Sm - N) + 0.3; // inside the body it runs under the shoulder line
		const clear = inside + 1.1 * r0 / Math.tan(aS); // where the underside has left the body
		// Over the shoulder it starts flatter and rolls down, so the shoulder line runs into the sleeve without a corner.
		const roll = Math.max(0, Math.min(0.3, aIn - 0.3 - aS));
		const angle = (l: number) =>
			l < inside ? lerp(aIn, aS + roll, l / inside) : aE + (aS - aE) * Math.exp(-Math.max(0, l - clear) / (5 * k)) + roll * Math.exp(-(l - inside) / (3.5 * k));
		const radius = (l: number) => sleeveR(Math.max(l, inside)) * lerp(1.1, 1, smooth(inside, inside + 12 * k, l)) * lerp(0.8, 1, smooth(0, inside, l));
		// As deep as the body where it joins the shoulder, nearly round further down.
		const zs0 = Math.min(1.3, Math.max(0.9, (0.95 * dAt(lerp(ya, ys, 0.7))) / r0));
		const elbow = inside + 0.5 * m.sleeveLen;
		const c = new THREE.Vector3();
		for (let s = 0; s <= STEPS; s++) {
			const l = s * step;
			const a = angle(l);
			const u = Math.max(0, l - elbow);
			rings.push({
				c: new THREE.Vector3(c.x, c.y, (0.16 * u * u) / (u + 6 * k)), // the forearm swings a little forward
				t: new THREE.Vector3(Math.sin(a), -Math.cos(a), 0),
				n: new THREE.Vector3(Math.cos(a), Math.sin(a), 0),
				r: l <= len ? radius(l) : endR * lerp(1.04, 0.97, (l - len) / cuffLen),
				zs: lerp(zs0, 0.9, smooth(inside, inside + 12 * k, l)),
				l
			});
			// Midpoint step along the centreline.
			const am = angle(l + step / 2);
			c.x += Math.sin(am) * step;
			c.y -= Math.cos(am) * step;
		}
		// Shift the whole arm so its top edge leaves the body exactly at the shoulder point.
		const f = inside / step;
		const j = Math.min(STEPS - 1, Math.floor(f));
		const at = new THREE.Vector3().lerpVectors(rings[j].c, rings[j + 1].c, f - j);
		const off = new THREE.Vector3(Sm - Math.cos(aS) * r0 - at.x, ys - 0.3 * k - Math.sin(aS) * r0 - at.y, 0);
		for (const ring of rings) ring.c.add(off);
	}
	/** Sleeve as a field (1 on the cloth) for a point on the wearer's left; `sleeveL` is how far down the sleeve it lies. */
	let sleeveL = 0;
	const sleeveQ = (x: number, y: number, z: number) => {
		let best = 0;
		let bd = Infinity;
		for (let s = 0; s <= STEPS; s++) {
			const c = rings[s].c;
			const dd = (x - c.x) * (x - c.x) + (y - c.y) * (y - c.y);
			if (dd < bd) {
				bd = dd;
				best = s;
			}
		}
		const o = rings[best];
		const f = Math.min(STEPS, Math.max(0, best + ((x - o.c.x) * o.t.x + (y - o.c.y) * o.t.y) / step));
		const j = Math.min(STEPS - 1, Math.floor(f));
		const A = rings[j];
		const B = rings[j + 1];
		const u = f - j;
		const ex = x - lerp(A.c.x, B.c.x, u);
		const ey = y - lerp(A.c.y, B.c.y, u);
		const ez = z - lerp(A.c.z, B.c.z, u);
		const r = lerp(A.r, B.r, u);
		const nx = lerp(A.n.x, B.n.x, u);
		const ny = lerp(A.n.y, B.n.y, u);
		const dn = ex * nx + ey * ny;
		const dt = ex * ny - ey * nx; // along the sleeve: only non-zero past its ends
		sleeveL = f * step;
		return Math.sqrt((dn * dn + dt * dt) / (r * r) + (ez * ez) / (r * r * lerp(A.zs, B.zs, u) ** 2));
	};
	// Sleeve and body only merge around the armhole; further down the arm they are separate cloth.
	const apart = (l: number) => 4 * smooth(inside + 16 * k, inside + 30 * k, l);
	/**
	 * Sleeve and body are separate sheets, but both are laid on one smooth surface: the blend of the two
	 * shapes. `own` scales a point out from its own sheet (1 = where it started) and returns the other
	 * shape's field there. Each sheet follows the blended surface as far as the armhole line, where the
	 * two fields are equal, then slips back under the other, so the join is a seam and not a collision.
	 * Returns the scale to use, negated when the point ends up buried inside the other shape.
	 */
	const join = (other: (s: number) => number, onTop: boolean, tuck = 0) => {
		const o1 = other(1);
		if (o1 > 2.4) return 1;
		const F = (s: number, o: number) => Math.pow(Math.pow(s, -BLEND) + Math.pow(o, -BLEND), -1 / BLEND);
		// Walk outward to the first place the blended surface is crossed, then refine.
		const REACH = 1.7;
		let lo = 1;
		let hi = 1;
		while (hi < REACH && F(hi, other(hi)) < 1) {
			lo = hi;
			hi += 0.035;
		}
		if (hi < REACH)
			for (let n = 0; n < 12; n++) {
				const mid = (lo + hi) / 2;
				if (F(mid, other(mid)) < 1) lo = mid;
				else hi = mid;
			}
		hi = Math.min(hi, REACH);
		// How far past the armhole line this point is, into the other sheet's side.
		const past = hi - other(hi) + tuck;
		const deep = smooth(1.3, REACH, hi);
		// The sleeve lies a hair proud and tucks under just past the line; the body carries on beneath it
		// for a little way before easing back to where it started, so no gap can open between them.
		const s = onTop
			? lerp(hi * 1.015, 1, Math.max(smooth(0, 0.12, past), deep))
			: lerp(hi * (1 - 0.02 * smooth(0, 0.05, past)), 1, Math.max(smooth(0.1, 0.25, past), deep));
		return other(s) < 0.95 ? -s : s;
	};
	/** Drop the faces buried inside the other shape, so nothing shows through the neck or cuffs. */
	const cull = (g: THREE.BufferGeometry, buried: Uint8Array) => {
		const idx = g.getIndex()!;
		const keep: number[] = [];
		for (let n = 0; n < idx.count; n += 3) {
			const [a, b, c] = [idx.getX(n), idx.getX(n + 1), idx.getX(n + 2)];
			if (!(buried[a] && buried[b] && buried[c])) keep.push(a, b, c);
		}
		g.setIndex(keep);
		return g;
	};

	const fabric: THREE.BufferGeometry[] = [];
	const ribs = new Map<string, THREE.BufferGeometry[]>();
	const rib = (kind: string) => {
		if (!ribs.has(kind)) ribs.set(kind, []);
		return ribs.get(kind)!;
	};
	const trim: THREE.BufferGeometry[] = [];
	const axis: PosFn = (_i, _j, out) => out.set(0, 0, 0);
	const bodyWraps = wraps(girth);

	const rowY = [hemH, ...prof.filter((_, i) => i % 2 === 0).map((p) => p.y).filter((y) => y > hemH + 0.2)];
	// Cloth is never a perfect tube: the rib gathers the fabric above the hem, and the rest hangs a little unevenly.
	const pleat = (a: number, y: number) => (hemDraws ? Math.sin(a * 17 + 1.6 * Math.sin(a * 4)) * smooth(hemH, hemH + 2.5 * k, y) * Math.exp(-(y - hemH) / (9 * k)) : 0);
	const sag = (a: number, y: number) => wob(Math.sin(a) * 1.6, y / (9 * k), Math.cos(a) * 1.6) * smooth(hemH, hemH + 5 * k, y) * (1 - smooth(L - 9 * k, L - 3 * k, y));
	const sleeveReach = !hasSleeves ? 0 : d.sleeveLength === 'Short' ? 12 * k : 60 * k;
	const bodyBuried = new Uint8Array((COLS + 1) * rowY.length);
	fabric.push(
		knitAt(cull(sheet(
			COLS,
			rowY.length - 1,
			(i, j, out) => {
				const a = (i / COLS) * TAU;
				const y = remap(i, rowY[j]);
				bodyPoint(a, lift(a, y), out);
				const push = (0.45 * pleat(a, y) + 0.6 * sag(a, y)) * k;
				const r = Math.hypot(out.x, out.z) || 1;
				out.x += (out.x / r) * push;
				out.z += (out.z / r) * push;
				if (!hasSleeves) return;
				const x = Math.abs(out.x);
				const s = join((s) => {
					const q = sleeveQ(x * s, out.y, out.z * s);
					return q + apart(sleeveL);
				}, false);
				if (s < 0) bodyBuried[j * (COLS + 1) + i] = 1;
				out.x *= Math.abs(s);
				out.z *= Math.abs(s);
			},
			(i, j) => [(i / COLS) * bodyWraps, vOf(lift((i / COLS) * TAU, remap(i, rowY[j])))],
			(i, j, out) => out.set(0, remap(i, rowY[j]), 0),
			true,
			(i, j, p) => {
				const a = (i / COLS) * TAU;
				const y = remap(i, rowY[j]);
				const side = smooth(0.52, 1, Math.abs(p.x) / wAt(y));
				// The hanging sleeve shades the side of the body; the armpit most of all.
				const underSleeve = side * smooth(ya + 4 * k - sleeveReach, ya - 2 * k, y) * (1 - smooth(ya - 3 * k, ya + 3 * k, y)) * 0.28;
				const armpit = hasSleeves ? side * Math.exp(-Math.pow((y - ya) / (3.5 * k), 2)) * 0.2 : 0;
				const band = Math.exp(-(top[i] - y) / (1.4 * k)) * 0.14 + (hemH ? Math.exp(-(y - hemH) / (2.2 * k)) * 0.1 : 0);
				return 1 - underSleeve - armpit - band + 0.07 * pleat(a, y) + 0.05 * sag(a, y) + 0.03 * wob(p.x / (3 * k), p.y / (2 * k), p.z);
			}
		), bodyBuried), PIECE.body, (j) => bodyWhen(rowY[j]), COLS)
	);

	/** A rolled rim (I-cord or stockinette curl) around an edge loop. */
	const roll = (cols: number, edge: (i: number, out: THREE.Vector3) => void, radial: (i: number, out: THREE.Vector3) => void, axial: THREE.Vector3, r: number, uWraps: number) => {
		const p = new THREE.Vector3();
		const q = new THREE.Vector3();
		return sheet(
			cols,
			10,
			(i, j, out) => {
				const phi = (j / 10) * TAU;
				edge(i, p);
				radial(i, q);
				out.copy(p).addScaledVector(axial, r * 0.7 + r * Math.sin(phi)).addScaledVector(q, r * Math.cos(phi));
			},
			(i, j) => [(i / cols) * uWraps, vOf((j / 10) * TAU * r)],
			(i, _j, out) => {
				edge(i, out);
				out.addScaledVector(axial, r * 0.7);
			}
		);
	};
	const rimR = (finish: string) => (finish === 'I-cord' ? 0.55 : 1) * Math.sqrt(k);

	// Hem: a rib or folded band, or a rolled / I-cord rim.
	if (hemH)
		(ribbed ? rib(d.bodyRib) : fabric).push(
			knitAt(sheet(
				COLS,
				6,
				(i, j, out) => {
					const a = (i / COLS) * TAU;
					bodyPoint(a, lift(a, (j / 6) * hemH), out);
					// Sits just proud of the fabric, and tucks under it at the top so no gap shows.
					out.x *= j === 6 ? 0.998 : 1.012;
					out.z *= j === 6 ? 0.995 : 1.03;
				},
				(i, j) => [(i / COLS) * (ribbed ? wraps(girth, drawn(d.bodyRib)) : bodyWraps), vOf(lift((i / COLS) * TAU, (j / 6) * hemH))],
				(_i, j, out) => out.set(0, (j / 6) * hemH, 0)
			), PIECE.body, (j) => bodyWhen((j / 6) * hemH), COLS)
		);
	else
		fabric.push(
			knitAt(roll(
				COLS,
				(i, out) => {
					const a = (i / COLS) * TAU;
					bodyPoint(a, lift(a, 0), out);
				},
				(i, out) => {
					bodyPoint((i / COLS) * TAU, 0, out);
					out.setY(0).normalize();
				},
				new THREE.Vector3(0, -1, 0),
				rimR(d.hemFinish),
				bodyWraps
			), PIECE.body, 2)
		);

	// ── Neckband / collar ───────────────────────────────────────────────
	if (iCordNeck)
		// A cord worked straight onto the neck edge, no band.
		fabric.push(
			knitAt(roll(
				COLS,
				(i, out) => bodyPoint((i / COLS) * TAU, top[i], out),
				(i, out) => {
					bodyPoint((i / COLS) * TAU, top[i], out);
					out.setY(0).normalize();
				},
				new THREE.Vector3(0, 1, 0),
				0.6 * Math.sqrt(k),
				wraps(TAU * N)
			), PIECE.neck, 1)
		);
	else if (d.neckline === 'Turtleneck') {
		// Folded in half over itself: an inner layer hugs the neck, turns over in a soft roll, and the outer
		// layer falls back down past the pick-up to rest on the shoulders. One side of the fabric shows on
		// both layers (the neck sees it inside, the world sees it outside), so the sheet is one strip.
		const h = m.collarH;
		const ROWS = 48;
		const IN = 0.4; // share of the rows in the inner layer
		const OUT = 0.6; // where the outer layer starts; the roll is in between
		const ring = new THREE.Vector3();
		const n = new THREE.Vector3();
		const p0 = new THREE.Vector3();
		const p1 = new THREE.Vector3();
		const p2 = new THREE.Vector3();
		const p3 = new THREE.Vector3();
		const foot = new THREE.Vector3();
		/** Point at fraction s along the strip (pick-up edge to cast-off edge) for column i. */
		const collar = (i: number, s: number, out: THREE.Vector3) => {
			const a = (i / COLS) * TAU;
			const drop = L - top[i];
			// Softly uneven, as a folded rib never sits perfectly round.
			const slouch = wob(Math.sin(a) * 1.3, 0.7, Math.cos(a) * 1.3);
			const roll = (0.95 + 0.15 * slouch) * k; // radius of the fold: two layers of rib and a little air
			const yTop = L + h * 0.42 - drop * 0.35 + 0.35 * slouch * k;
			// The neck it hugs: a little narrower than the opening it was picked up from.
			ring.set(-Math.sin(a) * N * 0.88, yTop - roll, -Math.cos(a) * Nd * 0.88);
			n.set(-Math.sin(a) / N, 0, -Math.cos(a) / Nd).normalize();
			if (s <= IN) {
				const t = s / IN;
				bodyPoint(a, top[i], p0);
				const e = smooth(0, 0.6, t); // leaves the edge and straightens up against the neck
				out.set(lerp(p0.x, ring.x, e), lerp(top[i], ring.y, t), lerp(p0.z, ring.z, e));
				return;
			}
			if (s < OUT) {
				const th = (Math.PI * (s - IN)) / (OUT - IN);
				out.copy(ring).addScaledVector(n, roll * (1 - Math.cos(th)));
				out.y += roll * Math.sin(th);
				return;
			}
			// Outer layer: from the roll down to its edge, lying a little below the pick-up on the shoulders.
			const t = (s - OUT) / (1 - OUT);
			p0.copy(ring).addScaledVector(n, 2 * roll);
			const reach = Math.hypot(p0.x, p0.z) + 1.3 * k;
			let lo = top[i] - 4 * k;
			let hi = top[i];
			for (let q = 0; q < 16; q++) {
				const mid = (lo + hi) / 2;
				bodyPoint(a, mid, foot);
				if (Math.hypot(foot.x, foot.z) > reach) lo = mid;
				else hi = mid;
			}
			bodyPoint(a, Math.max(lo, top[i] - 2.2 * k), foot);
			foot.addScaledVector(n, 0.45 * k);
			foot.y += 0.25 * k;
			const fall = p0.y - foot.y;
			p1.copy(p0).addScaledVector(n, 0.35 * k);
			p1.y -= fall * 0.45;
			p2.copy(foot);
			p2.y += fall * 0.35;
			p3.copy(foot);
			// Cubic Bézier, plus soft ripples where the outer layer is stretched over the wider shoulders.
			const u = 1 - t;
			out.set(0, 0, 0)
				.addScaledVector(p0, u * u * u)
				.addScaledVector(p1, 3 * u * u * t)
				.addScaledVector(p2, 3 * u * t * t)
				.addScaledVector(p3, t * t * t)
				.addScaledVector(n, 0.3 * k * t * t * Math.sin(a * 7 + 2 * Math.sin(a * 2)));
		};
		const outward = new THREE.Vector3();
		rib(d.neckRib).push(
			knitAt(sheet(
				COLS,
				ROWS,
				(i, j, out) => collar(i, j / ROWS, out),
				(i, j) => [(i / COLS) * wraps(TAU * N, drawn(d.neckRib)), vOf((j / ROWS) * h)],
				// The visible face points at the neck on the inner layer and away from it on the outer.
				(i, j, out) => {
					collar(i, j / ROWS, out);
					const a = (i / COLS) * TAU;
					outward.set(-Math.sin(a), 0, -Math.cos(a));
					out.addScaledVector(outward, j / ROWS < (IN + OUT) / 2 ? 5 : -5);
				},
				true,
				// Shade the inside of the neck and the underside of the edge where it meets the shoulders.
				(_i, j) => {
					const s = j / ROWS;
					return s < IN ? 0.72 + 0.2 * smooth(0.5 * IN, IN, s) : s > OUT ? 1 - 0.14 * smooth(0.85, 1, s) : 0.95;
				}
			), PIECE.neck, (j) => j / ROWS, COLS)
		);
	} else {
		const tall = m.standH;
		const h = m.collarH;
		const base = new THREE.Vector3();
		const inward = new THREE.Vector3();
		const target = new THREE.Vector3();
		const ROWS = tall ? 12 : 5;
		// A V-neck band is knit onto the edge and lies flat in the plane of the front, pointing into the
		// opening, with a mitre at the point. `lay` is that direction per column, `flat` how far it applies
		// (round the back of the neck the band stands like a crew neck's).
		const lay: THREE.Vector3[] = [];
		const proud: THREE.Vector3[] = [];
		const flat: number[] = [];
		if (d.neckline === 'V-neck') {
			const edge = top.map((y, i) => bodyPoint((i / COLS) * TAU, y, new THREE.Vector3()));
			const below = new THREE.Vector3();
			for (let i = 0; i <= COLS; i++) {
				const c = i % COLS;
				const along = edge[(c + 1) % COLS].clone().sub(edge[(c + COLS - 1) % COLS]).normalize();
				bodyPoint((i / COLS) * TAU, top[i] - 0.6 * k, below);
				const rise = edge[i].clone().sub(below);
				const normal = along.clone().cross(rise).normalize();
				if (normal.x * edge[i].x + normal.z * edge[i].z < 0) normal.negate();
				const dir = normal.clone().cross(along).normalize();
				if (dir.dot(rise) < 0) dir.negate();
				lay.push(dir);
				proud.push(normal);
				flat.push(smooth(1 * k, 4 * k, L - top[i]));
			}
			const c = COLS / 2;
			lay[c].multiplyScalar(1 / Math.max(0.35, lay[c].dot(lay[c + 1])));
		}
		const laid = new THREE.Vector3();
		rib(d.neckRib).push(
			knitAt(sheet(
				COLS,
				ROWS,
				(i, j, out) => {
					const a = (i / COLS) * TAU;
					const t = j / ROWS;
					bodyPoint(a, top[i], base);
					inward.set(-base.x, 0, -base.z).normalize();
					if (tall) {
						target.set(-Math.sin(a) * N * 0.9, L + h, -Math.cos(a) * Nd * 0.9);
						out.lerpVectors(base, target, t).addScaledVector(inward, -Math.sin(Math.PI * t) * 0.5 * k);
					} else {
						out.copy(base).addScaledVector(inward, t * h * 0.6 - Math.sin(Math.PI * t) * 0.25 * k);
						out.y += t * h * 0.8;
						if (flat[i]) {
							laid.copy(base).addScaledVector(lay[i], t * h).addScaledVector(proud[i], (0.08 + 0.2 * Math.sin(Math.PI * t)) * k);
							out.lerp(laid, flat[i]);
						}
					}
				},
				(i, j) => [(i / COLS) * wraps(TAU * N, drawn(d.neckRib)), vOf((j / ROWS) * h)],
				(i, j, out) => out.set(0, top[i] + (j / ROWS) * h, 0)
			), PIECE.neck, (j) => j / ROWS, COLS)
		);
	}

	// ── Sleeves ─────────────────────────────────────────────────────────
	if (hasSleeves) {
		const { R, cuffLen, cuffRibbed, cuffR: endR } = m;
			const split = cuffLen ? rings.findIndex((r) => r.l >= len - 1e-6) : STEPS;
		const SC = 56;
		const gather = d.sleeveShape === 'Balloon' ? 0.075 : cuffRibbed && d.sleeveRib !== 'Stockinette' ? 0.04 : 0.015;
		// Soft drape: a few shallow folds inside the elbow, and fabric bunching where it is gathered into the cuff.
		const crease = (ring: Ring, a: number) => {
			if (ring.l > len || d.sleeveLength === 'Short') return ring.l > len ? 0 : gather * 0.5 * Math.sin(a * 9) * smooth(len - 6 * k, len - 1 * k, ring.l) * (1 - smooth(len - 1 * k, len, ring.l));
			const t = ring.l / len;
			const fold = 0.022 * Math.exp(-Math.pow((t - 0.55) / 0.16, 2)) * Math.max(0, Math.sin(a + 0.5)) * Math.sin(ring.l / (1.7 * k) + 1.8 * Math.sin(a));
			const stack = 0.014 * smooth(0.62, 0.92, t) * Math.sin(ring.l / (1.4 * k) + 1.5 * Math.sin(a * 2));
			const pleats = gather * Math.sin(a * 9 + 1.2 * Math.sin(a * 2)) * smooth(len - 11 * k, len - 1.5 * k, ring.l);
			return (fold + stack + pleats) * (1 - smooth(len - 1.2 * k, len, ring.l));
		};
		const ringPoint = (ring: Ring, i: number, out: THREE.Vector3) => {
			const a = (i / SC) * TAU;
			const r = ring.r * (1 + crease(ring, a));
			out.copy(ring.c).addScaledVector(ring.n, -Math.sin(a) * r);
			out.z -= Math.cos(a) * r * ring.zs;
		};
		const sleeveBuried = new Uint8Array((SC + 1) * (STEPS + 1));
		/** A sleeve point, laid onto the surface it shares with the body around the armhole. */
		const joined = (ring: Ring, i: number, j: number, out: THREE.Vector3) => {
			ringPoint(ring, i, out);
			if (ring.l > inside + 30 * k) return;
			const c = ring.c;
			const [ox, oy, oz] = [out.x - c.x, out.y - c.y, out.z - c.z];
			const far = apart(ring.l);
			// The part of the sleeve that starts inside the shoulder stays tucked under the body.
			const s = join((s) => bodyQ(c.x + ox * s, c.y + oy * s, c.z + oz * s) + far, true, 0.15 * (1 - smooth(inside - 4 * k, inside + 1 * k, ring.l)));
			if (s < 0) sleeveBuried[j * (SC + 1) + i] = 1;
			out.set(c.x + ox * Math.abs(s), c.y + oy * Math.abs(s), c.z + oz * Math.abs(s));
		};
		const tube = (from: number, to: number, uWraps: number) =>
			sheet(
				SC,
				to - from,
				(i, j, out) => joined(rings[from + j], i, j, out),
				(i, j) => [(i / SC) * uWraps, vOf(rings[from + j].l)],
				(_i, j, out) => out.copy(rings[from + j].c),
				true,
				(i, j, p) => {
					const ring = rings[from + j];
					const a = (i / SC) * TAU;
					const inner = Math.max(0, Math.sin(a)); // the side that rests against the body
					const cuffShade = cuffLen ? Math.exp(-Math.abs(len - ring.l) / (1.6 * k)) * 0.12 : 0;
					return 1 - 0.24 * inner * inner * smooth(inside + 4 * k, inside + 14 * k, ring.l) - cuffShade + 1.6 * crease(ring, a) + 0.03 * wob(p.x / (3 * k), p.y / (2 * k), p.z);
				}
			);
		// The top of the sleeve grows with the yoke, from the shoulder point to the underarm; the rest is knitted later, down to the cuff.
		const l0 = m.tubeLen - m.sleeveBody;
		const whenAt = (l: number) => (l <= l0 ? lerp(bodyWhen(ys), 1, Math.max(0, (l - inside) / (l0 - inside))) : 1 + (l - l0) / (total - l0));
		const both = (g: THREE.BufferGeometry, when: number | ((row: number) => number)) => [knitAt(g, PIECE.sleeve, when, SC), knitAt(mirrorX(g), PIECE.sleeve2, when, SC)];
		const sleeve = cull(tube(0, split, wraps(TAU * R)), sleeveBuried);
		fabric.push(...both(sleeve, (j) => whenAt(rings[j].l)));
		const end = rings[STEPS];
		if (cuffLen) {
			const cuff = tube(split, STEPS, wraps(TAU * endR, cuffRibbed ? drawn(d.sleeveRib) : 1));
			(cuffRibbed ? rib(d.sleeveRib) : fabric).push(...both(cuff, (j) => whenAt(rings[split + j].l)));
		} else {
			const rim = roll(
				SC,
				(i, out) => ringPoint(end, i, out),
				(i, out) => {
					ringPoint(end, i, out);
					out.sub(end.c).normalize();
				},
				end.t,
				rimR(d.cuffFinish),
				wraps(TAU * endR)
			);
			fabric.push(...both(rim, 2));
		}

	}

	// ── Slipover: armhole openings with a rolled edge ───────────────────
	const holes: THREE.BufferGeometry[] = [];
	if (!hasSleeves) {
		const AC = 40;
		const yc = (ya + ys) / 2;
		const xOn = (y: number, z: number) => wAt(y) * Math.pow(Math.max(0, 1 - Math.pow(Math.min(1, Math.abs(z) / dAt(y)), eAt(y))), 1 / eAt(y));
		const loop = (i: number, s: number, out: THREE.Vector3) => {
			const phi = (i / AC) * TAU;
			const y = yc + ((ys - 1.2 * k - (ya + 1.5 * k)) / 2) * Math.cos(phi) * s;
			const z = Math.sin(phi) * dAt(y) * 0.62 * s;
			return out.set(xOn(y, z) + 0.7 * k, y, z);
		};
		const opening = sheet(AC, 5, (i, j, out) => loop(i, 0.02 + (j / 5) * 0.98, out), () => [0, 0], (_i, _j, out) => out.set(0, yc, 0));
		const edge = roll(
			AC,
			(i, out) => loop(i, 1, out),
			(i, out) => {
				const phi = (i / AC) * TAU;
				out.set(0, Math.cos(phi), Math.sin(phi));
			},
			new THREE.Vector3(1, 0, 0),
			0.7 * Math.sqrt(k),
			wraps(TAU * (ys - ya) * 0.4)
		);
		holes.push(opening, mirrorX(opening));
		rib(d.bodyRib).push(knitAt(edge, PIECE.body, 1), knitAt(mirrorX(edge), PIECE.body, 1));
	}

	// ── Cardigan: button band + buttons ─────────────────────────────────
	if (d.garment === 'Cardigan') {
		const half = 1.7 * Math.sqrt(k);
		const yTop = top[COLS / 2] + 1.2 * k;
		const xs = [-half, -half * 0.45, half * 0.45, half];
		const ROWS = 40;
		const at = (j: number) => Math.min((j / ROWS) * yTop, top[COLS / 2] - 0.01);
		// The band shows once the first of the two is knitted, the buttons when both are.
		rib(d.bodyRib).push(
			knitAt(sheet(
				3,
				ROWS,
				(i, j, out) => out.set(xs[i], (j / ROWS) * yTop, bodyZ(xs[i], at(j)) + (i === 0 || i === 3 ? 0.1 : 0.45) * k),
				(i, j) => [((xs[i] + half) * stPerCm * drawn(d.bodyRib)) / TILE_ST, vOf((j / ROWS) * yTop)],
				(_i, j, out) => out.set(0, (j / ROWS) * yTop, 0),
				false
			), PIECE.bands, 0.5)
		);
		const count = Math.max(3, Math.round(yTop / (8.5 * Math.sqrt(k))));
		for (let b = 0; b < count; b++) {
			const y = lerp(2.5 * k, yTop - 1.6 * k, b / (count - 1));
			const button = new THREE.CylinderGeometry(0.95 * Math.sqrt(k), 0.95 * Math.sqrt(k), 0.4 * k, 24);
			button.rotateX(Math.PI / 2);
			button.translate(0, y, bodyZ(0, Math.min(y, top[COLS / 2] - 0.01)) + 0.65 * k);
			trim.push(knitAt(button, PIECE.bands, 1));
		}
	}

	const seams: [THREE.Vector2, THREE.Vector2][] = [];
	if (raglan) {
		seams.push([new THREE.Vector2(N + 0.4 * k, L - 1.4 * k), new THREE.Vector2(wAt(ya + 3.5 * k) * 0.8, ya + 3.5 * k)]);
		seams.push([new THREE.Vector2(-N - 0.4 * k, L - 1.4 * k), new THREE.Vector2(-wAt(ya + 3.5 * k) * 0.8, ya + 3.5 * k)]);
	}

	return {
		fabric: mergeGeometries(fabric)!,
		ribs: [...ribs].map(([kind, parts]) => ({ kind, geometry: mergeGeometries(parts)! })),
		trim: trim.length ? mergeGeometries(trim.map((g) => g.toNonIndexed()))! : null,
		holes: holes.length ? mergeGeometries(holes)! : null,
		seams,
		bodyWhen,
		scale: lerp(1, k, 0.6)
	};
}
