// Pluggable target: "memory" now; later "indexeddb" (guest) and "remote" (API)
export const makeStorage = (impl) => ({
	load: impl.load,
	save: impl.save,
	list: impl.list
});

// Memory stub to unblock dev:
export const memoryStorage = () => {
	let store = new Map();
	return makeStorage({
		async load(id) {
			return store.get(id) || null;
		},
		async save(id, snapshot) {
			store.set(id, snapshot);
			return { id };
		},
		async list() {
			return Array.from(store.keys());
		}
	});
};

// LocalStorage adapter for guest users
// - Stores JSON strings under keys
// - Simple namespace prefix to avoid collisions
export const localStorageStorage = (namespace = 'bm') => {
	const prefix = `${namespace}:`;
	const safeGet = (k) => {
		try {
			return window.localStorage.getItem(k);
		} catch {
			return null;
		}
	};
	const safeSet = (k, v) => {
		try {
			window.localStorage.setItem(k, v);
		} catch {}
	};
	const safeKeys = () => {
		try {
			return Object.keys(window.localStorage);
		} catch {
			return [];
		}
	};
	return makeStorage({
		async load(id) {
			const raw = safeGet(prefix + id);
			return raw ?? null;
		},
		async save(id, snapshotJson) {
			safeSet(prefix + id, snapshotJson);
			return { id };
		},
		async list() {
			return safeKeys()
				.filter((k) => k.startsWith(prefix))
				.map((k) => k.slice(prefix.length));
		}
	});
};
