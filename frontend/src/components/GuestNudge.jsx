import { useEffect, useState } from 'react';
import styles from './GuestNudge.module.css';

const LS_DISMISS = 'bm.nudge.dismissed.v1';

export default function GuestNudge({ onCreateAccount }) {
	const [dismissed, setDismissed] = useState(true);

	useEffect(() => {
		try {
			const v = window.localStorage?.getItem(LS_DISMISS);
			setDismissed(v === '1');
		} catch {
			setDismissed(false);
		}
	}, []);

	const dismiss = () => {
		try {
			window.localStorage?.setItem(LS_DISMISS, '1');
		} catch {}
		setDismissed(true);
	};

	if (dismissed) return null;

	return (
		<div
			className={styles.wrap}
			role='status'
			aria-live='polite'
		>
			<div className={styles.text}>
				You are in Guest Mode.{' '}
				<button
					type='button'
					className={styles.linkBtn}
					onClick={onCreateAccount}
				>
					Create an account
				</button>{' '}
				to save your work.
			</div>

			{/* Right: dismiss (X) */}
			<button
				type='button'
				className={styles.ghostBtn}
				onClick={dismiss}
				aria-label='Dismiss notification'
				title='Dismiss'
			>
				×
			</button>
		</div>
	);
}
