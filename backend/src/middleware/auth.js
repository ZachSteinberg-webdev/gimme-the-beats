const jwt = require('jsonwebtoken');
const User = require('../models/User');

const COOKIE_NAME = 'bm_token';

function envBool(name, def) {
	const v = process.env[name];
	if (v == null) return def;
	const s = String(v).trim().toLowerCase();
	if (['1', 'true', 'yes', 'on'].includes(s)) return true;
	if (['0', 'false', 'no', 'off'].includes(s)) return false;
	return def;
}

function resolveSameSite() {
	const v = (process.env.COOKIE_SAMESITE || 'lax').toString().trim().toLowerCase();
	if (v === 'none' || v === 'strict' || v === 'lax') return v;
	return 'lax';
}

function isRequestSecure(req) {
	try {
		if (String(process.env.COOKIE_SECURE).toLowerCase() === 'true') return true;
	} catch {}

	if (req && (req.secure || req.headers['x-forwarded-proto'] === 'https')) return true;
	return process.env.NODE_ENV === 'production';
}

const baseCookieOptions = (req) => {
	const sameSite = resolveSameSite();
	// Respect COOKIE_SECURE env if set; otherwise infer from req/proxy or NODE_ENV
	let secure = envBool('COOKIE_SECURE', isRequestSecure(req));
	// Chrome requires Secure when SameSite=None
	if (sameSite === 'none') secure = true;
	const domain = (process.env.COOKIE_DOMAIN || '').trim() || undefined;
	return {
		httpOnly: true,
		sameSite,
		secure,
		path: '/',
		...(domain ? { domain } : {})
	};
};

function signToken(userId) {
	const secret = process.env.JWT_SECRET;
	if (!secret) throw new Error('JWT_SECRET env var missing');
	return jwt.sign({ sub: userId.toString() }, secret, { expiresIn: '7d' });
}

async function fetchUserFromToken(token) {
	if (!token) return null;
	const secret = process.env.JWT_SECRET;
	if (!secret) throw new Error('JWT_SECRET env var missing');
	try {
		const payload = jwt.verify(token, secret);
		if (!payload?.sub) return null;
		const user = await User.findById(payload.sub);
		return user || null;
	} catch (err) {
		return null;
	}
}

async function requireAuth(req, res, next) {
	try {
		if (req.user) return next();
		const token = req.cookies?.[COOKIE_NAME];
		const user = await fetchUserFromToken(token);
		if (!user) return res.status(401).json({ error: 'Unauthorized' });
		req.user = user;
		next();
	} catch (err) {
		next(err);
	}
}

async function attachUserIfPresent(req, _res, next) {
	try {
		if (req.user) return next();
		const token = req.cookies?.[COOKIE_NAME];
		if (!token) return next();
		const user = await fetchUserFromToken(token);
		if (user) req.user = user;
		next();
	} catch (err) {
		next(err);
	}
}

function setAuthCookie(res, token, req) {
	res.cookie(COOKIE_NAME, token, { ...baseCookieOptions(req), maxAge: 7 * 24 * 60 * 60 * 1000 });
}

function clearAuthCookie(res, req) {
	res.clearCookie(COOKIE_NAME, baseCookieOptions(req));
}

function publicUser(user) {
	if (!user) return null;
	const projects = Array.isArray(user.projects)
		? user.projects.map((p) => (typeof p.toObject === 'function' ? p.toObject({ getters: true }) : p))
		: [];
	return {
		id: user._id,
		email: user.email,
		displayName: user.displayName || null,
		projects
	};
}

module.exports = {
	requireAuth,
	attachUserIfPresent,
	signToken,
	setAuthCookie,
	clearAuthCookie,
	publicUser
};
