import { useMemo, useRef, useEffect, useState } from 'react';
import { useProject } from '../state/ProjectContext.jsx';
import styles from './TransportBar.module.css';
import Knob from './Knob.jsx';
import ProjectsModal from './ProjectsModal.jsx';
import { api } from '../lib/api.js';

const STEP_OPTIONS = [8, 16, 32, 64, 128];

export default function TransportBar({ onToggleReorder, reorderMode }) {
	const { project, projectId, actions, isPlaying } = useProject();
	const tapRef = useRef([]);
	const swingPercent = useMemo(() => Math.round((project.swing ?? 0) * 100), [project.swing]);
	const canAdd = project.tracks.length < 12;
	const canStartNewProject = Boolean(projectId);

	const [isShiftDown, setIsShiftDown] = useState(false);

	useEffect(() => {
		const onKeyDown = (e) => {
			if (e.key === 'Shift') setIsShiftDown(true);
		};
		const onKeyUp = (e) => {
			if (e.key === 'Shift') setIsShiftDown(false);
		};
		const onBlur = () => setIsShiftDown(false);
		window.addEventListener('keydown', onKeyDown);
		window.addEventListener('keyup', onKeyUp);
		window.addEventListener('blur', onBlur);
		return () => {
			window.removeEventListener('keydown', onKeyDown);
			window.removeEventListener('keyup', onKeyUp);
			window.removeEventListener('blur', onBlur);
		};
	}, []);
	const addButtonLabel = reorderMode ? 'Done' : isShiftDown ? 'Reorder' : 'Add Track';
	const addButtonTitle = reorderMode
		? 'Done reordering'
		: canAdd
			? 'Add a new track (Shift+click to reorder)'
			: 'Maximum of 12 tracks';
	const addButtonDisabled = !reorderMode && !canAdd;

	const longPressTimerRef = useRef(null);
	const clearReorderLP = () => {
		if (longPressTimerRef.current) {
			clearTimeout(longPressTimerRef.current);
			longPressTimerRef.current = null;
		}
	};
	const startReorderLP = () => {
		clearReorderLP();
		longPressTimerRef.current = setTimeout(() => {
			onToggleReorder?.();
			clearReorderLP();
		}, 600);
	};

	// Projects modal state
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState(null);
	const [showList, setShowList] = useState(false);
	const [projects, setProjects] = useState([]);

	const refresh = async () => {
		setError(null);
		try {
			const list = await api.get('/projects');
			setProjects(list);
		} catch (e) {
			setError(e.message || String(e));
		}
	};

	useEffect(() => {
		if (showList) refresh();
	}, [showList]);

	const onSave = async () => {
		setBusy(true);
		setError(null);
		try {
			if (projectId) {
				const updated = await api.put(`/projects/${projectId}`, project);
				actions.setLoadedProjectId(updated._id);
			} else {
				const created = await api.post('/projects', project);
				actions.setLoadedProjectId(created._id);
			}
		} catch (e) {
			setError(e.message || String(e));
		} finally {
			setBusy(false);
		}
	};

	const onLoad = async (id) => {
		setBusy(true);
		setError(null);
		try {
			const doc = await api.get(`/projects/${id}`);
			const { _id, __v, ...rest } = doc || {};
			delete rest.createdAt;
			delete rest.updatedAt;
			actions.loadProject(rest);
			actions.setLoadedProjectId(doc._id);
			setShowList(false);
		} catch (e) {
			setError(e.message || String(e));
		} finally {
			setBusy(false);
		}
	};

	const onTap = () => {
		const now = performance.now();
		let arr = tapRef.current.slice();
		if (arr.length && now - arr[arr.length - 1] > 2000) arr = [];
		arr.push(now);
		if (arr.length > 6) arr = arr.slice(arr.length - 6);
		tapRef.current = arr;
		if (arr.length >= 2) {
			const intervals = [];
			for (let i = 1; i < arr.length; i++) intervals.push(arr[i] - arr[i - 1]);
			const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length;
			const bpm = Math.max(20, Math.min(300, Math.round(60000 / avg)));
			actions.setBpm(bpm);
		}
	};

	const onNewProject = async () => {
		if (!canStartNewProject) return;
		setError(null);
		try {
			await actions.newProject();
		} catch (e) {
			setError(e.message || String(e));
		}
	};

	return (
		<div className={styles.bar}>
			<div className={styles.left}>
				<div className={styles.leftStack}>
					<button
						className={styles.key}
						onClick={isPlaying ? actions.stop : actions.play}
					>
						{isPlaying ? 'Stop' : 'Start'}
					</button>
					<button
						className={styles.tap}
						onClick={onTap}
						title='Tap Tempo'
					>
						Tap (BPM)
					</button>
					<button
						className={styles.addTrack}
						title={addButtonTitle}
						disabled={addButtonDisabled}
						onClick={(e) => {
							if (reorderMode) {
								e.preventDefault();
								onToggleReorder?.();
								return;
							}
							if (e.shiftKey) {
								e.preventDefault();
								onToggleReorder?.();
								return;
							}
							actions.addTrack();
						}}
						onPointerDown={(e) => {
							if (e.pointerType === 'touch') startReorderLP();
						}}
						onPointerUp={clearReorderLP}
						onPointerCancel={clearReorderLP}
						onPointerMove={clearReorderLP}
					>
						{addButtonLabel}
					</button>
				</div>
			</div>

			<div className={styles.center}>
				<div className={styles.group}>
					<Knob
						value={project.bpm}
						onChange={(v) => actions.setBpm(v)}
						min={20}
						max={300}
						step={1}
						size={72}
						label='Tempo'
					/>
				</div>

				<div className={`${styles.group} ${styles.groupSteps}`}>
					<div
						className={styles.segmented}
						role='group'
						aria-label='Steps'
					>
						{STEP_OPTIONS.map((n, idx) => {
							const active = project.steps === n;
							const className = [
								styles.segBtn,
								active ? styles.segBtnActive : '',
								idx === 0 ? styles.segBtnFirst : '',
								idx === STEP_OPTIONS.length - 1 ? styles.segBtnLast : ''
							]
								.join(' ')
								.trim();
							return (
								<button
									key={n}
									type='button'
									className={className}
									data-step={n}
									aria-pressed={active}
									onClick={() => actions.setSteps(n)}
									title={`${n} steps`}
								>
									{n}
								</button>
							);
						})}
					</div>
					<div className={styles.legend}>Steps</div>
				</div>

				<div className={styles.group}>
					<Knob
						value={swingPercent}
						onChange={(v) => actions.setSwing(v / 100)}
						min={0}
						max={60}
						step={1}
						size={72}
						label='Swing'
						format={(v) => `${v}%`}
					/>
				</div>
			</div>

			{/* Right: Project controls stacked */}
			<div className={styles.right}>
				<button
					type='button'
					className={styles.projBtn}
					onClick={() => setShowList(true)}
				>
					Load Project
				</button>
				<button
					type='button'
					className={styles.projBtn}
					onClick={onNewProject}
					disabled={!canStartNewProject}
					title={
						canStartNewProject ? 'Start a new blank project' : 'Save the current project before starting a new one'
					}
				>
					New Project
				</button>
				<button
					type='button'
					className={styles.projBtnPrimary}
					onClick={onSave}
					disabled={busy}
				>
					{projectId ? 'Save Changes' : 'Save Project'}
				</button>
			</div>

			<ProjectsModal
				open={showList}
				onClose={() => setShowList(false)}
				projects={projects}
				onRefresh={refresh}
				onLoad={onLoad}
				busy={busy}
				error={error}
			/>
		</div>
	);
}
