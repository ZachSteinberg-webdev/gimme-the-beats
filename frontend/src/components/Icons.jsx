/* Lightweight inline SVG icon set (no external deps) */
export const Icon = ({ children, size = 16, style }) => (
	<span style={{ display: 'inline-flex', width: size, height: size, verticalAlign: '-2px', marginRight: 8, ...style }}>
		{children}
	</span>
);

export const IconPlay = ({ size = 16 }) => (
	<Icon size={size}>
		<svg
			viewBox='0 0 24 24'
			width='100%'
			height='100%'
			fill='currentColor'
			aria-hidden='true'
		>
			<path d='M8 5l12 7-12 7z' />
		</svg>
	</Icon>
);

export const IconStop = ({ size = 16 }) => (
	<Icon size={size}>
		<svg
			viewBox='0 0 24 24'
			width='100%'
			height='100%'
			fill='currentColor'
			aria-hidden='true'
		>
			<rect
				x='6'
				y='6'
				width='12'
				height='12'
				rx='2'
			/>
		</svg>
	</Icon>
);

export const IconMetronome = ({ size = 16 }) => (
	<Icon size={size}>
		<svg
			viewBox='0 0 24 24'
			width='100%'
			height='100%'
			aria-hidden='true'
			fill='none'
			stroke='currentColor'
			strokeWidth='2'
			strokeLinecap='round'
		>
			<path d='M8 3l-4 18h16L16 3H8z' />
			<path d='M10 11l6-6' />
			<path d='M12 6l-2 12' />
		</svg>
	</Icon>
);

export const IconGrid = ({ size = 16 }) => (
	<Icon size={size}>
		<svg
			viewBox='0 0 24 24'
			width='100%'
			height='100%'
			aria-hidden='true'
			fill='none'
			stroke='currentColor'
			strokeWidth='2'
		>
			<rect
				x='3'
				y='3'
				width='7'
				height='7'
			/>
			<rect
				x='14'
				y='3'
				width='7'
				height='7'
			/>
			<rect
				x='3'
				y='14'
				width='7'
				height='7'
			/>
			<rect
				x='14'
				y='14'
				width='7'
				height='7'
			/>
		</svg>
	</Icon>
);

export const IconSine = ({ size = 16 }) => (
	<Icon size={size}>
		<svg
			viewBox='0 0 24 24'
			width='100%'
			height='100%'
			aria-hidden='true'
			fill='none'
			stroke='currentColor'
			strokeWidth='2'
		>
			<path d='M2 12c3-8 7 8 10 0s7 8 10 0' />
		</svg>
	</Icon>
);

export const IconPlus = ({ size = 16 }) => (
	<Icon size={size}>
		<svg
			viewBox='0 0 24 24'
			width='100%'
			height='100%'
			aria-hidden='true'
			fill='none'
			stroke='currentColor'
			strokeWidth='2'
		>
			<path d='M12 5v14M5 12h14' />
		</svg>
	</Icon>
);

export const IconFolder = ({ size = 16 }) => (
	<Icon size={size}>
		<svg
			viewBox='0 0 24 24'
			width='100%'
			height='100%'
			aria-hidden='true'
			fill='none'
			stroke='currentColor'
			strokeWidth='2'
		>
			<path d='M3 7h6l2 2h10v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z' />
		</svg>
	</Icon>
);

export const IconDownload = ({ size = 16 }) => (
	<Icon size={size}>
		<svg
			viewBox='0 0 24 24'
			width='100%'
			height='100%'
			aria-hidden='true'
			fill='none'
			stroke='currentColor'
			strokeWidth='2'
		>
			<path d='M12 3v12' />
			<path d='M7 10l5 5 5-5' />
			<path d='M5 21h14' />
		</svg>
	</Icon>
);

export const IconSparkle = ({ size = 16 }) => (
	<Icon size={size}>
		<svg
			viewBox='0 0 24 24'
			width='100%'
			height='100%'
			aria-hidden='true'
			fill='none'
			stroke='currentColor'
			strokeWidth='2'
			strokeLinecap='round'
		>
			<path d='M12 2l2 5 5 2-5 2-2 5-2-5-5-2 5-2 2-5z' />
		</svg>
	</Icon>
);

export const IconWave = ({ size = 16 }) => (
	<Icon size={size}>
		<svg
			viewBox='0 0 24 24'
			width='100%'
			height='100%'
			aria-hidden='true'
			fill='none'
			stroke='currentColor'
			strokeWidth='2'
		>
			<path d='M2 12c2 0 2-6 4-6s2 12 4 12 2-12 4-12 2 12 4 12 2-6 4-6' />
		</svg>
	</Icon>
);

export const IconSpeakerOff = ({ size = 16 }) => (
	<Icon size={size}>
		<svg
			viewBox='0 0 24 24'
			width='100%'
			height='100%'
			aria-hidden='true'
			fill='none'
			stroke='currentColor'
			strokeWidth='2'
		>
			<path d='M4 9v6h4l5 4V5L8 9H4z' />
			<path d='M19 5L5 19' />
		</svg>
	</Icon>
);

