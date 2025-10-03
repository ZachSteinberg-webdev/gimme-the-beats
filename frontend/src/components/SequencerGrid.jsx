import { useMemo, useEffect, useState, useRef } from 'react';
import { DndContext, PointerSensor, useSensor, useSensors, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useProject } from '../state/ProjectContext.jsx';
import styles from './SequencerGrid.module.css';
import { sampleDisplayName } from '../audio/kit808.js';
import Knob from './Knob.jsx';

export default function SequencerGrid({ reorderMode = false }) {
	const { project, actions, currentStep, sampleOptions, isPlaying } = useProject();
	const gridRef = useRef(null);
	const [focusTrack, setFocusTrack] = useState(0);
	const [focusStep, setFocusStep] = useState(0);
	const [liveMessage, setLiveMessage] = useState('');

	// --- Keyboard controls (unchanged) ---
	useEffect(() => {
		function isTypingContext(el) {
			if (!el) return false;
			const tag = el.tagName;
			if (!tag) return false;
			if (el.isContentEditable) return true;
			return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
		}
		function onKeyDown(e) {
			const active = document.activeElement;
			if (isTypingContext(active)) return;
			if (active && active.closest && active.closest('[role="dialog"], .modal')) return;
			const key = e.key;
			if (key === ' ' || key === 'Spacebar') {
				e.preventDefault();
				if (isPlaying) actions.stop();
				else actions.play();
				return;
			}
			if (key === 'ArrowUp' || key === 'ArrowDown' || key === 'ArrowLeft' || key === 'ArrowRight') {
				e.preventDefault();
				const numTracks = project.tracks.length;
				const cols = project.steps;
				if (key === 'ArrowUp') setFocusTrack((t) => (numTracks ? (t - 1 + numTracks) % numTracks : 0));
				if (key === 'ArrowDown') setFocusTrack((t) => (numTracks ? (t + 1) % numTracks : 0));
				if (key === 'ArrowLeft') setFocusStep((c) => (cols ? (c - 1 + cols) % cols : 0));
				if (key === 'ArrowRight') setFocusStep((c) => (cols ? (c + 1) % cols : 0));
				return;
			}
			if (key === 'Enter') {
				e.preventDefault();
				const rows = project.tracks;
				const cols = project.steps;
				if (rows.length && cols > 0) {
					const tr = rows[Math.max(0, Math.min(rows.length - 1, focusTrack))];
					const step = Math.max(0, Math.min(cols - 1, focusStep));
					actions.toggleStep(tr.id, step);
				}
				return;
			}
		}
		window.addEventListener('keydown', onKeyDown);
		return () => window.removeEventListener('keydown', onKeyDown);
	}, [project.tracks.length, project.steps, isPlaying, focusTrack, focusStep, actions]);

	useEffect(() => {
		setFocusTrack((t) => Math.max(0, Math.min(project.tracks.length - 1, t)));
	}, [project.tracks.length]);
	useEffect(() => {
		setFocusStep((c) => Math.max(0, Math.min(project.steps - 1, c)));
	}, [project.steps]);

	// Announce playhead movement
	useEffect(() => {
		setLiveMessage(`Playhead at step ${currentStep + 1}`);
	}, [currentStep]);

	// --- dnd-kit ---
	const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
	const rowIds = useMemo(() => project.tracks.map((t, i) => String(t?.id ?? `row-${i}`)), [project.tracks]);
	const cols = project.steps;
	const rowIdOf = (tr, idx) => String(tr?.id ?? `row-${idx}`);

	return (
		<DndContext
			sensors={sensors}
			collisionDetection={closestCenter}
			onDragEnd={({ active, over }) => {
				if (!active || !over || active.id === over.id) return;
				const from = project.tracks.findIndex((t, i) => rowIdOf(t, i) === active.id);
				const to = project.tracks.findIndex((t, i) => rowIdOf(t, i) === over.id);
				if (from !== -1 && to !== -1 && from !== to) {
					const movedName = sampleDisplayName(project.tracks[from].sampleId);
					actions.reorderTracks(from, to);
					setLiveMessage(`Track ${movedName} moved to position ${to + 1}`);
				}
			}}
		>
			<SortableContext
				items={rowIds}
				strategy={verticalListSortingStrategy}
			>
				<div
					ref={gridRef}
					className={styles.grid}
					role='grid'
					aria-label='Step sequencer'
					aria-rowcount={project.tracks.length}
					aria-colcount={project.steps}
				>
					{project.tracks.map((tr, rowIndex) => (
						<TrackRow
							key={`trk-${rowIndex}-${rowIdOf(tr, rowIndex)}`}
							sortableId={rowIdOf(tr, rowIndex)}
							reorderMode={reorderMode}
							track={tr}
							cols={cols}
							currentStep={currentStep}
							focusTrack={focusTrack}
							focusStep={focusStep}
							rowIndex={rowIndex}
							onToggleStep={(step) => actions.toggleStep(tr.id, step)}
							onSetVel={(step, v) => actions.setStepVelocity(tr.id, step, v)}
							onMute={() => actions.toggleMute(tr.id)}
							onSolo={() => actions.toggleSolo(tr.id)}
							onChangeSample={(sid) => actions.setTrackSample(tr.id, sid)}
							onSetGain={(db) => actions.setTrackGain(tr.id, db)}
							onSetPan={(p) => actions.setTrackPan(tr.id, p)}
							onSetPitch={(st) => actions.setTrackPitch(tr.id, st)}
							onSetDecay={(ms) => actions.setTrackDecay(tr.id, ms)}
							onSetReverb={(pct) => actions.setTrackReverbSend(tr.id, pct)}
							onSetDelay={(pct) => actions.setTrackDelaySend(tr.id, pct)}
							onRemove={() => actions.removeTrack(tr.id)}
							canRemove={project.tracks.length > 1}
							sampleOptions={sampleOptions}
							onAnnounce={(msg) => setLiveMessage(msg)}
						/>
					))}
				</div>
			</SortableContext>
			<div
				aria-live='polite'
				aria-atomic='true'
				style={{ position: 'absolute', left: '-9999px' }}
			>
				{liveMessage}
			</div>
		</DndContext>
	);
}

