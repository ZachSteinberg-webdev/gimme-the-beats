const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { createProjectFromPayload, applyProjectUpdate } = require('../utils/project');
const router = express.Router();
router.use(requireAuth);

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

// ---- Validation Schemas for Projects ----
const projectIdParams = Joi.object({ id: Joi.string().min(1).required() });
const createProjectBody = projectSchema.keys({ tracks: Joi.array().items(trackSchema).min(1).required() });
const updateProjectBody = projectSchema; // partial; tracks optional
const newBody = Joi.object({ currentProjectId: Joi.string().min(1).required() });

const sortProjectsDesc = (projects = []) =>
	projects
		.map((p) => (typeof p.toObject === 'function' ? p.toObject({ getters: true }) : p))
		.sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0))
		.slice(0, 100);

// GET /api/projects (list)
router.get('/', (req, res) => {
	const items = sortProjectsDesc(req.user.projects || []);
	res.json(items);
});

// GET /api/projects/:id
router.get('/:id', validate({ params: projectIdParams }), (req, res) => {
	const project = req.user.projects.id(req.params.id);
	if (!project) return res.status(404).json({ error: 'NotFound', message: 'Project not found.' });
	res.json(project.toObject({ getters: true }));
});

// POST /api/projects (create)
router.post('/', validate({ body: createProjectBody }), async (req, res, next) => {
	try {
		const payload = req.body || {};
		const project = createProjectFromPayload(payload);
		req.user.projects.push(project);
		await req.user.save();
		const created = req.user.projects[req.user.projects.length - 1];
		res.status(201).json(created.toObject({ getters: true }));
	} catch (err) {
		next(err);
	}
});

// POST /api/projects/new — gate starting a fresh project until current one is saved
router.post('/new', validate({ body: newBody }), (req, res) => {
	const { currentProjectId } = req.body || {};
	if (!currentProjectId) {
		return res.status(400).json({
			error: 'ProjectNotSaved',
			message: 'Save the current project before creating a new one.'
		});
	}

	const existing = req.user.projects.id(currentProjectId);
	if (!existing) {
		return res.status(404).json({
			error: 'ProjectNotFound',
			message: 'Current project could not be verified. Save it before creating a new one.'
		});
	}

	res.json({ ok: true });
});

// PUT /api/projects/:id (update)
router.put('/:id', validate({ params: projectIdParams, body: updateProjectBody }), async (req, res, next) => {
	try {
		const project = req.user.projects.id(req.params.id);
		if (!project) return res.status(404).json({ error: 'NotFound', message: 'Project not found.' });
		applyProjectUpdate(project, req.body || {});
		await req.user.save();
		res.json(project.toObject({ getters: true }));
	} catch (err) {
		next(err);
	}
});

// DELETE /api/projects/:id
router.delete('/:id', validate({ params: projectIdParams }), async (req, res, next) => {
	try {
		const project = req.user.projects.id(req.params.id);
		if (!project) return res.json({ ok: true, existed: false });
		project.deleteOne();
		await req.user.save();
		res.json({ ok: true, existed: true });
	} catch (err) {
		next(err);
	}
});

module.exports = router;
