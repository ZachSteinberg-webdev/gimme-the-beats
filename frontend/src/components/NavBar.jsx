import { useEffect, useRef, useState } from 'react';
import styles from './NavBar.module.css';
import { useAuth } from '../state/AuthContext.jsx';

function UserIcon({ size = 22 }) {
	return (
		<svg
			width={size}
			height={size}
			viewBox='0 0 24 24'
			aria-hidden='true'
			fill='currentColor'
		>
			<path d='M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5Zm0 2c-5.33 0-8 2.67-8 6a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1c0-3.33-2.67-6-8-6Z' />
		</svg>
	);
}

export default function NavBar({ onOpenLogin, onOpenRegister, onOpenDashboard, onOpenInstructions, onOpenSettings }) {
	const { user, logout } = useAuth();
	const [open, setOpen] = useState(false);
	const ref = useRef(null);

	useEffect(() => {
		function onDocClick(e) {
			if (!open) return;
			if (!ref.current) return;
			if (!ref.current.contains(e.target)) setOpen(false);
		}
		function onEsc(e) {
			if (e.key === 'Escape') setOpen(false);
		}
		document.addEventListener('mousedown', onDocClick);
		window.addEventListener('keydown', onEsc);
		return () => {
			document.removeEventListener('mousedown', onDocClick);
			window.removeEventListener('keydown', onEsc);
		};
	}, [open]);

	return (
		<nav className={styles.nav}>
			<div className={styles.inner}>
				<div className={styles.brand}>
					<a
						className={styles.logo}
						href='/'
						onClick={(e) => {
							e.preventDefault();
							window.history.pushState({}, '', '/');
						}}
					>
						Gimme The Beats
					</a>
				</div>
				<div className={styles.spacer} />
				<div
					ref={ref}
					className={styles.menuWrap}
				>
					<button
						className={styles.menuBtn}
						aria-haspopup='menu'
						aria-expanded={open}
						title='Menu'
						onClick={() => setOpen((v) => !v)}
					>
						<UserIcon />
					</button>
					{open && (
						<div
							className={styles.dropdown}
							role='menu'
						>
							{user ? (
								<div className={styles.user}>
									<div style={{ fontWeight: 600 }}>{user.name || 'Account'}</div>
									<div style={{ opacity: 0.75, fontSize: 12 }}>{user.email}</div>
								</div>
							) : null}

							<a
								href='#'
								className={styles.item}
								role='menuitem'
								onClick={(e) => {
									e.preventDefault();
									onOpenInstructions?.();
									setOpen(false);
								}}
							>
								Instructions
							</a>
							<a
								href='#'
								className={styles.item}
								role='menuitem'
								onClick={(e) => {
									e.preventDefault();
									onOpenSettings?.();
									setOpen(false);
								}}
							>
								Settings
							</a>

							{user ? (
								<>
									<a
										href='#'
										className={styles.item}
										role='menuitem'
										onClick={(e) => {
											e.preventDefault();
											onOpenDashboard?.();
											setOpen(false);
										}}
									>
										Dashboard
									</a>
									<div className={styles.sep} />
									<a
										href='#'
										className={styles.item}
										role='menuitem'
										onClick={async (e) => {
											e.preventDefault();
											await logout();
											setOpen(false);
										}}
									>
										Logout
									</a>
								</>
							) : (
								<>
									<a
										href='#'
										className={styles.item}
										role='menuitem'
										onClick={(e) => {
											e.preventDefault();
											onOpenRegister?.();
											setOpen(false);
										}}
									>
										Register
									</a>
									<a
										href='#'
										className={styles.item}
										role='menuitem'
										onClick={(e) => {
											e.preventDefault();
											onOpenLogin?.();
											setOpen(false);
										}}
									>
										Login
									</a>
								</>
							)}
						</div>
					)}
				</div>
			</div>
		</nav>
	);
}
