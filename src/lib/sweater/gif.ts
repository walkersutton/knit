/**
 * A small GIF encoder: one 256-colour palette for the whole animation (median cut), LZW-packed frames.
 * It exists so the home page can keep a short turntable of each sweater as a few KB of picture instead of a
 * 3D model. The first palette entry is always `background` exactly, so flat backgrounds stay flat.
 */

export type Frame = { data: Uint8ClampedArray | Uint8Array; width: number; height: number };

/** 6 bits per channel: fine enough that soft shading on the yarn does not band. */
const key5 = (r: number, g: number, b: number) => ((r >> 2) << 12) | ((g >> 2) << 6) | (b >> 2);
const KEYS = 1 << 18;

/** 256 colours (r,g,b triples) for a set of frames, with `background` as entry 0. */
export function buildPalette(frames: Frame[], background: [number, number, number]): Uint8Array {
	const count = new Uint32Array(KEYS);
	const sum = new Float64Array(KEYS * 3);
	for (const { data } of frames)
		// Every second pixel is plenty to find the colours of a picture this size.
		for (let i = 0; i < data.length; i += 8) {
			const k = key5(data[i], data[i + 1], data[i + 2]);
			count[k]++;
			sum[k * 3] += data[i];
			sum[k * 3 + 1] += data[i + 1];
			sum[k * 3 + 2] += data[i + 2];
		}
	const all: number[] = [];
	for (let k = 0; k < KEYS; k++) if (count[k]) all.push(k);

	const channel = (k: number, c: number) => (c === 0 ? k >> 12 : c === 1 ? (k >> 6) & 63 : k & 63);
	const range = (box: number[], c: number) => {
		let lo = 63;
		let hi = 0;
		for (const k of box) {
			const v = channel(k, c);
			if (v < lo) lo = v;
			if (v > hi) hi = v;
		}
		return hi - lo;
	};
	const boxes: number[][] = [all];
	// Median cut: split the box with the most pixels along its widest channel, at the pixel-weighted middle.
	while (boxes.length < 255) {
		let best = -1;
		let bestPixels = 0;
		boxes.forEach((box, i) => {
			if (box.length < 2) return;
			const pixels = box.reduce((n, k) => n + count[k], 0);
			if (pixels > bestPixels) (best = i), (bestPixels = pixels);
		});
		if (best < 0) break;
		const box = boxes[best];
		const widest = [0, 1, 2].sort((a, b) => range(box, b) - range(box, a))[0];
		box.sort((a, b) => channel(a, widest) - channel(b, widest));
		let seen = 0;
		let cut = 1;
		for (let i = 0; i < box.length - 1; i++) {
			seen += count[box[i]];
			cut = i + 1;
			if (seen * 2 >= bestPixels) break;
		}
		boxes.splice(best, 1, box.slice(0, cut), box.slice(cut));
	}

	const palette = new Uint8Array(768);
	palette.set(background, 0);
	boxes.forEach((box, i) => {
		let n = 0;
		const rgb = [0, 0, 0];
		for (const k of box) {
			n += count[k];
			for (let c = 0; c < 3; c++) rgb[c] += sum[k * 3 + c];
		}
		if (n) palette.set(rgb.map((v) => Math.round(v / n)), (i + 1) * 3);
	});
	return palette;
}

/** The palette index of every pixel. Close colours share an index, via a 5-bit-per-channel lookup. */
export function indexFrame(frame: Frame, palette: Uint8Array, lookup: Int16Array): Uint8Array {
	const { data } = frame;
	const out = new Uint8Array(frame.width * frame.height);
	for (let p = 0, i = 0; p < out.length; p++, i += 4) {
		const k = key5(data[i], data[i + 1], data[i + 2]);
		let idx = lookup[k];
		if (idx < 0) {
			let bestDist = Infinity;
			for (let c = 0; c < 256; c++) {
				const dr = palette[c * 3] - data[i];
				const dg = palette[c * 3 + 1] - data[i + 1];
				const db = palette[c * 3 + 2] - data[i + 2];
				const dist = dr * dr + dg * dg + db * db;
				if (dist < bestDist) (bestDist = dist), (idx = c);
			}
			lookup[k] = idx;
		}
		out[p] = idx;
	}
	return out;
}

