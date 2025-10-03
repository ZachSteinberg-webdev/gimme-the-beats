import React from 'react';
import styles from './AuthModal.module.css';
import { useSettings } from '../state/SettingsContext.jsx';

export default function SettingsModal({ open, onClose }) {
	const { settings, setInvertKnobScroll } = useSettings();
	if (!open) return null;

	const onOverlay = (e) => {
		if (e.target === e.currentTarget) onClose?.();
	};

	return (
		<div
			className={styles.overlay}
			role='presentation'
			onMouseDown={onOverlay}
		>
			<div
				className={styles.sheet}
				role='dialog'
				aria-modal='true'
				aria-labelledby='settings-title'
			>
				<div className={styles.header}>
					<div
						className={styles.title}
						id='settings-title'
					>
						Settings
					</div>
					<button
						className={styles.close}
						aria-label='Close'
						onClick={onClose}
					>
						×
					</button>
				</div>
				<div className={styles.body}>
					<label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
						<input
							type='checkbox'
							checked={!!settings.invertKnobScroll}
							onChange={(e) => setInvertKnobScroll(e.target.checked)}
						/>
						Invert knob scroll
					</label>
					<p style={{ opacity: 0.7, marginTop: 8 }}>
						If scrolling a knob feels backwards on your system or in certain browsers, enable this.
					</p>
				</div>
			</div>
		</div>
	);
}
