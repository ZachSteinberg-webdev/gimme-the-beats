const express = require('express');
const Pattern = require('../models/Pattern');
const router = express.Router();

// GET /api/patterns (list)
router.get('/', async (req, res) => {
	const items = await Pattern.find().sort({ createdAt: -1 });
	res.json(items);
});

// GET /api/patterns/:id (one)
router.get('/:id', async (req, res) => {
	const doc = await Pattern.findById(req.params.id);
	if (!doc) return res.status(404).json({ error: 'Not found' });
	res.json(doc);
});

// POST /api/patterns (create)
router.post('/', async (req, res) => {
	const { name = 'Untitled', bpm = 110, steps } = req.body || {};
	// default to a 4x16 grid if steps not provided
	const defaultSteps = Array.from({ length: 4 }, () => Array(16).fill(false));
	const doc = await Pattern.create({
		name,
		bpm,
		steps: Array.isArray(steps) ? steps : defaultSteps
	});
	res.status(201).json(doc);
});

// PUT /api/patterns/:id (update)
router.put('/:id', async (req, res) => {
	const { name, bpm, steps } = req.body || {};
	const doc = await Pattern.findByIdAndUpdate(
		req.params.id,
		{
			...(name !== undefined ? { name } : {}),
			...(bpm !== undefined ? { bpm } : {}),
			...(steps !== undefined ? { steps } : {})
		},
		{ new: true }
	);
	if (!doc) return res.status(404).json({ error: 'Not found' });
	res.json(doc);
});

// DELETE /api/patterns/:id (delete)
router.delete('/:id', async (req, res) => {
	const result = await Pattern.findByIdAndDelete(req.params.id);
	res.json({ ok: true, existed: Boolean(result) });
});

module.exports = router;
