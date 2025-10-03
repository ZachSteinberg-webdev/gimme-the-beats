const { Schema, model } = require('mongoose');

const patternSchema = new Schema(
	{
		name: { type: String, required: true, default: 'Untitled' },
		bpm: { type: Number, required: true, default: 110, min: 40, max: 300 },
		// 2D array of booleans: tracks × steps (e.g., 4 × 16)
		steps: { type: [[Boolean]], default: [] }
	},
	{ timestamps: true }
);

module.exports = model('Pattern', patternSchema);
