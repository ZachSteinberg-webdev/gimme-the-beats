if (process.env.NODE_ENV !== 'production') {
	const dotenv = require('dotenv').config();
};
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;
const NODE_ENV = process.env.NODE_ENV || 'development';
const TRUST_PROXY = process.env.TRUST_PROXY ?? '1';
// Accept: a number (hops), 'true', 'false', or an IP/subnet string
const tp = TRUST_PROXY.trim().toLowerCase();
let trustSetting;
if (tp === 'true') trustSetting = true;
else if (tp === 'false') trustSetting = false;
else if (!Number.isNaN(Number(tp))) trustSetting = Number(tp);
else trustSetting = TRUST_PROXY;
app.set('trust proxy', trustSetting);

// ---------- Global security & hardening ----------
// Remove the X-Powered-By header
app.disable('x-powered-by');

// Helmet with a relaxed CSP (frontend runs separately)
app.use(
	helmet({
		contentSecurityPolicy: {
			directives: {
				defaultSrc: ["'self'"],
				scriptSrc: ["'self'"],
				styleSrc: ["'self'", "'unsafe-inline'"],
				imgSrc: ["'self'", 'data:'],
				connectSrc: ["'self'"],
				baseUri: ["'self'"],
				formAction: ["'self'"]
			}
		},
		crossOriginResourcePolicy: { policy: 'cross-origin' }
	})
);

const SAMESITE = (process.env.COOKIE_SAMESITE || 'lax').toString().trim().toLowerCase();
const rawOrigins = (process.env.CORS_ORIGIN || '')
	.split(',')
	.map((s) => s.trim())
	.filter(Boolean);
const isProd = NODE_ENV === 'production';

const corsOptions = {
	origin(origin, cb) {
		if (!origin) return cb(null, true);
		if (!isProd && rawOrigins.length === 0) return cb(null, true);
		if (SAMESITE === 'none') {
			return rawOrigins.includes(origin) ? cb(null, true) : cb(new Error('Not allowed by CORS'));
		}
		if (rawOrigins.length > 0) {
			return rawOrigins.includes(origin) ? cb(null, true) : cb(new Error('Not allowed by CORS'));
		}
		return cb(null, true);
	},
	credentials: true,
	optionsSuccessStatus: 204
};
app.use(cors(corsOptions));

// Parsers & logging
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use(morgan(NODE_ENV === 'production' ? 'combined' : 'dev'));

// Simple health endpoint
app.get('/api/health', (req, res) => {
	res.json({ ok: true, time: new Date().toISOString() });
});

// ---------- Rate limiting ----------
const authLimiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	max: 50, // 50 requests / window / IP
	standardHeaders: 'draft-7',
	legacyHeaders: false,
	message: { error: 'TooManyRequests', message: 'Too many requests. Please try again later.' }
});

const projectsLimiter = rateLimit({
	windowMs: 15 * 60 * 1000,
	max: 300,
	standardHeaders: 'draft-7',
	legacyHeaders: false,
	message: { error: 'TooManyRequests', message: 'Too many requests. Please try again later.' }
});

// ---------- Routes ----------
const authRouter = require('./routes/auth');
app.use('/api/auth', authLimiter, authRouter);

const projectsRouter = require('./routes/projects');
app.use('/api/projects', projectsLimiter, projectsRouter);

// Serve the built frontend
const distDir = path.resolve(__dirname, '../../frontend/dist');

// Serve static assets from the frontend build
app.use(
	express.static(distDir, {
		maxAge: isProd ? '1y' : 0,
		index: false // send index.html below
	})
);

// SPA fallback: for any non-API route, serve index.html
app.use((req, res, next) => {
	if (req.method !== 'GET') return next();
	if (req.path.startsWith('/api/')) return next();
	res.sendFile(path.join(distDir, 'index.html'));
});

// 404 fallback (only for unhandled API routes)
app.use((req, res, next) => {
	if (req.path.startsWith('/api/')) {
		return res.status(404).json({ error: 'NotFound', message: 'Endpoint not found' });
	}
	return next();
});

// ---------- Centralized error handler ----------
// Never leak stack traces in production
// Attach a minimal, consistent error shape
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
	const status = err.status || err.statusCode || 500;
	const id = Math.random().toString(36).slice(2, 10); // simple error instance id
	if (NODE_ENV !== 'production') {
		console.error('✗ Error [%s] %s %s\n', id, req.method, req.originalUrl, err);
	}
	const body = {
		error: status === 500 ? 'ServerError' : err.code || err.name || 'Error',
		message:
			NODE_ENV === 'production'
				? status === 500
					? 'An unexpected error occurred.'
					: err.message || 'Request failed.'
				: err.message || 'Request failed.',
		id
	};
	if (NODE_ENV !== 'production') {
		body.stack = err.stack;
	}
	res.status(status).json(body);
});

// ---------- Start server after DB connect ----------
mongoose
	.connect(process.env.MONGODB_URI)
	.then(() => {
		console.log('✓ MongoDB connected');
		app.listen(PORT, () => {
			console.log(`API listening on http://localhost:${PORT}`);
		});
	})
	.catch((err) => {
		console.error('✗ MongoDB connection error:', err);
		process.exit(1);
	});
