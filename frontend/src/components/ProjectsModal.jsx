import { useEffect } from 'react';
import styles from './ProjectsModal.module.css';

export default function ProjectsModal({ open, onClose, projects, onRefresh, onLoad, busy, error }) {
	useEffect(() => {
		if (!open) return;
		const onKey = (e) => {
			if (e.key === 'Escape') onClose();
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	}, [open, onClose]);

	if (!open) return null;

	const onOverlay = (e) => {
		if (e.target === e.currentTarget) onClose();
	};

	return (
		<div
			className={styles.overlay}
			onMouseDown={onOverlay}
		>
			<div
				role='dialog'
				aria-modal
				className={styles.sheet}
			>
				<div className={styles.header}>
					<button
						className={styles.smallBtn}
						onClick={onRefresh}
						disabled={busy}
					>
						Refresh
					</button>
					<div className={styles.title}>Load Project</div>
					<button
						className={styles.closeBtn}
						aria-label='Close'
						title='Close'
						onClick={onClose}
					>
						×
					</button>
				</div>
				<div className={styles.content}>
					{error && <div style={{ color: 'tomato', marginBottom: 8 }}>Error: {error}</div>}
					{projects.length === 0 ? (
						<div style={{ opacity: 0.85 }}>No projects yet.</div>
					) : (
						<ul className={styles.list}>
							{projects.map((p) => (
								<li
									key={p._id}
									className={styles.item}
									role='button'
									tabIndex={0}
									onClick={() => onLoad(p._id)}
									onKeyDown={(e) => {
										if (e.key === 'Enter' || e.key === ' ') {
											e.preventDefault();
											onLoad(p._id);
										}
									}}
								>
									<div>
										<div className={styles.itemTitle}>{p.title || 'Untitled'}</div>
										<div className={styles.itemMeta}>
											{p.bpm} BPM · {p.steps} steps · {new Date(p.updatedAt).toLocaleString()}
										</div>
									</div>
								</li>
							))}
						</ul>
					)}
				</div>
			</div>
		</div>
	);
}
