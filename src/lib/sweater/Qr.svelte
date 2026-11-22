<script lang="ts">
	import QRCode from 'qrcode';

	let { url, label }: { url: string; label: string } = $props();

	/** One path of unit squares, one per dark module, drawn on a grid with a one-module quiet zone. */
	let code = $derived.by(() => {
		const { size, data } = QRCode.create(url, { errorCorrectionLevel: 'L' }).modules;
		let d = '';
		for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (data[y * size + x]) d += `M${x + 1} ${y + 1}h1v1h-1z`;
		return { size: size + 2, d };
	});
</script>

<svg class="qr" viewBox="0 0 {code.size} {code.size}" role="img" aria-label="QR code for {label}" shape-rendering="crispEdges">
	<rect width={code.size} height={code.size} fill="#fff" />
	<path d={code.d} fill="#000" />
</svg>

<style>
	.qr {
		display: block;
		width: 13mm;
		height: 13mm;
	}
</style>
