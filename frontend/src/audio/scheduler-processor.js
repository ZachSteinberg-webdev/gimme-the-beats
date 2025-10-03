// frontend/src/audio/scheduler-processor.js
// Runs inside the audio rendering thread. Posts periodic ticks back to main thread
// so the app can schedule notes using audioContext.currentTime without main-thread jitter.
class SchedulerProcessor extends AudioWorkletProcessor {
	constructor() {
		super();
		this.intervalSec = 0.04; // default ~25 ticks/sec
		this._accumSec = 0;
		this._lastPostSec = 0;

		this.port.onmessage = (e) => {
			const { type, intervalMs } = e.data || {};
			if (type === 'config' && typeof intervalMs === 'number' && intervalMs > 0) {
				this.intervalSec = intervalMs / 1000;
			}
		};
	}

	process(inputs, outputs, parameters) {
		// Each call renders 128 samples per quantum.
		const quantumSec = 128 / sampleRate;
		this._accumSec += quantumSec;

		// Post ticks based on accumulated time (aligned to audio clock).
		while (this._accumSec - this._lastPostSec >= this.intervalSec) {
			this._lastPostSec += this.intervalSec;
			// `currentTime` here is the audio rendering time reference (AudioWorkletGlobalScope)
			this.port.postMessage({ type: 'tick', now: currentTime });
		}
		return true;
	}
}
registerProcessor('scheduler-processor', SchedulerProcessor);
