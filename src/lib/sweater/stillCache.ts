/** Drawn garment pictures kept in the browser, so a page of them is not redrawn on every visit. */
const DB = 'knit-stills';
const STORE = 'stills';
/** Bump when the drawing changes enough that old pictures would look wrong. */
const VERSION = 'v1';
const KEEP = 400;

let opened: Promise<IDBDatabase | null> | undefined;

function open(): Promise<IDBDatabase | null> {
	opened ??= new Promise((resolve) => {
		try {
			const req = indexedDB.open(DB, 1);
			req.onupgradeneeded = () => req.result.createObjectStore(STORE);
			req.onsuccess = () => resolve(req.result);
			req.onerror = () => resolve(null);
		} catch {
			resolve(null);
		}
	});
	return opened;
}

const idOf = (design: unknown) => `${VERSION}:${JSON.stringify(design)}`;

export async function readStill(design: unknown): Promise<Blob | null> {
	const db = await open();
	if (!db) return null;
	return new Promise((resolve) => {
		try {
			const req = db.transaction(STORE).objectStore(STORE).get(idOf(design));
			req.onsuccess = () => resolve(req.result?.blob ?? null);
			req.onerror = () => resolve(null);
		} catch {
			resolve(null);
		}
	});
}

export async function writeStill(design: unknown, blob: Blob): Promise<void> {
	const db = await open();
	if (!db) return;
	try {
		const store = db.transaction(STORE, 'readwrite').objectStore(STORE);
		store.put({ blob, at: Date.now() }, idOf(design));
		const count = store.count();
		count.onsuccess = () => {
			if (count.result <= KEEP) return;
			// Over the limit: drop the oldest pictures.
			const all = store.openCursor();
			const rows: { key: IDBValidKey; at: number }[] = [];
			all.onsuccess = () => {
				const cursor = all.result;
				if (cursor) {
					rows.push({ key: cursor.key, at: cursor.value.at });
					cursor.continue();
				} else {
					rows.sort((a, b) => a.at - b.at).slice(0, rows.length - KEEP).forEach((r) => store.delete(r.key));
				}
			};
		};
	} catch {
		// Not remembered; it will just be drawn again next time.
	}
}
