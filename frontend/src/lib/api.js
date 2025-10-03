const base = '/api';

async function request(path, opts = {}) {
	const res = await fetch(base + path, {
		credentials: 'include',
		headers: { 'Content-Type': 'application/json' },
		...opts
	});
	if (!res.ok) throw new Error(`HTTP ${res.status}`);
	return res.json();
}

export const api = {
	get: (path) => request(path),
	post: (path, body) => request(path, { method: 'POST', body: JSON.stringify(body) }),
	put: (path, body) => request(path, { method: 'PUT', body: JSON.stringify(body) }),
	del: (path) => request(path, { method: 'DELETE' })
};
