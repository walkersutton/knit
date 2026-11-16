import * as THREE from 'three';

/** One texture tile is a small stitch chart: TILE_ST stitches wide, TILE_ROWS rows tall. */
export const TILE_ST = 12;
export const TILE_ROWS = 16;

const SW = 32; // px per stitch
const RH = 24; // px per row
const LEVELS: [number, number][] = [
	[0.46, 0.3],
	[0.38, 0.52],
	[0.28, 0.74],
	[0.18, 0.9],
	[0.08, 1]
];

type RGB = [number, number, number];
const hex = (h: string): RGB => {
	const n = parseInt(h.slice(1), 16);
	return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const css = (c: RGB, m = 1) => `rgb(${c.map((v) => Math.round(Math.min(255, v * m))).join(',')})`;
const gray = (v: number) => css([255, 255, 255], v);
const mod = (n: number, m: number) => ((n % m) + m) % m;

/** true = this stitch is worked in the contrast colour */
export function chart(pattern: string, i: number, j: number): boolean {
	if (pattern === 'Stripes') return j < 5;
	if (pattern !== 'Fair isle') return false;
	if (j === 0 || j === 10) return true;
	if (j >= 2 && j <= 8) {
		const d = Math.abs(i - 6) + Math.abs(j - 5);
		const d2 = Math.abs(mod(i + 6, 12) - 6) + Math.abs(j - 5);
		return (d <= 3 && d !== 0) || d2 === 0;
	}
	return j === 13 && i % 4 === 2;
}

function leg(ctx: CanvasRenderingContext2D, x0: number, y0: number, side: number) {
	const tx = x0 + SW * (side < 0 ? 0.15 : 0.85);
	ctx.beginPath();
	ctx.moveTo(x0 + SW / 2 + side * SW * 0.05, y0 + RH * 1.1);
	ctx.quadraticCurveTo(tx, y0 + RH * 0.6, tx, y0 - RH * 0.24);
	ctx.stroke();
}

/** A twisted knit leg: the two legs cross at the base, so the stitch is narrow and tight. */
function twist(ctx: CanvasRenderingContext2D, x0: number, y0: number, side: number) {
	const tx = x0 + SW * (side < 0 ? 0.28 : 0.72);
	ctx.beginPath();
	ctx.moveTo(x0 + SW / 2 - side * SW * 0.14, y0 + RH * 1.1);
	ctx.quadraticCurveTo(x0 + SW / 2 + side * SW * 0.1, y0 + RH * 0.45, tx, y0 - RH * 0.24);
	ctx.stroke();
}

function purl(ctx: CanvasRenderingContext2D, x0: number, y0: number) {
	ctx.beginPath();
	ctx.moveTo(x0 + SW * 0.12, y0 + RH * 0.4);
	ctx.quadraticCurveTo(x0 + SW / 2, y0 + RH * 0.85, x0 + SW * 0.88, y0 + RH * 0.4);
	ctx.stroke();
}

export type KnitOptions = {
	kind: 'stockinette' | 'rib';
	/** Rib structure, knits × purls: '1×1', '2×2' or '2×1'. TILE_ST must divide by its repeat. */
	rib?: string;
	color: string;
	contrast: string;
	pattern: string;
	/** 0..1 — how strongly the stitch relief darkens the albedo */
	shade: number;
	/** normal-map strength */
	bump: number;
};

export type KnitMaps = { map: THREE.CanvasTexture; normalMap: THREE.CanvasTexture };

export function makeKnitMaps(o: KnitOptions): KnitMaps {
	const w = TILE_ST * SW;
	const h = TILE_ROWS * RH;
	const mk = () => {
		const c = document.createElement('canvas');
		c.width = w;
		c.height = h;
		const ctx = c.getContext('2d', { willReadFrequently: true })!;
		ctx.lineCap = 'round';
		return [c, ctx] as const;
	};
	const [colorCanvas, cc] = mk();
	const [, hc] = mk();
	const [normalCanvas, nc] = mk();
	const main = hex(o.color);
	const alt = hex(o.contrast);
	const rib = o.kind === 'rib';
	// Twisted rib is 1×1 with twisted knit stitches; a stockinette band has no purl columns at all.
	const twisted = rib && o.rib === 'Twisted';
	const [knits, purls] = o.rib === 'Stockinette' ? [1, 0] : twisted || !o.rib ? [1, 1] : o.rib.split('×').map(Number);
	const purlAt = (i: number) => rib && i % (knits + purls) >= knits;
	const knit = (ctx: CanvasRenderingContext2D, x0: number, y0: number) =>
		twisted ? (twist(ctx, x0, y0, -1), twist(ctx, x0, y0, 1)) : (leg(ctx, x0, y0, -1), leg(ctx, x0, y0, 1));

	cc.fillStyle = css(main, 0.55);
	cc.fillRect(0, 0, w, h);
	hc.fillStyle = '#000';
	hc.fillRect(0, 0, w, h);

	// Rows are drawn bottom-up so each stitch tucks under the row above it.
	for (let j = TILE_ROWS + 1; j >= -1; j--) {
		const jj = mod(j, TILE_ROWS);
		for (let pass = 0; pass <= LEVELS.length; pass++) {
			for (let i = -1; i <= TILE_ST; i++) {
				const ii = mod(i, TILE_ST);
				const x0 = i * SW;
				const y0 = j * RH;
				const isPurl = purlAt(ii);
				if (pass === 0) {
					const base = !rib && chart(o.pattern, ii, jj) ? alt : main;
					const jitter = 0.965 + 0.07 * (((ii * 7919 + jj * 104729) % 97) / 97);
					cc.strokeStyle = css(base, jitter * (isPurl ? 0.95 : 1));
					cc.lineWidth = SW * LEVELS[0][0];
					if (isPurl) purl(cc, x0, y0);
					else knit(cc, x0, y0);
				} else {
					const [width, level] = LEVELS[pass - 1];
					hc.strokeStyle = gray(level * (isPurl ? 0.8 : 1));
					hc.lineWidth = SW * width;
					if (isPurl) purl(hc, x0, y0);
					else knit(hc, x0, y0);
				}
			}
		}
	}

	// Loose fibres lying across the surface, so the yarn reads as wool rather than cord.
	cc.lineWidth = 1;
	let seed = 7;
	const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
	for (let f = 0; f < 150; f++) {
		const x = rnd() * w;
		const y = rnd() * h;
		const a = rnd() * Math.PI * 2;
		const len = 8 + rnd() * 26;
		const bend = (rnd() - 0.5) * 18;
		cc.strokeStyle = `rgba(255,255,255,${0.05 + rnd() * 0.09})`;
		for (const ox of [-w, 0, w])
			for (const oy of [-h, 0, h]) {
				cc.beginPath();
				cc.moveTo(x + ox, y + oy);
				cc.quadraticCurveTo(x + ox + Math.cos(a) * len * 0.5 - Math.sin(a) * bend, y + oy + Math.sin(a) * len * 0.5 + Math.cos(a) * bend, x + ox + Math.cos(a) * len, y + oy + Math.sin(a) * len);
				cc.stroke();
			}
	}

	const C = cc.getImageData(0, 0, w, h);
	const H = hc.getImageData(0, 0, w, h).data;
	const N = nc.createImageData(w, h);
	const at = (x: number, y: number) => H[(mod(y, h) * w + mod(x, w)) * 4] / 255;
	for (let y = 0; y < h; y++) {
		for (let x = 0; x < w; x++) {
			const p = (y * w + x) * 4;
			const light = (1 - o.shade + o.shade * (H[p] / 255)) * (0.955 + rnd() * 0.09);
			C.data[p] *= light;
			C.data[p + 1] *= light;
			C.data[p + 2] *= light;
			const nx = -(at(x + 1, y) - at(x - 1, y)) * o.bump;
			const ny = (at(x, y + 1) - at(x, y - 1)) * o.bump;
			const len = Math.hypot(nx, ny, 1);
			N.data[p] = (nx / len) * 127.5 + 127.5;
			N.data[p + 1] = (ny / len) * 127.5 + 127.5;
			N.data[p + 2] = (1 / len) * 127.5 + 127.5;
			N.data[p + 3] = 255;
		}
	}
	cc.putImageData(C, 0, 0);
	nc.putImageData(N, 0, 0);

	const tex = (canvas: HTMLCanvasElement, srgb: boolean) => {
		const t = new THREE.CanvasTexture(canvas);
		t.wrapS = t.wrapT = THREE.RepeatWrapping;
		t.anisotropy = 8;
		if (srgb) t.colorSpace = THREE.SRGBColorSpace;
		return t;
	};
	return { map: tex(colorCanvas, true), normalMap: tex(normalCanvas, false) };
}
