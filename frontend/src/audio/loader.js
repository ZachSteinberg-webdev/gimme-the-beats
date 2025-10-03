// Robust kit loader: accepts {baseUrl, files}, or flat map, or array of paths.
export async function loadKit(ctx, kit) {
	if (!ctx) throw new Error('loadKit: missing AudioContext');

	const normalize = (k) => {
		if (!k) throw new Error('loadKit: kit is undefined/null');

		// Shape 1: { baseUrl, files: { id: url, ... } }
		if (k.files && typeof k.files === 'object') {
			const base = (k.baseUrl ?? '/samples').replace(/\/+$/, '');
			const entries = Object.entries(k.files).map(([id, url]) => {
				const u = toAbs(url, base);
				return [id, u];
			});
			return { base: '', entries };
		}

		// Shape 2: flat map { id: url, ... }
		if (!Array.isArray(k) && typeof k === 'object') {
			const base = '/samples';
			const entries = Object.entries(k).map(([id, url]) => [id, toAbs(url, base)]);
			return { base: '', entries };
		}

		// Shape 3: array ["kit-808/kick.wav", ...] => ids = paths
		if (Array.isArray(k)) {
			const base = '/samples';
			const entries = k.map((url) => [url, toAbs(url, base)]);
			return { base: '', entries };
		}

		throw new Error('loadKit: unsupported kit format');
	};

	const toAbs = (url, base) => {
		// absolute already?
		if (/^https?:\/\//i.test(url) || url.startsWith('/')) return url;
		return `${base}/${url}`.replace(/\/{2,}/g, '/');
	};

	const { entries } = normalize(kit);
	const buffers = {};
	await Promise.all(
		entries.map(async ([id, url]) => {
			const res = await fetch(url);
			if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
			const arr = await res.arrayBuffer();
			const buf = await ctx.decodeAudioData(arr);
			buffers[id] = buf;
		})
	);
	return buffers;
}
