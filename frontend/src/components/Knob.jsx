import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSettings } from '../state/SettingsContext.jsx';
import styles from './Knob.module.css';

/**
 * Rotary Knob (SVG)
 * - Tempo/Swing: larger, centered value inside.
 * - Small knobs (≤ 40px, e.g. velocity): value centered inside automatically.
 * - Orange arc sits in the OUTER grey ring (rim stroke) with a tiny inward bias.
 *
 * Keep this in sync with CSS:
 *	 .rim { stroke-width: 6px; }
 */
export default function Knob({
	value,
	onChange,
	min = 0,
	max = 100,
	step = 1,
	size = 56,
	label,
	disabled = false,
	format,
	onDoubleClick,
	labelStyle,
	titleAttr
}) {
	const { settings } = useSettings();

	// Clamp + local state
	const clamp = useCallback((v) => Math.min(max, Math.max(min, v)), [min, max]);
	const [internal, setInternal] = useState(clamp(value ?? min));
	useEffect(() => {
		setInternal(clamp(value ?? min));
	}, [value, clamp, min]);

	// Commit helper
	const commit = useCallback(
		(v) => {
			const nv = clamp(Math.round(v));
			setInternal(nv);
			onChange && onChange(nv);
		},
		[clamp, onChange]
	);

	// Drag state
	const pressed = useRef(false);
	const startY = useRef(0);
	const startVal = useRef(0);

	// Larger transport knobs (Tempo/Swing)
	const isTransport = label === 'Tempo' || label === 'Swing';
	const MIN_TRANSPORT_SIZE = 96;
	const effSize = isTransport ? Math.max(size, MIN_TRANSPORT_SIZE) : size;

	// Mapping
	const range = max - min;
	const norm = range === 0 ? 0 : (internal - min) / range;
	const startDeg = -135;
	const endDeg = 135;
	const angle = startDeg + (endDeg - startDeg) * norm;

	// Base radii
	const r = effSize / 2 - 4; // rim circle centerline radius
	const cx = effSize / 2;
	const cy = effSize / 2;

	// MUST match your CSS
	const RIM_STROKE = 6;

	// ---- Grey-ring arc geometry ----
	// The rim stroke spans [r - RIM_STROKE/2, r + RIM_STROKE/2].
	// A small inward bias (~RIM_STROKE/10) produces the best visual match.
	const ARC_INWARD_BIAS = RIM_STROKE / 10; // 0.6px for a 6px rim
	const arcR = r - ARC_INWARD_BIAS; // centerline for the orange arc
	const arcStroke = RIM_STROKE; // exactly the rim thickness

	const faceR = r - RIM_STROKE; // face starts inside the rim
	const capR = faceR - 2;

	const polarOnArc = (deg) => {
		const rad = (deg - 90) * (Math.PI / 180);
		return [cx + arcR * Math.cos(rad), cy + arcR * Math.sin(rad)];
	};

	const arcPath = useMemo(() => {
		const [sx, sy] = polarOnArc(startDeg);
		const [ex, ey] = polarOnArc(angle);
		const largeArc = angle - startDeg > 180 ? 1 : 0;
		return `M ${sx} ${sy} A ${arcR} ${arcR} 0 ${largeArc} 1 ${ex} ${ey}`;
		// eslint-disable-next-line
	}, [angle, arcR, effSize]);

	// String for below-readout and small-knob center text
	const display = useMemo(() => {
		const n = Math.round(internal);
		if (format) return format(n);
		// sensible default for velocity-like knobs
		if (min === 0 && n === 0) return 'off';
		return String(n);
	}, [internal, format, min]);

	// a11y units for Tempo/Swing
	const a11yValueText = useMemo(() => {
		const n = Math.round(internal);
		if (label === 'Tempo') return `${n} bpm`;
		if (label === 'Swing') return `${n}%`;
		return display;
	}, [internal, label, display]);

	// Interactions
	const onPointerDown = (e) => {
		if (disabled) return;
		e.currentTarget.setPointerCapture?.(e.pointerId);
		pressed.current = true;
		startY.current = e.clientY ?? (e.touches && e.touches[0]?.clientY) ?? 0;
		startVal.current = internal;
	};

	const onPointerMove = (e) => {
		if (!pressed.current || disabled) return;
		const y = e.clientY ?? (e.touches && e.touches[0]?.clientY) ?? 0;
		const dy = startY.current - y; // up increases
		const dv = (dy / 150) * range;
		const stepped = Math.round(dv / step) * step;
		commit(startVal.current + stepped);
	};

	const onPointerUp = (e) => {
		if (!pressed.current) return;
		pressed.current = false;
		e.currentTarget.releasePointerCapture?.(e.pointerId);
	};

	// ✅ Wheel: scroll UP to increase, DOWN to decrease — with macOS Firefox handling
	const onWheel = (e) => {
		if (disabled) return;
		e.preventDefault();

		const ne = e.nativeEvent ?? e;

		// Platform sniff (guarded so SSR won't explode)
		const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
		const platform = typeof navigator !== 'undefined' ? navigator.platform : '';
		const isMac = /Mac/.test(platform);
		const isFirefox = /Firefox\/\d+/.test(ua);

		let isUp;

		if (isMac && isFirefox) {
			// macOS Firefox (with natural scrolling): "up" reports deltaY > 0
			isUp = (ne.deltaY ?? 0) > 0;
		} else if (typeof ne.wheelDelta === 'number') {
			// WebKit legacy: up is positive
			isUp = ne.wheelDelta > 0;
		} else {
			// W3C default used by most browsers: up is negative
			isUp = (ne.deltaY ?? 0) < 0;
		}

		const finalIsUp = settings?.invertKnobScroll ? !isUp : isUp;
		commit(internal + (finalIsUp ? step : -step));
	};

	const onKeyDown = (e) => {
		if (disabled) return;
		let next = internal;
		if (e.key === 'ArrowUp' || e.key === 'ArrowRight') next = internal + step;
		else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') next = internal - step;
		else if (e.key === 'PageUp') next = internal + step * 4;
		else if (e.key === 'PageDown') next = internal - step * 4;
		else if (e.key === 'Home') next = min;
		else if (e.key === 'End') next = max;
		if (next !== internal) {
			e.preventDefault();
			commit(next);
		}
	};

	// Center value: Tempo/Swing OR small knobs (≤ 40px)
	const isSmallKnob = effSize <= 40;
	const showCenter = isTransport || isSmallKnob;
	const centerText = isTransport
		? label === 'Tempo'
			? `${Math.round(internal)} bpm`
			: `${Math.round(internal)}%`
		: display;
	// Scale center font to size; keep readable but unobtrusive
	const centerFontPx = Math.max(10, Math.min(16, Math.round(effSize / 3.2)));

	return (
		<div
			className={styles.wrap}
			style={{ width: effSize }}
		>
			<div
				className={styles.knob}
				role='slider'
				aria-valuemin={min}
				aria-valuemax={max}
				aria-valuenow={internal}
				aria-valuetext={a11yValueText}
				aria-label={label}
				tabIndex={disabled ? -1 : 0}
				onPointerDown={onPointerDown}
				onPointerMove={onPointerMove}
				onPointerUp={onPointerUp}
				onWheel={onWheel}
				onKeyDown={onKeyDown}
				onDoubleClick={onDoubleClick}
				style={{ width: effSize, height: effSize, position: 'relative' }}
				title={titleAttr}
			>
				<svg
					width={effSize}
					height={effSize}
					viewBox={`0 0 ${effSize} ${effSize}`}
					aria-hidden='true'
				>
					{/* outer rim */}
					<circle
						cx={cx}
						cy={cy}
						r={r}
						className={styles.rim}
					/>

					{/* orange arc in the outer grey ring */}
					<path
						className={styles.arc}
						d={arcPath}
						strokeWidth={arcStroke}
					/>

					{/* face & cap */}
					<circle
						cx={cx}
						cy={cy}
						r={faceR}
						className={styles.face}
					/>
					<circle
						cx={cx}
						cy={cy}
						r={capR}
						className={styles.cap}
					/>

					{/* pointer dot on the arc */}
					{(() => {
						const [px, py] = polarOnArc(angle);
						const pr = Math.max(2, arcStroke / 2);
						return (
							<circle
								cx={px}
								cy={py}
								r={pr}
								className={styles.pointer}
							/>
						);
					})()}
				</svg>

				{/* Center value overlay */}
				{showCenter && (
					<div
						className={styles.centerLabel}
						aria-hidden='true'
						style={{ fontSize: `${centerFontPx}px` }}
					>
						{centerText}
					</div>
				)}
			</div>

			{label ? (
				<div
					className={styles.label}
					style={labelStyle}
				>
					{label}
				</div>
			) : null}

			{/* Hide the below-readout when we're centering the value */}
			{showCenter ? null : <div className={styles.readout}>{display}</div>}
		</div>
	);
}
