const clampNumber = (value, min, max, fallback) => {
	const num = Number(value);
	if (Number.isFinite(num)) return Math.max(min, Math.min(max, num));
	return fallback;
};

function sanitizeTrack(raw = {}, steps = 16) {
	const pattern = Array.isArray(raw.pattern)
		? raw.pattern
				.map((n, idx) => {
					const num = Number(n);
					if (!Number.isFinite(num)) return 0;
					return Math.max(0, Math.min(127, Math.round(num)));
				})
				.slice(0, steps)
		: [];

	while (pattern.length < steps) pattern.push(0);

	return {
		id: typeof raw.id === 'string' && raw.id.trim() ? raw.id.trim() : `tr-${Math.random().toString(36).slice(2, 8)}`,
		name: typeof raw.name === 'string' && raw.name.trim() ? raw.name.trim() : 'Track',
		sampleId: typeof raw.sampleId === 'string' && raw.sampleId.trim() ? raw.sampleId : 'kit-808/kick.wav',
		gain: clampNumber(raw.gain, -60, 12, -6),
		pan: clampNumber(raw.pan, -1, 1, 0),
		pitch: clampNumber(raw.pitch, -24, 24, 0),
		decay: clampNumber(raw.decay, 1, 10000, 300),
		reverbSend: clampNumber(raw.reverbSend, 0, 100, 0),
		delaySend: clampNumber(raw.delaySend, 0, 100, 0),
		mute: Boolean(raw.mute),
		solo: Boolean(raw.solo),
		pattern
	};
}

function sanitizeProjectPayload(raw = {}) {
	const title = typeof raw.title === 'string' && raw.title.trim() ? raw.title.trim() : 'Untitled Beat';
	const steps = clampNumber(raw.steps, 1, 128, 16);
	const swing = clampNumber(raw.swing, 0, 1, 0);
	const bpm = clampNumber(raw.bpm, 40, 300, 120);
	const tracks = Array.isArray(raw.tracks) ? raw.tracks.map((t) => sanitizeTrack(t, steps)) : [];

	const sanitized = {
		title,
		steps,
		swing,
		bpm,
		tracks,
		version: Number.isInteger(raw.version) ? raw.version : 1
	};

	if (raw._id) sanitized._id = raw._id;
	return sanitized;
}

function applyProjectUpdate(doc, payload = {}) {
	const sanitized = sanitizeProjectPayload({ ...doc.toObject(), ...payload });
	doc.set({
		title: sanitized.title,
		steps: sanitized.steps,
		swing: sanitized.swing,
		bpm: sanitized.bpm,
		tracks: sanitized.tracks,
		version: sanitized.version,
		updatedAt: new Date()
	});
}

function coerceDate(value, fallback) {
	if (!value) return fallback;
	const date = new Date(value);
	return Number.isNaN(date.getTime()) ? fallback : date;
}

function createProjectFromPayload(payload = {}) {
	const project = sanitizeProjectPayload(payload);
	delete project._id;
	const now = new Date();
	return {
		...project,
		createdAt: coerceDate(payload.createdAt, now),
		updatedAt: coerceDate(payload.updatedAt, now)
	};
}

module.exports = {
	sanitizeProjectPayload,
	sanitizeTrack,
	applyProjectUpdate,
	createProjectFromPayload
};
