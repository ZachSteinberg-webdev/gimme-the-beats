import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { createDefaultProject, serializeProject, parseProject, createBlankProject } from '../domain/projectSnapshot.js';
import { engine } from '../audio/engineInstance.js';
import { SAMPLE_OPTIONS, sampleDisplayName } from '../audio/kit808.js';
import { api } from '../lib/api.js';

const MAX_TRACKS = 12;
const MIN_TRACKS = 1;

const ProjectCtx = createContext(null);

export function ProjectProvider({ children }) {
	const [project, setProject] = useState(() => createDefaultProject());
	const [projectId, setProjectId] = useState(null); // server `_id` when loaded/saved
	const [isPlaying, setIsPlaying] = useState(false);
	const [currentStep, setCurrentStep] = useState(0);

	const projectRef = useRef(project);
	useEffect(() => {
		projectRef.current = project;
	}, [project]);
	useEffect(() => {
		if (engine.setProjectSupplier) engine.setProjectSupplier(() => projectRef.current);
	}, []);

	useEffect(() => {
		engine.setBpm(project.bpm);
	}, [project.bpm]);
	useEffect(() => {
		engine.setSteps(project.steps);
	}, [project.steps]);
	useEffect(() => {
		engine.setSwing?.(project.swing ?? 0);
	}, [project.swing]);
	useEffect(() => {
		engine.setOnTick((step) => setCurrentStep(step));
	}, []);

	useEffect(() => {
		if (!isPlaying) return;
		for (const tr of project.tracks) {
			engine.addOrUpdateTrack(tr.id, {
				sampleId: tr.sampleId,
				gainDb: tr.gain ?? -6,
				pan: tr.pan ?? 0,
				reverbSendPct: tr.reverbSend ?? 0,
				delaySendPct: tr.delaySend ?? 0
			});
		}
		// Remove any engine tracks that no longer exist in the project
		try {
			const ids = new Set(project.tracks.map((t) => t.id));
			for (const id of Array.from(engine.tracks.keys())) {
				if (!ids.has(id)) engine.removeTrack(id);
			}
		} catch {}
	}, [project.tracks, isPlaying]);

	const newTrackId = () => `tr-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

	const actions = useMemo(
		() => ({
			play: async () => {
				if (isPlaying) return;
				await engine.play(projectRef.current);
				setIsPlaying(true);
			},
			stop: () => {
				if (!isPlaying) return;
				engine.stop();
				setIsPlaying(false);
			},
			setBpm: (bpm) => setProject((p) => ({ ...p, bpm })),
			setSteps: (steps) =>
				setProject((p) => ({
					...p,
					steps,
					tracks: p.tracks.map((t) => ({ ...t, pattern: resizePattern(t.pattern, steps) }))
				})),
			setSwing: (fraction) => setProject((p) => ({ ...p, swing: fraction })),

			// project meta
			setProjectTitle: (title) => setProject((p) => ({ ...p, title: title ?? p.title })),

			// velocity-aware edits
			toggleStep: (trackId, stepIndex) =>
				setProject((p) => ({
					...p,
					tracks: p.tracks.map((t) => (t.id === trackId ? { ...t, pattern: toggleVel(t.pattern, stepIndex) } : t))
				})),
			setStepVelocity: (trackId, stepIndex, vel) =>
				setProject((p) => ({
					...p,
					tracks: p.tracks.map((t) => (t.id === trackId ? { ...t, pattern: setVel(t.pattern, stepIndex, vel) } : t))
				})),

			// mute/solo
			toggleMute: (trackId) =>
				setProject((p) => ({
					...p,
					tracks: p.tracks.map((t) => (t.id === trackId ? { ...t, mute: !t.mute } : t))
				})),
			toggleSolo: (trackId) =>
				setProject((p) => {
					const target = p.tracks.find((t) => t.id === trackId);
					const nextSolo = !target?.solo;
					return {
						...p,
						tracks: p.tracks.map((t) =>
							t.id === trackId ? { ...t, solo: nextSolo } : { ...t, solo: nextSolo ? false : t.solo }
						)
					};
				}),

			// NEW: change a track’s sample (also update its display name)
			setTrackSample: (trackId, sampleId) =>
				setProject((p) => ({
					...p,
					tracks: p.tracks.map((t) => (t.id === trackId ? { ...t, sampleId, name: sampleDisplayName(sampleId) } : t))
				})),

			// NEW: per-track gain (dB) and pan (-1..1)
			setTrackGain: (trackId, gainDb) =>
				setProject((p) => ({
					...p,
					tracks: p.tracks.map((t) => (t.id === trackId ? { ...t, gain: clampDb(gainDb) } : t))
				})),
			setTrackPan: (trackId, pan) =>
				setProject((p) => ({
					...p,
					tracks: p.tracks.map((t) => (t.id === trackId ? { ...t, pan: clampPan(pan) } : t))
				})),
			setTrackPitch: (trackId, semitones) =>
				setProject((p) => ({
					...p,
					tracks: p.tracks.map((t) => (t.id === trackId ? { ...t, pitch: clampPitch(semitones) } : t))
				})),
			setTrackDecay: (trackId, ms) =>
				setProject((p) => ({
					...p,
					tracks: p.tracks.map((t) => (t.id === trackId ? { ...t, decay: clampDecay(ms) } : t))
				})),

			setTrackReverbSend: (trackId, pct) =>
				setProject((p) => ({
					...p,
					tracks: p.tracks.map((t) => (t.id === trackId ? { ...t, reverbSend: clampPct(pct) } : t))
				})),
			setTrackDelaySend: (trackId, pct) =>
				setProject((p) => ({
					...p,
					tracks: p.tracks.map((t) => (t.id === trackId ? { ...t, delaySend: clampPct(pct) } : t))
				})),

			// NEW: add/remove tracks with hard bounds 1..12

			reorderTracks: (fromIndex, toIndex) =>
				setProject((p) => {
					const from = Math.max(0, Math.min(p.tracks.length - 1, fromIndex | 0));
					const to = Math.max(0, Math.min(p.tracks.length - 1, toIndex | 0));
					if (from === to) return p;
					const tracks = p.tracks.slice();
					const [moved] = tracks.splice(from, 1);
					tracks.splice(to, 0, moved);
					return { ...p, tracks };
				}),
			addTrack: () =>
				setProject((p) => {
					if (p.tracks.length >= MAX_TRACKS) return p;
					const sampleId = SAMPLE_OPTIONS[0];
					const t = {
						id: newTrackId(),
						name: sampleDisplayName(sampleId),
						sampleId,
						gain: -6,
						pan: 0,
						pitch: 0,
						decay: 300, // ms
						reverbSend: 0,
						delaySend: 0,
						mute: false,
						solo: false,
						pattern: new Array(p.steps).fill(0)
					};
					return { ...p, tracks: [...p.tracks, t] };
				}),
			removeTrack: (trackId) =>
				setProject((p) => {
					if (p.tracks.length <= MIN_TRACKS) return p;
					// tell engine to drop nodes for this track immediately
					try {
						engine.removeTrack(trackId);
					} catch {}
					return { ...p, tracks: p.tracks.filter((t) => t.id !== trackId) };
				}),

			// Replace entire project snapshot (e.g., Load)
			loadProject: (snapshot) => setProject(snapshot),
			// Track the current server id for Save/Update flows
			setLoadedProjectId: (id) => setProjectId(id ?? null),

			// Start a new blank project with 4 default tracks (no steps)
			// BPM resets to 120 and Swing to 0; steps match current project
			newProject: async () => {
				if (!projectId) {
					throw new Error('Save the current project before creating a new one.');
				}
				try {
					await api.post('/projects/new', { currentProjectId: projectId });
					setProject((p) => createBlankProject({ bpm: 120, steps: p.steps, swing: 0 }));
					setProjectId(null);
					return true;
				} catch (err) {
					console.error('Failed to start a new project', err);
					throw err;
				}
			}
		}),
		[isPlaying, projectId]
	);

	// --- Guest autosave (localStorage) ---
	const LS_KEY = 'bm.guest.project.v1';

	// Load from localStorage on mount
	useEffect(() => {
		try {
			const raw = window.localStorage?.getItem(LS_KEY);
			if (raw) {
				const parsed = parseProject(raw);
				if (parsed && typeof parsed === 'object') setProject(parsed);
			}
		} catch {}
		// no deps — run once
	}, []);

	// Debounced save on project change
	const saveTimerRef = useRef(null);
	useEffect(() => {
		try {
			if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
			saveTimerRef.current = setTimeout(() => {
				try {
					const json = serializeProject({ ...project, updatedAt: Date.now() });
					window.localStorage?.setItem(LS_KEY, json);
				} catch {}
			}, 300);
		} catch {}
		return () => {
			if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
		};
	}, [project]);

	// Flush on unload to be safe
	useEffect(() => {
		const onUnload = () => {
			try {
				window.localStorage?.setItem(LS_KEY, serializeProject({ ...project, updatedAt: Date.now() }));
			} catch {}
		};
		window.addEventListener('beforeunload', onUnload);
		return () => window.removeEventListener('beforeunload', onUnload);
	}, [project]);

	return (
		<ProjectCtx.Provider value={{ project, projectId, actions, isPlaying, currentStep, sampleOptions: SAMPLE_OPTIONS }}>
			{children}
		</ProjectCtx.Provider>
	);
}

export function useProject() {
	const ctx = useContext(ProjectCtx);
	if (!ctx) throw new Error('useProject must be used within ProjectProvider');
	return ctx;
}

// --- helpers ---
function toggleVel(pattern, i) {
	const next = pattern.slice();
	const idx = i % next.length;
	next[idx] = next[idx] > 0 ? 0 : 100;
	return next;
}
function setVel(pattern, i, vel) {
	const next = pattern.slice();
	const idx = i % next.length;
	next[idx] = Math.max(0, Math.min(127, vel | 0));
	return next;
}
function resizePattern(pattern, steps) {
	const out = new Array(steps);
	for (let i = 0; i < steps; i++) out[i] = pattern[i % pattern.length] | 0;
	return out;
}

function clampDb(db) {
	const n = Math.round(db);
	return Math.max(-60, Math.min(12, n));
}
function clampPan(p) {
	const n = typeof p === 'number' ? p : 0;
	return Math.max(-1, Math.min(1, n));
}
function clampPitch(semi) {
	const n = Math.round(semi);
	return Math.max(-24, Math.min(24, n));
}
function clampDecay(ms) {
	const n = Math.round(ms);
	return Math.max(20, Math.min(5000, n)); // 20ms .. 5s
}
function clampPct(p) {
	const n = Math.round(p);
	return Math.max(0, Math.min(100, n));
}
