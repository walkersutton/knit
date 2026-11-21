/** The box round a picture's visible pixels, or the whole picture if nothing is visible. */
function opaqueBox(bitmap: ImageBitmap) {
	const { width: w, height: h } = bitmap;
	const ctx = new OffscreenCanvas(w, h).getContext('2d')!;
	ctx.drawImage(bitmap, 0, 0);
	const alpha = ctx.getImageData(0, 0, w, h).data;
	let x0 = w, y0 = h, x1 = -1, y1 = -1;
	for (let y = 0; y < h; y++)
		for (let x = 0; x < w; x++)
			if (alpha[(y * w + x) * 4 + 3] > 8) {
				if (x < x0) x0 = x;
				if (x > x1) x1 = x;
				if (y < y0) y0 = y;
				if (y > y1) y1 = y;
			}
	return x1 < 0 ? { x: 0, y: 0, w, h } : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

/**
 * A transparent PNG of the 3D model is far too big to store, so it is set on a flat background as a small JPEG
 * and handed back as base64 (no `data:` prefix), ready to send to the server.
 */
export async function jpegStill(png: Blob, size: { width: number; height: number; background: string; fill?: number; trim?: boolean }): Promise<string> {
	const { width: W, height: H, background, fill = 0.94, trim = false } = size;
	const bitmap = await createImageBitmap(png);
	// With `trim`, the empty margin the 3D camera leaves round the garment is cut away, so the garment fills the frame.
	const src = trim ? opaqueBox(bitmap) : { x: 0, y: 0, w: bitmap.width, h: bitmap.height };
	const canvas = document.createElement('canvas');
	canvas.width = W;
	canvas.height = H;
	const ctx = canvas.getContext('2d')!;
	ctx.fillStyle = background;
	ctx.fillRect(0, 0, W, H);
	const scale = Math.min((W * fill) / src.w, (H * fill) / src.h);
	ctx.drawImage(bitmap, src.x, src.y, src.w, src.h, (W - src.w * scale) / 2, (H - src.h * scale) / 2, src.w * scale, src.h * scale);
	bitmap.close();
	const jpeg = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9));
	if (!jpeg) throw new Error('could not encode the picture');
	const url = await new Promise<string>((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(String(reader.result));
		reader.onerror = reject;
		reader.readAsDataURL(jpeg);
	});
	return url.slice(url.indexOf(',') + 1);
}