export const IconHeadphones = ({ size = 16 }) => (
	<Icon size={size}>
		<svg
			viewBox='0 0 24 24'
			width='100%'
			height='100%'
			aria-hidden='true'
			fill='none'
			stroke='currentColor'
			strokeWidth='2'
		>
			<path d='M4 13a8 8 0 0 1 16 0' />
			<rect
				x='3'
				y='13'
				width='4'
				height='8'
				rx='2'
			/>
			<rect
				x='17'
				y='13'
				width='4'
				height='8'
				rx='2'
			/>
		</svg>
	</Icon>
);

export const IconSlider = ({ size = 16 }) => (
	<Icon size={size}>
		<svg
			viewBox='0 0 24 24'
			width='100%'
			height='100%'
			aria-hidden='true'
			fill='none'
			stroke='currentColor'
			strokeWidth='2'
			strokeLinecap='round'
		>
			<path d='M4 6h16M4 12h8M4 18h12' />
			<circle
				cx='16'
				cy='6'
				r='2'
			/>
			<circle
				cx='12'
				cy='12'
				r='2'
			/>
			<circle
				cx='18'
				cy='18'
				r='2'
			/>
		</svg>
	</Icon>
);

export const IconArrowsLR = ({ size = 16 }) => (
	<Icon size={size}>
		<svg
			viewBox='0 0 24 24'
			width='100%'
			height='100%'
			aria-hidden='true'
			fill='none'
			stroke='currentColor'
			strokeWidth='2'
			strokeLinecap='round'
		>
			<path d='M7 12H3l4-4M7 12l-4 4' />
			<path d='M17 12h4l-4 4M17 12l4-4' />
		</svg>
	</Icon>
);

export const IconNote = ({ size = 16 }) => (
	<Icon size={size}>
		<svg
			viewBox='0 0 24 24'
			width='100%'
			height='100%'
			aria-hidden='true'
			fill='none'
			stroke='currentColor'
			strokeWidth='2'
			strokeLinecap='round'
		>
			<path d='M9 18V5l10-2v13' />
			<circle
				cx='7'
				cy='18'
				r='3'
			/>
			<circle
				cx='17'
				cy='16'
				r='3'
			/>
		</svg>
	</Icon>
);

export const IconHourglass = ({ size = 16 }) => (
	<Icon size={size}>
		<svg
			viewBox='0 0 24 24'
			width='100%'
			height='100%'
			aria-hidden='true'
			fill='none'
			stroke='currentColor'
			strokeWidth='2'
		>
			<path d='M6 2h12M6 22h12' />
			<path d='M8 2c0 5 8 5 8 10s-8 5-8 10' />
		</svg>
	</Icon>
);

export const IconWaves = ({ size = 16 }) => (
	<Icon size={size}>
		<svg
			viewBox='0 0 24 24'
			width='100%'
			height='100%'
			aria-hidden='true'
			fill='none'
			stroke='currentColor'
			strokeWidth='2'
		>
			<path
				d='M2 16c4 0 4-8 8-8s4 8 8 8 4-8 8-8'
				transform='scale(.5) translate(0,10)'
			/>
		</svg>
	</Icon>
);

export const IconClock = ({ size = 16 }) => (
	<Icon size={size}>
		<svg
			viewBox='0 0 24 24'
			width='100%'
			height='100%'
			aria-hidden='true'
			fill='none'
			stroke='currentColor'
			strokeWidth='2'
			strokeLinecap='round'
		>
			<circle
				cx='12'
				cy='12'
				r='9'
			/>
			<path d='M12 7v6l4 2' />
		</svg>
	</Icon>
);

export const IconEraser = ({ size = 16 }) => (
	<Icon size={size}>
		<svg
			viewBox='0 0 24 24'
			width='100%'
			height='100%'
			aria-hidden='true'
			fill='none'
			stroke='currentColor'
			strokeWidth='2'
		>
			<path d='M3 17l6-6 8 8H9z' />
			<path d='M14 4l6 6' />
		</svg>
	</Icon>
);

export const IconTrash = ({ size = 16 }) => (
	<Icon size={size}>
		<svg
			viewBox='0 0 24 24'
			width='100%'
			height='100%'
			aria-hidden='true'
			fill='none'
			stroke='currentColor'
			strokeWidth='2'
		>
			<path d='M3 6h18' />
			<path d='M8 6l1-2h6l1 2' />
			<rect
				x='6'
				y='6'
				width='12'
				height='14'
				rx='2'
			/>
		</svg>
	</Icon>
);

export const IconKeyboard = ({ size = 16 }) => (
	<Icon size={size}>
		<svg
			viewBox='0 0 24 24'
			width='100%'
			height='100%'
			aria-hidden='true'
			fill='none'
			stroke='currentColor'
			strokeWidth='2'
			strokeLinecap='round'
		>
			<rect
				x='2'
				y='6'
				width='20'
				height='12'
				rx='2'
			/>
			<path d='M6 10h.01M10 10h.01M14 10h.01M18 10h.01M6 14h12' />
		</svg>
	</Icon>
);

export const IconBrush = ({ size = 16 }) => (
	<Icon size={size}>
		<svg
			viewBox='0 0 24 24'
			width='100%'
			height='100%'
			aria-hidden='true'
			fill='none'
			stroke='currentColor'
			strokeWidth='2'
		>
			<path d='M14 2l8 8-6 6-8-8z' />
			<path d='M2 22c4-1 6-3 6-6' />
		</svg>
	</Icon>
);
