import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { api } from '../lib/api.js';
import { useProject } from './ProjectContext.jsx';

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
	const [user, setUser] = useState(null);
	const [loading, setLoading] = useState(true);
	const { project } = useProject?.() || { project: null }; // allow usage outside if not mounted

	const refresh = useCallback(async () => {
		try {
			const res = await api.get('/auth/me');
			setUser(res?.user || null);
		} catch {
			setUser(null);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		refresh();
	}, [refresh]);

	const register = useCallback(
		async ({ email, password, displayName }) => {
			const body = { email, password, displayName: displayName || undefined };
			try {
				// Attempt to send current guest project to be imported
				if (project && typeof project === 'object') {
					body.project = project;
				}
			} catch {}
			const res = await api.post('/auth/register', body);
			if (res?.user) setUser(res.user);
			return res;
		},
		[project]
	);

	const login = useCallback(
		async ({ email, password }) => {
			const body = { email, password };
			try {
				if (project && typeof project === 'object') body.project = project;
			} catch {}
			const res = await api.post('/auth/login', body);
			if (res?.user) setUser(res.user);
			return res;
		},
		[project]
	);

	const logout = useCallback(async () => {
		await api.post('/auth/logout', {});
		setUser(null);
	}, []);

	const value = useMemo(
		() => ({
			user,
			loading,
			refresh,
			register,
			login,
			logout
		}),
		[user, loading, refresh, register, login, logout]
	);

	return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
	const ctx = useContext(AuthCtx);
	if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
	return ctx;
}
