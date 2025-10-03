const Joi = require('joi');

/**
 * validate({ body?, params?, query? }, options?)
 * - Validates and replaces req.body/params/query with sanitized values.
 * - On failure, responds with 400 and a compact error list.
 */
function validate(schemas = {}, options = {}) {
	const baseOpts = { abortEarly: false, stripUnknown: true, convert: true, ...options };
	return (req, res, next) => {
		try {
			if (schemas.body) {
				const { error, value } = schemas.body.validate(req.body ?? {}, baseOpts);
				if (error) return respondError(res, error);
				req.body = value;
			}
			if (schemas.params) {
				const { error, value } = schemas.params.validate(req.params ?? {}, baseOpts);
				if (error) return respondError(res, error);
				req.params = value;
			}
			if (schemas.query) {
				const { error, value } = schemas.query.validate(req.query ?? {}, baseOpts);
				if (error) return respondError(res, error);
				req.query = value;
			}
			next();
		} catch (err) {
			next(err);
		}
	};
}

function respondError(res, error) {
	return res.status(400).json({
		error: 'ValidationError',
		message: 'Invalid request. Please correct the highlighted fields.',
		details: (error.details || []).map((d) => ({
			path: Array.isArray(d.path) ? d.path.join('.') : String(d.path || ''),
			message: d.message.replace(/["]/g, "'")
		}))
	});
}

module.exports = { Joi, validate };
