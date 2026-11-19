/**
 * A transparent PNG of the 3D model is far too big to store, so it is set on a flat background as a small JPEG
 * and handed back as base64 (no `data:` prefix), ready to send to the server.
 */
export async function jpegStill(png: Blob, size: { width: number; height: number; background: string; fill?: number }): Promise<string> {
	const { width: W, height: H, background, fill = 0.94 } = size;
	const bitmap = await createImageBitmap(png);
	const canvas = document.createElement('canvas');
	canvas.width = W;
	canvas.height = H;
	const ctx = canvas.getContext('2d')!;
	ctx.fillStyle = background;
	ctx.fillRect(0, 0, W, H);
	const scale = Math.min((W * fill) / bitmap.width, (H * fill) / bitmap.height);
	ctx.drawImage(bitmap, (W - bitmap.width * scale) / 2, (H - bitmap.height * scale) / 2, bitmap.width * scale, bitmap.height * scale);
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
