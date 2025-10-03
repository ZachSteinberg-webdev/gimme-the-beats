import { dbToGain, clamp } from './utils.js';
import { loadKit } from './loader.js';
import { KIT_808 } from './kit808.js';

export class AudioEngine {
	constructor() {
		this.ctx = null;
		this.masterGain = null;
		this.masterComp = null;

		this.tracks = new Map(); // trackId -> { gainNode, panNode, sampleId, rvbSend, dlySend }
		this.kitBuffers = {}; // sampleId -> AudioBuffer

		this.isPlaying = false;
		this.bpm = 120;
		this.steps = 16;
		this.stepIndex = 0;
		this.swing = 0;

		this.scheduleAheadSec = 0.12;
		this.schedulerIntervalMs = 25;
		this._timerId = null;
		this._nextNoteTime = 0;

		this._onTick = null;
		this._projectSupplier = null;

		this.fx = null; // { reverb: { convolver, wet }, delay: { delay, feedback, filter, wet } }
	}

	async init() {
		if (this.ctx) return;
		this.ctx = new (window.AudioContext || window.webkitAudioContext)();

		this.masterGain = this.ctx.createGain();
		this.masterGain.gain.value = dbToGain(-3);

		this.masterComp = this.ctx.createDynamicsCompressor();
		this.masterComp.threshold.value = -6;
		this.masterComp.knee.value = 24;
		this.masterComp.ratio.value = 6;
		this.masterComp.attack.value = 0.003;
		this.masterComp.release.value = 0.25;

		this.masterGain.connect(this.masterComp);
		this.masterComp.connect(this.ctx.destination);

		// Create FX returns and route to masterGain (so they hit the compressor)
		this._initFx();

		// Load scheduler AudioWorklet once (if supported)
		try {
			if (!this._workletLoaded && this.ctx.audioWorklet) {
				await this.ctx.audioWorklet.addModule('/src/audio/scheduler-processor.js');
				this._workletLoaded = true;

				console.log('Using AudioWorklet scheduler');
			}
		} catch (err) {
			console.warn('AudioWorklet not available, falling back to setInterval scheduler.', err);
			this._workletLoaded = false;
		}

		this.kitBuffers = await loadKit(this.ctx, KIT_808);
	}

	setProjectSupplier(fn) {
		this._projectSupplier = fn;
	}
	setOnTick(cb) {
		this._onTick = cb;
	}
	setBpm(bpm) {
		this.bpm = Math.max(20, Math.min(300, bpm | 0));
	}
	setSteps(n) {
		this.steps = Math.max(1, Math.min(128, n | 0));
	}
	setSwing(fraction) {
		this.swing = clamp(fraction, 0, 0.6);
	}

	_initFx() {
		const ctx = this.ctx;
		// Reverb: simple generated impulse convolver
		const convolver = ctx.createConvolver();
		convolver.normalize = true;
		convolver.buffer = this._makeImpulseResponse(ctx, 2.2, 2.5);
		const revWet = ctx.createGain();
		revWet.gain.value = 0.9;
		convolver.connect(revWet);
		revWet.connect(this.masterGain);

		// Delay: 1/4 note default, feedback, gentle LPF on repeats
		const delay = ctx.createDelay(2.0);
		delay.delayTime.value = 0.25; // seconds
		const fb = ctx.createGain();
		fb.gain.value = 0.35;
		const filt = ctx.createBiquadFilter();
		filt.type = 'lowpass';
		filt.frequency.value = 4000;
		const dlyWet = ctx.createGain();
		dlyWet.gain.value = 0.9;
		// wire
		delay.connect(filt);
		filt.connect(dlyWet);
		dlyWet.connect(this.masterGain);
		// feedback loop
		filt.connect(fb);
		fb.connect(delay);

		this.fx = { reverb: { convolver, wet: revWet }, delay: { delay, feedback: fb, filter: filt, wet: dlyWet } };
	}

