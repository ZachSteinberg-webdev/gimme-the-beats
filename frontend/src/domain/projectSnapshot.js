// Default beat created for new guest user
export const createDefaultProject = () => ({
	title: 'Untitled Beat',
	bpm: 120,
	steps: 16,
	swing: 0,
	tracks: [
		{
			id: 'kick',
			name: 'Kick',
			sampleId: 'kit-808/kick.wav',
			gain: -3,
			pan: 0,
			mute: false,
			solo: false,
			pattern: [110, 0, 0, 0, 110, 0, 0, 0, 110, 0, 0, 0, 110, 0, 0, 0]
		},
		{
			id: 'snare',
			name: 'Snare',
			sampleId: 'kit-808/snare.wav',
			gain: -2,
			pan: 0,
			mute: false,
			solo: false,
			pattern: [0, 0, 0, 0, 110, 0, 0, 0, 0, 0, 0, 0, 110, 0, 0, 0]
		},
		{
			id: 'hat',
			name: 'Closed Hat', // reflect rename
			sampleId: 'kit-808/closed-hat.wav', // was hat.wav
			gain: -8,
			pan: 0,
			mute: false,
			solo: false,
			pattern: [70, 70, 70, 70, 70, 70, 70, 70, 70, 70, 70, 70, 70, 70, 70, 70]
		},
		{
			id: 'clap',
			name: 'Clap',
			sampleId: 'kit-808/clap.wav',
			gain: -6,
			pan: 0,
			mute: false,
			solo: false,
			pattern: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 90, 0, 0, 0]
		}
	],
	createdAt: Date.now(),
	updatedAt: Date.now()
});

export const serializeProject = (project) => JSON.stringify(project);
export const parseProject = (json) => JSON.parse(json);

// Create a blank project with 4 default tracks and no active steps.
// Preserves bpm/steps/swing when provided.
export const createBlankProject = ({ bpm = 120, steps = 16, swing = 0 } = {}) => ({
	title: 'Untitled Beat',
	bpm,
	steps,
	swing,
	tracks: [
		{
			id: 'kick',
			name: 'Kick',
			sampleId: 'kit-808/kick.wav',
			gain: -3,
			pan: 0,
			mute: false,
			solo: false,
			pattern: new Array(steps).fill(0)
		},
		{
			id: 'snare',
			name: 'Snare',
			sampleId: 'kit-808/snare.wav',
			gain: -2,
			pan: 0,
			mute: false,
			solo: false,
			pattern: new Array(steps).fill(0)
		},
		{
			id: 'hat',
			name: 'Closed Hat',
			sampleId: 'kit-808/closed-hat.wav',
			gain: -8,
			pan: 0,
			mute: false,
			solo: false,
			pattern: new Array(steps).fill(0)
		},
		{
			id: 'clap',
			name: 'Clap',
			sampleId: 'kit-808/clap.wav',
			gain: -6,
			pan: 0,
			mute: false,
			solo: false,
			pattern: new Array(steps).fill(0)
		}
	],
	createdAt: Date.now(),
	updatedAt: Date.now()
});
