import { useEffect, useState, useCallback } from 'react';
import styles from './AuthModal.module.css';
import { useAuth } from '../state/AuthContext.jsx';

export default function RegisterModal({ open, onClose, onSwitchToLogin }) {
	const { register } = useAuth();
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [displayName, setDisplayName] = useState('');
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState('');

	useEffect(() => {
		if (!open) return;
		const onKey = (e) => {
			if (e.key === 'Escape') onClose();
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	}, [open, onClose]);

	const onOverlay = useCallback(
		(e) => {
			if (e.target === e.currentTarget) onClose();
		},
		[onClose]
	);

	if (!open) return null;

	const submit = async (e) => {
		e.preventDefault();
		setBusy(true);
		setError('');
		try {
			await register({ email, password, displayName });
			onClose();
		} catch (err) {
			setError('Registration failed. Try a different email, or check your password.');
		} finally {
			setBusy(false);
		}
	};

	return (
		<div
			className={styles.overlay}
			onMouseDown={onOverlay}
		>
			<div
				className={styles.sheet}
				role='dialog'
				aria-modal='true'
				aria-labelledby='register-title'
			>
				<div className={styles.header}>
					<div
						className={styles.title}
						id='register-title'
					>
						Create account
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
					<form
						className={styles.form}
						onSubmit={submit}
					>
						<div className={styles.row}>
							<label htmlFor='reg-name'>Display name</label>
							<input
								id='reg-name'
								type='text'
								autoComplete='nickname'
								value={displayName}
								onChange={(e) => setDisplayName(e.target.value)}
								placeholder='E.g. The Beat Master'
							/>
						</div>
						<div className={styles.row}>
							<label htmlFor='reg-email'>Email</label>
							<input
								id='reg-email'
								type='email'
								autoComplete='email'
								required
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								placeholder='E.g. handle@example.com'
							/>
						</div>
						<div className={styles.row}>
							<label htmlFor='reg-password'>Password</label>
							<input
								id='reg-password'
								type='password'
								autoComplete='new-password'
								required
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								placeholder='Must be at least 12 characters'
							/>
						</div>
						<button
							type='submit'
							className={styles.primary}
							disabled={busy}
						>
							Create account
						</button>
						{error && <div className={styles.error}>{error}</div>}
						<div className={styles.help}>
							Already have an account?{' '}
							<a
								className={styles.helpLink}
								href='#'
								onClick={(e) => {
									e.preventDefault();
									onSwitchToLogin?.();
								}}
							>
								Sign in
							</a>
						</div>
					</form>
				</div>
			</div>
		</div>
	);
}