/**
 * GIF's variable-width LZW: codes start at 9 bits and grow to 12, with a clear code when the table fills.
 * The string table is an open-addressed hash in typed arrays, which is several times faster than a Map.
 */
const HASH = 1 << 13;
const hashKeys = new Int32Array(HASH);
const hashCodes = new Int16Array(HASH);
export function lzw(indices: Uint8Array): Uint8Array {
	const minSize = 8;
	const clear = 1 << minSize;
	const eoi = clear + 1;
	// Worst case is about 12 bits per pixel; a generous bound avoids any growth.
	const out = new Uint8Array(Math.ceil((indices.length * 13) / 8) + 16);
	let n = 0;
	let acc = 0;
	let nbits = 0;
	let size = minSize + 1;
	let next = eoi + 1;
	hashKeys.fill(-1);
	const emit = (code: number) => {
		acc |= code << nbits;
		nbits += size;
		while (nbits >= 8) {
			out[n++] = acc & 255;
			acc >>>= 8;
			nbits -= 8;
		}
	};
	emit(clear);
	let current = indices[0];
	for (let i = 1; i < indices.length; i++) {
		const k = indices[i];
		const key = (current << 8) | k;
		let h = (Math.imul(key, 2654435761) >>> 19) & (HASH - 1);
		let hit = -1;
		while (hashKeys[h] !== -1) {
			if (hashKeys[h] === key) {
				hit = hashCodes[h];
				break;
			}
			h = (h + 1) & (HASH - 1);
		}
		if (hit >= 0) {
			current = hit;
			continue;
		}
		emit(current);
		if (next === 4096) {
			emit(clear);
			next = eoi + 1;
			size = minSize + 1;
			hashKeys.fill(-1);
		} else {
			if (next >= 1 << size) size++;
			hashKeys[h] = key;
			hashCodes[h] = next++;
		}
		current = k;
	}
	emit(current);
	emit(eoi);
	if (nbits > 0) out[n++] = acc & 255;
	return out.subarray(0, n);
}

const le16 = (n: number) => [n & 255, (n >> 8) & 255];
const idle = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

/**
 * Encodes frames of equal size as a GIF. Plays once and stops on the last frame unless `loop` is set.
 * Gives the browser a moment between frames, so a long animation never blocks the page.
 */
export async function encodeGif(frames: Frame[], opts: { delay: number; background: [number, number, number]; loop?: boolean }): Promise<Blob> {
	const { width, height } = frames[0];
	const palette = buildPalette(frames, opts.background);
	const lookup = new Int16Array(KEYS).fill(-1);
	const parts: BlobPart[] = [];
	const head: number[] = [...'GIF89a'].map((c) => c.charCodeAt(0));
	// Logical screen: a global colour table of 256 entries; background index 0.
	head.push(...le16(width), ...le16(height), 0xf7, 0, 0, ...palette);
	if (opts.loop) head.push(0x21, 0xff, 11, ...[...'NETSCAPE2.0'].map((c) => c.charCodeAt(0)), 3, 1, 0, 0, 0);
	parts.push(new Uint8Array(head));
	for (let f = 0; f < frames.length; f++) {
		const packed = lzw(indexFrame(frames[f], palette, lookup));
		// Graphic control (keep the previous frame underneath; delay in 1/100 s), then the frame itself.
		const blocks = new Uint8Array(8 + 10 + 2 + packed.length + Math.ceil(packed.length / 255) + 1);
		let n = 0;
		for (const b of [0x21, 0xf9, 4, 0x04, ...le16(Math.round(opts.delay / 10)), 0, 0, 0x2c, 0, 0, 0, 0, ...le16(width), ...le16(height), 0, 8]) blocks[n++] = b;
		for (let at = 0; at < packed.length; at += 255) {
			const len = Math.min(255, packed.length - at);
			blocks[n++] = len;
			blocks.set(packed.subarray(at, at + len), n);
			n += len;
		}
		blocks[n++] = 0;
		parts.push(blocks.subarray(0, n));
		// Frames are quick now; only give the page a breather every few.
		if (f % 8 === 7) await idle();
	}
	parts.push(new Uint8Array([0x3b]));
	return new Blob(parts, { type: 'image/gif' });
}
