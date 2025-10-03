import TransportBar from './TransportBar.jsx';
import SequencerGrid from './SequencerGrid.jsx';
import { useProject } from '../state/ProjectContext.jsx';
import { useEffect, useState } from 'react';

export default function Studio() {
	const { project, projectId, actions } = useProject();
	const [reorderMode, setReorderMode] = useState(false);
	const [editing, setEditing] = useState(false);
	const [draft, setDraft] = useState('');
	useEffect(() => {
		if (!editing) setDraft(project?.title || 'Untitled Beat');
	}, [project?.title, editing]);

	const Title = (
		<div className='studioTitleWrap'>
			{editing ? (
				<input
					value={draft}
					onChange={(e) => setDraft(e.target.value)}
					onKeyDown={(e) => {
						if (e.key === 'Enter') {
							actions.setProjectTitle((draft || 'Untitled Beat').trim());
							setEditing(false);
						} else if (e.key === 'Escape') {
							setEditing(false);
							setDraft(project?.title || 'Untitled Beat');
						}
					}}
					onBlur={() => {
						actions.setProjectTitle((draft || 'Untitled Beat').trim());
						setEditing(false);
					}}
					autoFocus
					aria-label='Project title'
					className='studioTitleInput'
				/>
			) : (
				<span
					title='Click to rename'
					onClick={() => setEditing(true)}
					className='studioTitle'
				>
					{project?.title || 'Untitled Beat'}
				</span>
			)}
			{projectId ? (
				<span className={`studioBadge ${editing ? 'studioBadgeHidden' : ''}`}>Saved</span>
			) : (
				<span className={`studioBadgeMuted ${editing ? 'studioBadgeHidden' : ''}`}>Unsaved</span>
			)}
		</div>
	);

	return (
		<section className='tr808-panel'>
			<h2 className='studioTitleBar'>
				<div className='studioTitleBarInner'>{Title}</div>
			</h2>
			<TransportBar
				reorderMode={reorderMode}
				onToggleReorder={() => setReorderMode((v) => !v)}
			/>
			<SequencerGrid reorderMode={reorderMode} />
		</section>
	);
}