function TrackRow({
	sortableId,
	reorderMode,
	track,
	cols,
	currentStep,
	focusTrack,
	focusStep,
	rowIndex,
	onToggleStep,
	onSetVel,
	onMute,
	onSolo,
	onChangeSample,
	onSetGain,
	onSetPan,
	onSetPitch,
	onSetDecay,
	onSetReverb,
	onSetDelay,
	onRemove,
	canRemove,
	sampleOptions
}) {
	const steps = useMemo(() => {
		const arr = new Array(cols);
		for (let i = 0; i < cols; i++) arr[i] = track.pattern[i % track.pattern.length] | 0;
		return arr;
	}, [track.pattern, cols]);

	const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
		id: sortableId,
		disabled: !reorderMode
	});

	// Outer: dnd transform & cursor only
	const rowStyle = {
		'--cols': cols,
		transform: transform ? CSS.Transform.toString(transform) : undefined,
		transition,
		cursor: reorderMode ? (isDragging ? 'grabbing' : 'grab') : 'default',
		userSelect: reorderMode ? 'none' : undefined,
		zIndex: isDragging ? 2 : 'auto' // lift the dragged track
	};

	// Inner: whole-track jiggle + white outline
	const innerClass = [styles.rowInner, reorderMode ? styles.rowReorder : '', isDragging ? styles.rowDragging : '']
		.filter(Boolean)
		.join(' ');

	return (
		<div
			ref={setNodeRef}
			className={styles.row}
			style={rowStyle}
			role='row'
			aria-labelledby={`track-label-${rowIndex}`}
			{...(reorderMode ? { ...attributes, ...listeners } : {})}
		>
			<div className={innerClass}>
				{/* Left column: header */}
				<div className={styles.header}>
					<div className={styles.topRow}>
						<div className={styles.sampleDropdown}>
							<span
								id={`track-label-${rowIndex}`}
								role='rowheader'
								className={styles.sampleText}
								title={sampleDisplayName(track.sampleId)}
							>
								{sampleDisplayName(track.sampleId)}
							</span>
							<span
								className={styles.caret}
								aria-hidden='true'
							/>
							<select
								className={styles.nativeSelect}
								value={track.sampleId}
								onChange={(e) => onChangeSample(e.target.value)}
								aria-label='Select sample'
							>
								{sampleOptions.map((sid) => (
									<option
										key={sid}
										value={sid}
									>
										{sampleDisplayName(sid)}
									</option>
								))}
							</select>
						</div>

						<div
							className={styles.actionGroup}
							role='group'
							aria-label='Track actions'
						>
							<button
								className={styles.actionBtn}
								onClick={() => {
									onMute();
									onAnnounce(
										`Track ${rowIndex + 1} ${!track.mute ? 'muted' : 'unmuted'}: ${sampleDisplayName(track.sampleId)}`
									);
								}}
								aria-pressed={track.mute}
								title='Mute'
							>
								M
							</button>
							<button
								className={styles.actionBtn}
								onClick={() => {
									onSolo();
									onAnnounce(
										`Track ${rowIndex + 1} ${!track.solo ? 'solo enabled' : 'solo disabled'}: ${sampleDisplayName(track.sampleId)}`
									);
								}}
								aria-pressed={track.solo}
								title='Solo'
							>
								S
							</button>
							<button
								className={styles.actionBtn}
								onClick={() => {
									onRemove();
									onAnnounce(`Track ${rowIndex + 1} removed: ${sampleDisplayName(track.sampleId)}`);
								}}
								disabled={!canRemove}
								title={canRemove ? 'Remove' : 'At least 1 track required'}
							>
								X
							</button>
						</div>
					</div>

					<div className={styles.knobRow}>
						<div className={styles.knobWrap}>
							<Knob
								value={track.gain ?? -6}
								onChange={(v) => onSetGain(v)}
								min={-24}
								max={6}
								step={1}
								size={40}
								label='Gain (dB)'
								format={(v) => String(v)}
								labelStyle={{ textTransform: 'none', letterSpacing: 0, whiteSpace: 'nowrap', fontSize: '10px' }}
							/>
						</div>
						<div className={styles.knobWrap}>
							<Knob
								value={Math.round((track.pan ?? 0) * 100)}
								onChange={(v) => onSetPan(Math.max(-1, Math.min(1, (v | 0) / 100)))}
								min={-100}
								max={100}
								step={1}
								size={40}
								label='Pan'
								format={(v) => String(v)}
								labelStyle={{ textTransform: 'none', letterSpacing: 0, whiteSpace: 'nowrap', fontSize: '10px' }}
							/>
						</div>
						<div className={styles.knobWrap}>
							<Knob
								value={track.pitch ?? 0}
								onChange={(v) => onSetPitch(v)}
								min={-12}
								max={12}
								step={1}
								size={40}
								label='Pitch'
								format={(v) => String(v)}
								labelStyle={{ textTransform: 'none', letterSpacing: 0, whiteSpace: 'nowrap', fontSize: '10px' }}
							/>
						</div>
						<div className={styles.knobWrap}>
							<Knob
								value={track.decay ?? 300}
								onChange={(v) => onSetDecay(Math.max(20, Math.min(5000, v | 0)))}
								min={20}
								max={5000}
								step={10}
								size={40}
								label='Decay (ms)'
								format={(v) => String(v)}
								labelStyle={{ textTransform: 'none', letterSpacing: 0, whiteSpace: 'nowrap', fontSize: '10px' }}
							/>
						</div>
						<div className={styles.knobWrap}>
							<Knob
								value={track.reverbSend ?? 0}
								onChange={(v) => onSetReverb(Math.max(0, Math.min(100, v | 0)))}
								min={0}
								max={100}
								step={1}
								size={40}
								label='Rev (%)'
								format={(v) => String(v)}
								labelStyle={{ textTransform: 'none', letterSpacing: 0, whiteSpace: 'nowrap', fontSize: '10px' }}
								titleAttr='Reverb Send'
							/>
						</div>
						<div className={styles.knobWrap}>
							<Knob
								value={track.delaySend ?? 0}
								onChange={(v) => onSetDelay(Math.max(0, Math.min(100, v | 0)))}
								min={0}
								max={100}
								step={1}
								size={40}
								label='Dly (%)'
								format={(v) => String(v)}
								labelStyle={{ textTransform: 'none', letterSpacing: 0, whiteSpace: 'nowrap', fontSize: '10px' }}
								titleAttr='Delay Send'
							/>
						</div>
					</div>
				</div>

				{/* Right column (steps + velocity) */}
				<div className={styles.right}>
					<div className={styles.scrollWrap}>
						<div className={styles.scrollInner}>
							<div className={styles.stepGrid}>
								{steps.map((vel, i) => {
									const on = vel > 0;
									const isPlayhead = i === currentStep % cols;
									const isAccent = i % 4 === 0;

									const g = Math.floor((i % 16) / 4);
									const groupVars =
										g === 0
											? { '--pad-on': 'var(--tr-red)', '--pad-dim': 'var(--tr-red-dim)' }
											: g === 1
												? { '--pad-on': 'var(--tr-orange2)', '--pad-dim': 'var(--tr-orange2-dim)' }
												: g === 2
													? { '--pad-on': 'var(--tr-yellow)', '--pad-dim': 'var(--tr-yellow-dim)' }
													: { '--pad-on': 'var(--tr-white)', '--pad-dim': 'var(--tr-white-dim)' };

									let padClass = styles.pad;
									const isFocusedCell = focusTrack === rowIndex && i === focusStep;
									if (isFocusedCell) padClass += ' ' + styles.padKeyFocus;
									if (on) padClass += ' ' + styles.padOn;
									if (isPlayhead) padClass += ' ' + styles.padPlay;
									if (!on && isPlayhead) padClass += ' ' + styles.padOffPlay;
									if (isAccent) padClass += ' ' + styles.padAccent;

									const onContextMenu = (e) => {
										e.preventDefault();
										onToggleStep(i);
									};

									return (
										<button
											key={`pad-${rowIndex}-${i}`}
											role='gridcell'
											aria-selected={on}
											tabIndex={focusTrack === rowIndex && focusStep === i ? 0 : -1}
											aria-label={`Track ${rowIndex + 1}, Step ${i + 1}`}
											onClick={() => {
												onToggleStep(i);
												onAnnounce(`Track ${rowIndex + 1}, Step ${i + 1} ${!on ? 'on' : 'off'}`);
											}}
											onContextMenu={onContextMenu}
											className={padClass}
											style={groupVars}
											title={`Step ${i + 1} — ${on ? `vel ${vel}` : 'off'}`}
										/>
									);
								})}
							</div>

							<div className={styles.velGrid}>
								{steps.map((vel, i) => (
									<div
										key={`vk-${rowIndex}-${i}`}
										className={styles.velKnob}
									>
										<Knob
											value={vel}
											onChange={(v) => onSetVel(i, Math.max(0, Math.min(127, v | 0)))}
											min={0}
											max={127}
											step={1}
											size={40}
											format={(v) => (v === 0 ? 'off' : String(v))}
											titleAttr='Velocity'
										/>
									</div>
								))}
							</div>
						</div>
					</div>
				</div>
			</div>
			{/* /.rowInner */}
		</div>
	);
}
