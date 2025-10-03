const { Schema } = require('mongoose');

const trackSchema = new Schema(
	{
		id: { type: String, required: true },
		name: { type: String, required: true },
		sampleId: { type: String, required: true },
		gain: { type: Number, default: -6, min: -60, max: 12 },
		pan: { type: Number, default: 0, min: -1, max: 1 },
		pitch: { type: Number, default: 0, min: -24, max: 24 },
		decay: { type: Number, default: 300, min: 1, max: 10000 },
		reverbSend: { type: Number, default: 0, min: 0, max: 100 },
		delaySend: { type: Number, default: 0, min: 0, max: 100 },
		mute: { type: Boolean, default: false },
		solo: { type: Boolean, default: false },
		pattern: { type: [Number], default: [] }
	},
	{ _id: false }
);

const projectSchema = new Schema(
	{
		title: { type: String, required: true, default: 'Untitled Beat' },
		bpm: { type: Number, required: true, default: 120, min: 40, max: 300 },
		steps: { type: Number, required: true, default: 16, min: 1, max: 128 },
		swing: { type: Number, required: true, default: 0, min: 0, max: 1 },
		tracks: { type: [trackSchema], default: [] },
		version: { type: Number, default: 1 }
	},
	{ timestamps: true }
);

module.exports = { trackSchema, projectSchema };
