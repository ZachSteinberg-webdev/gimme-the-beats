const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { requireAuth, signToken, setAuthCookie, clearAuthCookie, publicUser } = require('../middleware/auth');
const { createProjectFromPayload, applyProjectUpdate } = require('../utils/project');
const router = express.Router();

// ---- Validation (Joi) ----
const { Joi, validate } = require('../middleware/validate');

// ---- Shared Joi Schemas ----
const emailSchema = Joi.string().trim().lowercase().email().max(320);
const passwordSchema = Joi.string().min(8).max(256);
const displayNameSchema = Joi.string().trim().min(1).max(60);

const trackSchema = Joi.object({
	id: Joi.string().min(1).required(),
	name: Joi.string().min(1).required(),
	sampleId: Joi.string().min(1).required(),
	gain: Joi.number().min(-60).max(12),
	pan: Joi.number().min(-1).max(1),
	pitch: Joi.number().min(-24).max(24),
	decay: Joi.number().min(1).max(10000),
	reverbSend: Joi.number().min(0).max(100),
	delaySend: Joi.number().min(0).max(100),
	mute: Joi.boolean(),
	solo: Joi.boolean(),
	pattern: Joi.array().items(Joi.number().integer().min(0).max(127)),
	color: Joi.string()
}).unknown(true);

const projectSchema = Joi.object({
	_id: Joi.any(),
	title: Joi.string().min(1).max(200),
	bpm: Joi.number().integer().min(40).max(300),
	steps: Joi.number().integer().min(1).max(128),
	swing: Joi.number().min(0).max(1),
	tracks: Joi.array().items(trackSchema),
	version: Joi.number().integer(),
	updatedAt: Joi.alternatives(Joi.number(), Joi.string()),
	createdAt: Joi.alternatives(Joi.number(), Joi.string())
}).unknown(true);

const incomingProjectsSchema = Joi.object({
	project: projectSchema,
	projects: Joi.array().items(projectSchema),
	guestProject: projectSchema,
	guestProjects: Joi.array().items(projectSchema)
}).unknown(true);

// ---- Validation Schemas for Auth ----
const registerSchema = Joi.object({
	email: emailSchema,
	password: passwordSchema,
	displayName: displayNameSchema.optional()
}).concat(incomingProjectsSchema);

const loginSchema = Joi.object({
	email: emailSchema,
	password: Joi.string().min(1)
}).concat(incomingProjectsSchema);

const normalizeEmail = (email) => (typeof email === 'string' ? email.trim().toLowerCase() : '');

const collectIncomingProjects = (body = {}) => {
	const list = [];
	if (body.project && typeof body.project === 'object') list.push(body.project);
	if (Array.isArray(body.projects)) {
		for (const item of body.projects) {
			if (item && typeof item === 'object') list.push(item);
		}
	}
	if (body.guestProject && typeof body.guestProject === 'object') list.push(body.guestProject);
	if (Array.isArray(body.guestProjects)) {
		for (const item of body.guestProjects) {
			if (item && typeof item === 'object') list.push(item);
		}
	}
	return list;
};

router.post('/register', validate({ body: registerSchema }), async (req, res, next) => {
	try {
		const email = normalizeEmail(req.body?.email);
		const password = req.body?.password ?? '';
		const displayName = typeof req.body?.displayName === 'string' ? req.body.displayName.trim() : '';

		if (!email || !email.includes('@')) {
			return res.status(400).json({ error: 'InvalidEmail', message: 'A valid email is required.' });
		}
		if (typeof password !== 'string' || password.length < 8) {
			return res.status(400).json({ error: 'InvalidPassword', message: 'Password must be at least 8 characters.' });
		}

		const existing = await User.findOne({ email });
		if (existing) {
			return res.status(409).json({ error: 'EmailInUse', message: 'An account with that email already exists.' });
		}

		const passwordHash = await bcrypt.hash(password, 12);

		const user = new User({
			email,
			passwordHash,
			displayName: displayName || undefined
		});

		const incomingProjects = collectIncomingProjects(req.body);
		for (const projectRaw of incomingProjects) {
			user.projects.push(createProjectFromPayload(projectRaw));
		}

		await user.save();

		const token = signToken(user._id);
		setAuthCookie(res, token, req);

		res.status(201).json({ user: publicUser(user) });
	} catch (err) {
		next(err);
	}
});

router.post('/login', validate({ body: loginSchema }), async (req, res, next) => {
	try {
		const email = normalizeEmail(req.body?.email);
		const password = req.body?.password ?? '';

		if (!email || !email.includes('@')) {
			return res.status(400).json({ error: 'InvalidEmail', message: 'A valid email is required.' });
		}

		const user = await User.findOne({ email });
		if (!user) {
			return res.status(401).json({ error: 'InvalidCredentials', message: 'Invalid email or password.' });
		}

		const match = await bcrypt.compare(password, user.passwordHash);
		if (!match) {
			return res.status(401).json({ error: 'InvalidCredentials', message: 'Invalid email or password.' });
		}

		const incomingProjects = collectIncomingProjects(req.body);
		if (incomingProjects.length) {
			let mutated = false;
			for (const projectRaw of incomingProjects) {
				if (projectRaw?._id) {
					const existing = user.projects.id(projectRaw._id);
					if (existing) {
						applyProjectUpdate(existing, projectRaw);
						mutated = true;
						continue;
					}
				}
				user.projects.push(createProjectFromPayload(projectRaw));
				mutated = true;
			}
			if (mutated) await user.save();
		}

		const token = signToken(user._id);
		setAuthCookie(res, token, req);

		res.json({ user: publicUser(user) });
	} catch (err) {
		next(err);
	}
});

router.post('/logout', (req, res) => {
	clearAuthCookie(res, req);
	res.json({ ok: true });
});

router.get('/me', requireAuth, (req, res) => {
	res.json({ user: publicUser(req.user) });
});

module.exports = router;
