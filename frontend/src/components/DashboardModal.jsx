// frontend/src/components/DashboardModal.jsx
import { useEffect, useState } from 'react';
import styles from './AuthModal.module.css';
import { useAuth } from '../state/AuthContext.jsx';
import { useProject } from '../state/ProjectContext.jsx';
import { api } from '../lib/api.js';

function ConfirmDialog({ open, title = 'Confirm', message, onCancel, onConfirm }) {
	if (!open) return null;
	return (
		<div
			className={styles.overlay}
			onMouseDown={(e) => {
				if (e.target === e.currentTarget) onCancel?.();
			}}
		>
			<div
				className={styles.sheet}
				role='dialog'
				aria-modal='true'
				aria-labelledby='confirm-title'
			>
				<div className={styles.header}>
					<div
						className={styles.title}
						id='confirm-title'
					>
						{title}
					</div>
					<button
						className={styles.close}
						aria-label='Close'
						onClick={onCancel}
					>
						×
					</button>
				</div>
				<div className={styles.body}>
					<p style={{ marginBottom: 12 }}>{message}</p>
					<div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
						<button onClick={onCancel}>Cancel</button>
						<button
							className={styles.primary}
							onClick={onConfirm}
						>
							Delete
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}

function TrashIcon({ size = 14 }) {
	return (
		<svg
			width={size}
			height={size}
			viewBox='0 0 24 24'
			fill='none'
			xmlns='http://www.w3.org/2000/svg'
			aria-hidden='true'
		>
			<path
				d='M3 6h18'
				stroke='currentColor'
				strokeWidth='2'
				strokeLinecap='round'
			/>
			<path
				d='M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2'
				stroke='currentColor'
				strokeWidth='2'
			/>
			<path
				d='M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6'
				stroke='currentColor'
				strokeWidth='2'
			/>
			<path
				d='M10 11v6M14 11v6'
				stroke='currentColor'
				strokeWidth='2'
				strokeLinecap='round'
			/>
		</svg>
	);
}

export default function DashboardModal({ open, onClose }) {
	const { user, refresh } = useAuth();
	const { actions } = useProject();

	// Projects
	const [projects, setProjects] = useState([]);
	const [projError, setProjError] = useState('');
	const [deletingId, setDeletingId] = useState(null);
	const [hoverId, setHoverId] = useState(null);
	const [confirmState, setConfirmState] = useState({ open: false, id: null, title: '' });

	// Height tuned by you previously
	const projectItemHeight = 20; // px per item (approx)
	const visibleItems = 3;
	const scrollMax = projectItemHeight * visibleItems + 50; // + a little padding

	// Profile fields
	const [displayName, setDisplayName] = useState(user?.displayName || '');
	const [email, setEmail] = useState(user?.email || '');
	const [savingProfile, setSavingProfile] = useState(false);
	const [profileMsg, setProfileMsg] = useState('');

	// Password fields
	const [oldPassword, setOldPassword] = useState('');
	const [newPassword, setNewPassword] = useState('');
	const [savingPassword, setSavingPassword] = useState(false);
	const [passwordMsg, setPasswordMsg] = useState('');

	// Keep local fields in sync with user changes
	useEffect(() => {
		setDisplayName(user?.displayName || '');
		setEmail(user?.email || '');
	}, [user?.displayName, user?.email]);

	// ESC to close
	useEffect(() => {
		if (!open) return;
		const onKey = (e) => {
			if (e.key === 'Escape') onClose?.();
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	}, [open, onClose]);

	// Load projects on open
	useEffect(() => {
		let mounted = true;
		(async () => {
			if (!open) return;
			try {
				setProjError('');
				const list = await api.get('/projects');
				const arr = Array.isArray(list) ? list : Array.isArray(list?.projects) ? list.projects : [];
				if (mounted) setProjects(arr);
			} catch {
				if (mounted) setProjError('Unable to load your projects right now.');
			}
		})();
		return () => {
			mounted = false;
		};
	}, [open]);

	if (!open) return null;

	const onOverlay = (e) => {
		if (e.target === e.currentTarget) onClose?.();
	};

	// Save profile (name/email)
	const saveProfile = async (e) => {
		e.preventDefault();
		setSavingProfile(true);
		setProfileMsg('');
		try {
			await api.put('/auth/me', { displayName, email });
			await refresh(); // update the auth context/user info
			setProfileMsg('Profile updated.');
		} catch {
			setProfileMsg('Failed to update profile.');
		} finally {
			setSavingProfile(false);
			setTimeout(() => setProfileMsg(''), 3000);
		}
	};

	// Change password
	const changePassword = async (e) => {
		e.preventDefault();
		setSavingPassword(true);
		setPasswordMsg('');
		try {
			await api.put('/auth/password', { oldPassword, newPassword });
			setOldPassword('');
			setNewPassword('');
			setPasswordMsg('Password updated.');
		} catch {
			setPasswordMsg('Failed to update password.');
		} finally {
			setSavingPassword(false);
			setTimeout(() => setPasswordMsg(''), 3000);
		}
	};

	// Click to load a project, then close the modal
	const onLoadProject = async (id) => {
		try {
			const doc = await api.get(`/projects/${id}`);
			const { _id, __v, ...rest } = doc || {};
			delete rest.createdAt;
			delete rest.updatedAt;
			actions.loadProject(rest);
			actions.setLoadedProjectId?.(doc._id);
			onClose?.();
		} catch (e) {
			setProjError(e?.message || String(e));
		}
	};

	// Open styled confirm dialog for deletion
	const askDelete = (e, id, title) => {
		e.stopPropagation();
		e.preventDefault();
		if (!id || deletingId) return;
		setConfirmState({ open: true, id, title: title || '' });
	};

	// Confirm delete
	const confirmDelete = async () => {
		const id = confirmState.id;
		if (!id) return setConfirmState({ open: false, id: null, title: '' });
		try {
			setDeletingId(id);
			await api.del(`/projects/${id}`);
			setProjects((prev) => prev.filter((p) => (p._id || p.id) !== id));
		} catch (err) {
			setProjError('Failed to delete project.');
		} finally {
			setDeletingId(null);
			setConfirmState({ open: false, id: null, title: '' });
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
				aria-labelledby='dash-title'
			>
				<div className={styles.header}>
					<div
						className={styles.title}
						id='dash-title'
					>
						Dashboard
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
					{!user ? (
						<p>You need to sign in to view your dashboard.</p>
					) : (
						<section style={{ display: 'grid', gap: 16 }}>
							{/* Summary + Projects */}
							<div>
								<p>
									Saved projects: <strong>{projects.length}</strong>
								</p>
								{projError && <div className={styles.error}>{projError}</div>}

								<div
									style={{
										marginTop: 8,
										border: '1px solid var(--tr-border, #333)',
										borderRadius: 8,
										overflow: 'auto',
										maxHeight: scrollMax
									}}
								>
									<ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
										{projects.map((p) => {
											const id = p._id || p.id;
											return (
												<li
													key={id}
													style={{
														padding: '10px 12px',
														borderBottom: '1px solid rgba(255,255,255,0.06)',
														height: projectItemHeight - 1,
														display: 'flex',
														alignItems: 'center',
														gap: 10,
														overflow: 'hidden',
														cursor: 'pointer'
													}}
													onClick={() => onLoadProject(id)}
													title={`${p.title || 'Untitled'} — ${p.bpm} BPM · ${p.steps} steps`}
													role='button'
													tabIndex={0}
													onKeyDown={(e) => {
														if (e.key === 'Enter' || e.key === ' ') onLoadProject(id);
													}}
												>
													<div
														style={{
															fontWeight: 600,
															whiteSpace: 'nowrap',
															textOverflow: 'ellipsis',
															overflow: 'hidden'
														}}
													>
														{p.title || 'Untitled'}
													</div>
													<div style={{ opacity: 0.7, fontSize: 12, marginLeft: 'auto' }}>
														{p.bpm} BPM · {p.steps} steps
													</div>
													<button
														aria-label='Delete project'
														onMouseEnter={() => setHoverId(id)}
														onMouseLeave={() => setHoverId((h) => (h === id ? null : h))}
														onClick={(e) => askDelete(e, id, p.title)}
														disabled={deletingId === id}
														style={{
															marginLeft: 8,
															background: hoverId === id ? 'rgba(255,0,0,0.12)' : 'transparent',
															border:
																hoverId === id ? '1px solid rgba(255,0,0,0.35)' : '1px solid rgba(255,255,255,0.18)',
															borderRadius: 6,
															color: hoverId === id ? '#ff6b6b' : 'inherit',
															padding: '4px 8px',
															cursor: 'pointer',
															display: 'grid',
															placeItems: 'center'
														}}
														title='Delete project'
													>
														{deletingId === id ? '…' : <TrashIcon />}
													</button>
												</li>
											);
										})}
										{projects.length === 0 && <li style={{ padding: '12px' }}>No projects yet.</li>}
									</ul>
								</div>
							</div>

							{/* Profile form */}
							<form
								onSubmit={saveProfile}
								className={styles.form}
								style={{ marginTop: 8 }}
							>
								<div className={styles.row}>
									<label htmlFor='dash-name'>Display name</label>
									<input
										id='dash-name'
										type='text'
										value={displayName}
										onChange={(e) => setDisplayName(e.target.value)}
									/>
								</div>
								<div className={styles.row}>
									<label htmlFor='dash-email'>Email</label>
									<input
										id='dash-email'
										type='email'
										value={email}
										onChange={(e) => setEmail(e.target.value)}
									/>
								</div>
								<div style={{ display: 'flex', gap: 8 }}>
									<button
										type='submit'
										className={styles.primary}
										disabled={savingProfile}
									>
										Save profile
									</button>
									{profileMsg && <div style={{ alignSelf: 'center', fontSize: 13, opacity: 0.9 }}>{profileMsg}</div>}
								</div>
							</form>

							{/* Password form */}
							<form
								onSubmit={changePassword}
								className={styles.form}
								style={{ marginTop: 8 }}
							>
								<div className={styles.row}>
									<label htmlFor='dash-oldpass'>Old password</label>
									<input
										id='dash-oldpass'
										type='password'
										autoComplete='current-password'
										value={oldPassword}
										onChange={(e) => setOldPassword(e.target.value)}
									/>
								</div>
								<div className={styles.row}>
									<label htmlFor='dash-newpass'>New password</label>
									<input
										id='dash-newpass'
										type='password'
										autoComplete='new-password'
										value={newPassword}
										onChange={(e) => setNewPassword(e.target.value)}
									/>
								</div>
								<div style={{ display: 'flex', gap: 8 }}>
									<button
										type='submit'
										className={styles.primary}
										disabled={savingPassword || !oldPassword || !newPassword}
									>
										Change password
									</button>
									{passwordMsg && <div style={{ alignSelf: 'center', fontSize: 13, opacity: 0.9 }}>{passwordMsg}</div>}
								</div>
							</form>
						</section>
					)}
				</div>
			</div>

			{/* Styled confirm dialog for deletion */}
			<ConfirmDialog
				open={confirmState.open}
				title='Delete project?'
				message={
					confirmState.title
						? `Delete "${confirmState.title}"? This cannot be undone.`
						: 'Delete this project? This cannot be undone.'
				}
				onCancel={() => setConfirmState({ open: false, id: null, title: '' })}
				onConfirm={confirmDelete}
			/>
		</div>
	);
}
