import React from 'react';
import styles from './AuthModal.module.css';

export default function InstructionsModal({ open, onClose }) {
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
				aria-labelledby='instr-title'
			>
				<div className={styles.header}>
					<div
						className={styles.title}
						id='instr-title'
					>
						Instructions
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
					<section>
						<h3>Keyboard shortcuts</h3>
						<ul>
							<li>
								<strong>Space</strong> — Play/Stop
							</li>
							<li>
								<strong>↑ / ↓</strong> — Move track focus
							</li>
							<li>
								<strong>← / →</strong> — Move step focus
							</li>
							<li>
								<strong>Enter</strong> — Toggle focused step
							</li>
							<li>
								<strong>1–9</strong> — Select track
							</li>
						</ul>
					</section>
					<section>
						<h3>Painting &amp; erasing</h3>
						<ul>
							<li>
								Click-drag to <strong>paint</strong> steps.
							</li>
							<li>
								<strong>Right-click</strong> (or two-finger click) to <strong>erase</strong>.
							</li>
							<li>
								<strong>Shift+drag</strong> to draw straight selections.
							</li>
						</ul>
					</section>
					<section>
						<h3>Reordering tracks</h3>
						<ul>
							<li>
								<strong>Shift+click</strong> the <em>Add Track</em> button to <strong>toggle reorder mode</strong>.
							</li>
							<li>
								On touch devices: <strong>Long-press</strong> the <em>Add Track</em> button.
							</li>
							<li>While reordering, rows jiggle and become draggable; drag a row up/down to reposition.</li>
							<li>All controls in rows are temporarily disabled to prevent accidental edits.</li>
						</ul>
					</section>
					<section>
						<h3>Settings</h3>
						<ul>
							<li>
								<strong>Invert knob scroll</strong> — If knob scrolling feels backwards on your system (varies by
								OS/browser and “natural scrolling” settings), enable this to flip the scroll direction. Open the
								hamburger menu and choose <em>Settings</em>.
							</li>
						</ul>
					</section>
				</div>
			</div>
		</div>
	);
}
