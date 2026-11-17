import { describe, expect, it } from 'vitest';
import { encodeGif, type Frame } from './gif';

/** A minimal GIF reader, just enough to check what the encoder wrote: frames as palette colours. */
async function decode(blob: Blob) {
	const b = new Uint8Array(await blob.arrayBuffer());
	const text = (from: number, n: number) => String.fromCharCode(...b.slice(from, from + n));
	expect(text(0, 6)).toBe('GIF89a');
	const width = b[6] | (b[7] << 8);
	const height = b[8] | (b[9] << 8);
	let p = 13;
	const palette = b.slice(p, p + 768);
	p += 768;
	let loops = false;
	const frames: Uint8Array[] = [];
	const delays: number[] = [];
	while (b[p] !== 0x3b) {
		if (b[p] === 0x21) {
			const label = b[p + 1];
			if (label === 0xf9) delays.push(b[p + 4] | (b[p + 5] << 8));
			if (label === 0xff) loops = true;
			p += 2;
			while (b[p]) p += b[p] + 1;
			p++;
		} else {
			expect(b[p]).toBe(0x2c);
			p += 10;
			const min = b[p++];
			const data: number[] = [];
			while (b[p]) (data.push(...b.slice(p + 1, p + 1 + b[p])), (p += b[p] + 1));
			p++;
			frames.push(lzwDecode(data, min, width * height));
		}
	}
	return { width, height, palette, frames, loops, delays };
}

function lzwDecode(data: number[], min: number, total: number): Uint8Array {
	const clear = 1 << min;
	const eoi = clear + 1;
	const out: number[] = [];
	let table: number[][] = [];
	const reset = () => {
		table = Array.from({ length: clear }, (_, i) => [i]);
		table.push([], []);
	};
	reset();
	let size = min + 1;
	let acc = 0;
	let nbits = 0;
	let prev: number[] | null = null;
	let at = 0;
	while (out.length < total) {
		while (nbits < size) (acc |= data[at++] << nbits), (nbits += 8);
		const code = acc & ((1 << size) - 1);
		acc >>>= size;
		nbits -= size;
		if (code === clear) {
			reset();
			size = min + 1;
			prev = null;
			continue;
		}
		if (code === eoi) break;
		let entry: number[];
		if (code < table.length) entry = table[code];
		else entry = [...prev!, prev![0]];
		out.push(...entry);
		if (prev) table.push([...prev, entry[0]]);
		prev = entry;
		if (table.length === 1 << size && size < 12) size++;
	}
	return Uint8Array.from(out.slice(0, total));
}

const solid = (w: number, h: number, rgb: number[]) => Uint8ClampedArray.from({ length: w * h * 4 }, (_, i) => (i % 4 === 3 ? 255 : rgb[i % 4]));

/** A frame with a coloured block that moves, and noisy-looking gradients so the LZW table fills up. */
function frame(w: number, h: number, step: number): Frame {
	const data = solid(w, h, [246, 237, 213]);
	for (let y = 0; y < h; y++)
		for (let x = 0; x < w; x++) {
			const i = (y * w + x) * 4;
			if (x >= step * 4 && x < step * 4 + 10 && y > 8 && y < h - 8) data.set([200, 84, 62], i);
			else if (y > h - 6) data.set([Math.min(255, 120 + x), 150, 130 + ((x * 7) % 90)], i);
		}
	return { data, width: w, height: h };
}

describe('encodeGif', () => {
	const bg: [number, number, number] = [246, 237, 213];

	it('writes a valid GIF that decodes back to the picture', async () => {
		const frames = [0, 1, 2, 3].map((s) => frame(64, 48, s));
		const gif = await decode(await encodeGif(frames, { delay: 50, background: bg }));
		expect([gif.width, gif.height, gif.frames.length]).toEqual([64, 48, 4]);
		expect(gif.delays).toEqual([5, 5, 5, 5]);
		expect(gif.loops).toBe(false); // plays once
		expect([...gif.palette.slice(0, 3)]).toEqual(bg); // entry 0 is the background, exactly
		let worst = 0;
		gif.frames.forEach((indices, f) =>
			indices.forEach((c, p) => {
				for (let k = 0; k < 3; k++) worst = Math.max(worst, Math.abs(gif.palette[c * 3 + k] - frames[f].data[p * 4 + k]));
			})
		);
		expect(worst).toBeLessThan(10); // a gradient of ~90 shades fits the palette to within a step or two
	});

	it('keeps a flat background exactly flat', async () => {
		const flat = { data: solid(40, 30, bg), width: 40, height: 30 };
		const gif = await decode(await encodeGif([flat, flat], { delay: 40, background: bg }));
		for (const indices of gif.frames) expect(new Set(indices)).toEqual(new Set([0]));
	});

	it('loops when asked to, and survives a table fill (lots of detail)', async () => {
		const w = 120;
		const h = 120;
		const data = new Uint8ClampedArray(w * h * 4);
		for (let i = 0; i < w * h; i++) data.set([(i * 37) % 256, (i * 91) % 256, (i * 13 + (i >> 5)) % 256, 255], i * 4);
		const gif = await decode(await encodeGif([{ data, width: w, height: h }], { delay: 40, background: bg, loop: true }));
		expect(gif.loops).toBe(true);
		expect(gif.frames[0].length).toBe(w * h);
	});
});
