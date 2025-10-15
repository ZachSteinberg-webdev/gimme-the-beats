import { useEffect, useState, useCallback, useRef } from 'react';
import styles from './AuthModal.module.css';
import { useAuth } from '../state/AuthContext.jsx';

export default function LoginModal({ open, onClose, onSwitchToRegister }) {
	const { login } = useAuth();
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState('');
	const firstFieldRef = useRef(null);

	useEffect(() => {
		if (!open) return;
		const onKey = (e) => {
			if (e.key === 'Escape') onClose();
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	}, [open, onClose]);

	useEffect(() => {
		if (!open) return;
		if (firstFieldRef.current) {
			firstFieldRef.current.focus({ preventScroll: true });
		}
	}, [open]);

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
			await login({ email, password });
			onClose();
		} catch (err) {
			setError('Login failed. Check your email and password.');
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
				aria-labelledby='login-title'
			>
				<div className={styles.header}>
					<div
						className={styles.title}
						id='login-title'
					>
						Sign in
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
							<label htmlFor='login-email'>Email</label>
							<input
								id='login-email'
								type='email'
								autoComplete='email'
								required
								ref={firstFieldRef}
								value={email}
								onChange={(e) => setEmail(e.target.value)}
							/>
						</div>
						<div className={styles.row}>
							<label htmlFor='login-password'>Password</label>
							<input
								id='login-password'
								type='password'
								autoComplete='current-password'
								required
								value={password}
								onChange={(e) => setPassword(e.target.value)}
							/>
						</div>
						<button
							type='submit'
							className={styles.primary}
							disabled={busy}
						>
							Log in
						</button>
						{error && <div className={styles.error}>{error}</div>}
						<div className={styles.help}>
							New here?{' '}
							<a
								className={styles.helpLink}
								href='#'
								onClick={(e) => {
									e.preventDefault();
									onSwitchToRegister?.();
								}}
							>
								Create an account
							</a>
						</div>
					</form>
				</div>
			</div>
		</div>
	);
}
