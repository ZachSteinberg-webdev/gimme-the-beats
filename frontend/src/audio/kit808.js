// 808 kit catalog + display helpers

// A kit object with a files map (keys are the sampleIds you use in tracks)
export const KIT_808 = {
	baseUrl: '/samples', // resolved as: `${baseUrl}/${url}`
	files: {
		'kit-808/kick.wav': 'kit-808/kick.wav',
		'kit-808/snare.wav': 'kit-808/snare.wav',
		'kit-808/closed-hat.wav': 'kit-808/closed-hat.wav', // was hat.wav
		'kit-808/open-hat.wav': 'kit-808/open-hat.wav',
		'kit-808/clap.wav': 'kit-808/clap.wav',
		'kit-808/clave.wav': 'kit-808/clave.wav',
		'kit-808/cowbell.wav': 'kit-808/cowbell.wav',
		'kit-808/crash.wav': 'kit-808/crash.wav',
		'kit-808/low-tom.wav': 'kit-808/low-tom.wav',
		'kit-808/mid-tom.wav': 'kit-808/mid-tom.wav',
		'kit-808/high-tom.wav': 'kit-808/high-tom.wav',
		'kit-808/maracas.wav': 'kit-808/maracas.wav',
		'kit-808/rim.wav': 'kit-808/rim.wav'
	}
};

// Sample picker options = the sampleIds (keys of the files map)
export const SAMPLE_OPTIONS = Object.keys(KIT_808.files);

// Turn "kit-808/low-tom.wav" -> "Low Tom"
export function sampleDisplayName(sampleId) {
	const file = sampleId.split('/').pop() || sampleId;
	const base = file.replace(/\.\w+$/, ''); // strip extension
	const spaced = base.replace(/-/g, ' '); // hyphen -> space
	return spaced.replace(/\b\w/g, (m) => m.toUpperCase());
}
