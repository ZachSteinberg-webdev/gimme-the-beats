import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

const SettingsContext = createContext(null);

const KEY = 'bm.settings.v1';

function load() {
	try {
		const raw = localStorage.getItem(KEY);
		if (!raw) return { invertKnobScroll: false };
		const parsed = JSON.parse(raw);
		return { invertKnobScroll: !!parsed.invertKnobScroll };
	} catch {
		return { invertKnobScroll: false };
	}
}

function save(s) {
	try {
		localStorage.setItem(KEY, JSON.stringify(s));
	} catch {}
}

export function SettingsProvider({ children }) {
	const [settings, setSettings] = useState(() =>
		typeof window !== 'undefined' ? load() : { invertKnobScroll: false }
	);

	useEffect(() => {
		if (typeof window !== 'undefined') save(settings);
	}, [settings]);

	const value = useMemo(
		() => ({
			settings,
			setInvertKnobScroll: (v) => setSettings((prev) => ({ ...prev, invertKnobScroll: !!v }))
		}),
		[settings]
	);

	return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
	const ctx = useContext(SettingsContext);
	if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
	return ctx;
}