	_makeImpulseResponse(ctx, seconds = 2.0, decay = 2.0) {
		const rate = ctx.sampleRate;
		const length = Math.max(1, Math.floor(seconds * rate));
		const ir = ctx.createBuffer(2, length, rate);
		for (let ch = 0; ch < 2; ch++) {
			const data = ir.getChannelData(ch);
			for (let i = 0; i < length; i++) {
				const x = (length - i) / length;
				data[i] = (Math.random() * 2 - 1) * Math.pow(x, decay);
			}
		}
		return ir;
	}

	addOrUpdateTrack(trackId, { sampleId, gainDb = -6, pan = 0, reverbSendPct = 0, delaySendPct = 0 }) {
		if (!this.ctx) throw new Error('AudioEngine not initialized');
		let t = this.tracks.get(trackId);
		if (!t) {
			const gainNode = this.ctx.createGain();
			const panNode = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;
			gainNode.gain.value = dbToGain(gainDb);

			if (panNode) {
				panNode.pan.value = clamp(pan, -1, 1);
				gainNode.connect(panNode);
				panNode.connect(this.masterGain);
			} else {
				gainNode.connect(this.masterGain);
			}
			// Per-track send gains
			const rvbSend = this.ctx.createGain();
			const dlySend = this.ctx.createGain();
			rvbSend.gain.value = Math.max(0, Math.min(1, reverbSendPct / 100));
			dlySend.gain.value = Math.max(0, Math.min(1, delaySendPct / 100));
			// Route sends to FX returns
			if (this.fx?.reverb?.convolver) rvbSend.connect(this.fx.reverb.convolver);
			if (this.fx?.delay?.delay) dlySend.connect(this.fx.delay.delay);

			t = { gainNode, panNode, sampleId, rvbSend, dlySend };
			this.tracks.set(trackId, t);
		} else {
			t.sampleId = sampleId ?? t.sampleId;
			t.gainNode.gain.value = dbToGain(gainDb);
			if (t.panNode) t.panNode.pan.value = clamp(pan, -1, 1);
			if (t.rvbSend) t.rvbSend.gain.value = Math.max(0, Math.min(1, reverbSendPct / 100));
			if (t.dlySend) t.dlySend.gain.value = Math.max(0, Math.min(1, delaySendPct / 100));
		}
	}

	// NEW: cleanly remove a track’s nodes if a track is deleted
	removeTrack(trackId) {
		const t = this.tracks.get(trackId);
		if (!t) return;
		try {
			if (t.panNode) t.panNode.disconnect();
			if (t.gainNode) t.gainNode.disconnect();
			if (t.rvbSend) t.rvbSend.disconnect();
			if (t.dlySend) t.dlySend.disconnect();
		} catch {}
		this.tracks.delete(trackId);
	}

	_scheduleStepHit(track, step, whenSec, pattern, params) {
		const vel = pattern[step] | 0;
		if (vel <= 0) return;

		const buffer = this.kitBuffers[track.sampleId];
		if (!buffer) return;

		const src = this.ctx.createBufferSource();
		src.buffer = buffer;

		// Apply pitch in semitones via playbackRate
		const st = (params?.pitch ?? 0) | 0;
		const rate = Math.pow(2, st / 12);
		src.playbackRate.setValueAtTime(rate, whenSec);

		const vGain = this.ctx.createGain();
		const amp = Math.pow(clamp(vel / 127, 0, 1), 1.6);

		// Simple decay envelope (ms -> seconds)
		const decayMs = (params?.decayMs ?? 300) | 0;
		const decaySec = Math.max(0.02, decayMs / 1000);
		vGain.gain.setValueAtTime(amp, whenSec);
		vGain.gain.linearRampToValueAtTime(0.0001, whenSec + decaySec);

		src.connect(vGain);
		vGain.connect(track.gainNode); // dry
		// sends
		if (track.rvbSend) vGain.connect(track.rvbSend);
		if (track.dlySend) vGain.connect(track.dlySend);
		src.start(whenSec);
	}

