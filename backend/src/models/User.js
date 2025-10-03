const { Schema, model } = require('mongoose');
const { projectSchema } = require('./projectSchema');

const userSchema = new Schema(
	{
		email: { type: String, required: true, unique: true, lowercase: true, trim: true },
		passwordHash: { type: String, required: true },
		displayName: { type: String, trim: true },
		projects: { type: [projectSchema], default: [] }
	},
	{ timestamps: true }
);

module.exports = model('User', userSchema);