	_schedulerTick(projectParam) {
		const project = this._projectSupplier ? this._projectSupplier() : projectParam;

		if (this.bpm !== (project.bpm | 0)) this.setBpm(project.bpm | 0);
		if (this.steps !== (project.steps | 0)) this.setSteps(project.steps | 0);
		if (this.swing !== (project.swing ?? 0)) this.setSwing(project.swing ?? 0);

		const secondsPerBeat = 60 / this.bpm;
		const sixteenth = secondsPerBeat / 4;

		while (this._nextNoteTime < this.ctx.currentTime + this.scheduleAheadSec) {
			const step = this.stepIndex;

			const anySolo = project.tracks.some((t) => t.solo);
			const swingOffset = step % 2 === 1 ? this.swing * sixteenth : 0;

			for (const tr of project.tracks) {
				if ((anySolo && !tr.solo) || tr.mute) continue;
				const t = this.tracks.get(tr.id);
				if (!t || !this.kitBuffers[t.sampleId]) continue;

				this._scheduleStepHit(t, step % tr.pattern.length, this._nextNoteTime + swingOffset, tr.pattern, {
					pitch: tr.pitch ?? 0,
					decayMs: tr.decay ?? 300
				});
			}

			if (this._onTick) this._onTick(step % this.steps, this._nextNoteTime + swingOffset);
			this._advanceNoteTime(sixteenth);
		}
	}

	_advanceNoteTime(sixteenth) {
		this._nextNoteTime += sixteenth;
		this.stepIndex = (this.stepIndex + 1) % this.steps;
	}

	async play(project) {
		await this.init();
		if (this.isPlaying) return;

		for (const tr of project.tracks) {
			this.addOrUpdateTrack(tr.id, {
				sampleId: tr.sampleId,
				gainDb: tr.gain ?? -6,
				pan: tr.pan ?? 0,
				reverbSendPct: tr.reverbSend ?? 0,
				delaySendPct: tr.delaySend ?? 0
			});
		}

		this.isPlaying = true;
		this.stepIndex = 0;
		this._nextNoteTime = this.ctx.currentTime + 0.05;

		// Use AudioWorklet-based scheduler if available; otherwise fall back to setInterval
		if (this._workletLoaded) {
			this._schedulerNode = new AudioWorkletNode(this.ctx, 'scheduler-processor');
			this._schedulerNode.port.onmessage = (e) => {
				if (!this.isPlaying) return;
				if (e.data && e.data.type === 'tick') {
					this._schedulerTick(project);
				}
			};
			// Configure tick interval
			this._schedulerNode.port.postMessage({ type: 'config', intervalMs: this.schedulerIntervalMs });
			// Connect to destination graph to keep node alive (zero-output node still needs a connection on some browsers)
			try {
				this._schedulerNode.connect(this.masterGain);
			} catch {}
		} else {
			const tick = () => {
				if (!this.isPlaying) return;
				this._schedulerTick(project);
			};
			this._timerId = setInterval(tick, this.schedulerIntervalMs);
		}
	}

	stop() {
		if (!this.isPlaying) return;
		this.isPlaying = false;
		if (this._timerId) {
			clearInterval(this._timerId);
			this._timerId = null;
		}
		if (this._schedulerNode) {
			try {
				this._schedulerNode.disconnect();
			} catch {}
			try {
				this._schedulerNode.port.onmessage = null;
			} catch {}
			this._schedulerNode = null;
		}
	}

	setMasterGainDb(db) {
		if (!this.masterGain) return;
		this.masterGain.gain.value = dbToGain(db);
	}

	dispose() {
		this.stop();
		this.tracks.forEach((_, id) => this.removeTrack(id));
		this.tracks.clear();
		if (this.ctx) {
			this.ctx.close();
			this.ctx = null;
		}
	}
}
