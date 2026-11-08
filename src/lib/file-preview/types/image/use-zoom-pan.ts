import * as React from "react";

export const MIN_SCALE = 0.05;
export const MAX_SCALE = 32;
const STEP = 1.25;

type Size = { width: number; height: number };
type Point = { x: number; y: number };

/**
 * View state for a zoomable, pannable, rotatable image.
 *
 * `fit` means "follow the container": the scale is derived from the current sizes on every
 * render, so resizing the panel keeps the image fitted. Any manual zoom or pan leaves fit mode.
 * Offsets are from the container centre, in screen pixels.
 */
type View = {
	fit: boolean;
	scale: number;
	x: number;
	y: number;
	rotation: number;
};

type Action =
	| { type: "zoom"; factor: number; at?: Point; current: number }
	| { type: "set-scale"; scale: number }
	| { type: "fit" }
	| { type: "pan"; dx: number; dy: number; current: number }
	| { type: "rotate" };

const clamp = (s: number) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, s));

function reducer(v: View, a: Action): View {
	switch (a.type) {
		case "zoom": {
			const scale = clamp(a.current * a.factor);
			const k = scale / a.current;
			const at = a.at ?? { x: 0, y: 0 };
			// Keep the point under the cursor where it is.
			const x = v.fit ? 0 : v.x;
			const y = v.fit ? 0 : v.y;
			return {
				...v,
				fit: false,
				scale,
				x: at.x - (at.x - x) * k,
				y: at.y - (at.y - y) * k,
			};
		}
		case "set-scale":
			return { ...v, fit: false, scale: clamp(a.scale), x: 0, y: 0 };
		case "fit":
			return { ...v, fit: true, x: 0, y: 0 };
		case "pan":
			return {
				...v,
				fit: false,
				scale: a.current,
				x: (v.fit ? 0 : v.x) + a.dx,
				y: (v.fit ? 0 : v.y) + a.dy,
			};
		case "rotate":
			return { ...v, rotation: (v.rotation + 90) % 360 };
	}
}

export function useZoomPan(
	viewport: React.RefObject<HTMLElement | null>,
	natural: Size,
) {
	const [view, dispatch] = React.useReducer(reducer, {
		fit: true,
		scale: 1,
		x: 0,
		y: 0,
		rotation: 0,
	});
	const box = useElementSize(viewport);

	const sideways = view.rotation % 180 !== 0;
	const w = sideways ? natural.height : natural.width;
	const h = sideways ? natural.width : natural.height;
	const PADDING = 32;
	// Fit shrinks large images but never blows small ones up past 100%.
	const fitScale =
		box.width && w
			? Math.min(1, (box.width - PADDING) / w, (box.height - PADDING) / h)
			: 1;
	const scale = view.fit ? fitScale : view.scale;

	const toCentre = React.useCallback(
		(clientX: number, clientY: number): Point => {
			const r = viewport.current?.getBoundingClientRect();
			if (!r) return { x: 0, y: 0 };
			return {
				x: clientX - r.left - r.width / 2,
				y: clientY - r.top - r.height / 2,
			};
		},
		[viewport],
	);

	// Wheel and trackpad pinch (ctrl+wheel) zoom at the cursor. Needs a non-passive listener to stop the page scrolling.
	const scaleRef = React.useRef(scale);
	scaleRef.current = scale;
	React.useEffect(() => {
		const el = viewport.current;
		if (!el) return;
		const onWheel = (e: WheelEvent) => {
			e.preventDefault();
			const delta = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
			dispatch({
				type: "zoom",
				factor: Math.exp(-delta * (e.ctrlKey ? 0.01 : 0.002)),
				at: toCentre(e.clientX, e.clientY),
				current: scaleRef.current,
			});
		};
		el.addEventListener("wheel", onWheel, { passive: false });
		return () => el.removeEventListener("wheel", onWheel);
	}, [viewport, toCentre]);

	const drag = React.useRef<{ x: number; y: number } | null>(null);
	const pointerHandlers = {
		onPointerDown: (e: React.PointerEvent) => {
			if (e.button !== 0) return;
			e.currentTarget.setPointerCapture(e.pointerId);
			drag.current = { x: e.clientX, y: e.clientY };
		},
		onPointerMove: (e: React.PointerEvent) => {
			if (!drag.current) return;
			const dx = e.clientX - drag.current.x;
			const dy = e.clientY - drag.current.y;
			drag.current = { x: e.clientX, y: e.clientY };
			dispatch({ type: "pan", dx, dy, current: scale });
		},
		onPointerUp: () => (drag.current = null),
		onPointerCancel: () => (drag.current = null),
		onDoubleClick: (e: React.MouseEvent) => {
			// Toggle between fit and 100% at the clicked point.
			if (!view.fit && Math.abs(view.scale - 1) < 0.01)
				dispatch({ type: "fit" });
			else
				dispatch({
					type: "zoom",
					factor: 1 / scale,
					at: toCentre(e.clientX, e.clientY),
					current: scale,
				});
		},
	};

	const actions = {
		zoomIn: () => dispatch({ type: "zoom", factor: STEP, current: scale }),
		zoomOut: () => dispatch({ type: "zoom", factor: 1 / STEP, current: scale }),
		actualSize: () => dispatch({ type: "set-scale", scale: 1 }),
		fit: () => dispatch({ type: "fit" }),
		rotate: () => dispatch({ type: "rotate" }),
		pan: (dx: number, dy: number) =>
			dispatch({ type: "pan", dx, dy, current: scale }),
	};

	const onKeyDown = (e: React.KeyboardEvent) => {
		const keys: Record<string, () => void> = {
			"+": actions.zoomIn,
			"=": actions.zoomIn,
			"-": actions.zoomOut,
			"0": actions.fit,
			"1": actions.actualSize,
			r: actions.rotate,
			ArrowLeft: () => actions.pan(60, 0),
			ArrowRight: () => actions.pan(-60, 0),
			ArrowUp: () => actions.pan(0, 60),
			ArrowDown: () => actions.pan(0, -60),
		};
		const run = !e.metaKey && !e.ctrlKey && !e.altKey && keys[e.key];
		if (run) {
			e.preventDefault();
			run();
		}
	};

	return {
		scale,
		fit: view.fit,
		transform: `translate(calc(-50% + ${view.fit ? 0 : view.x}px), calc(-50% + ${view.fit ? 0 : view.y}px)) rotate(${view.rotation}deg) scale(${scale})`,
		actions,
		viewportProps: { ...pointerHandlers, onKeyDown },
	};
}

function useElementSize(ref: React.RefObject<HTMLElement | null>): Size {
	const [size, setSize] = React.useState<Size>({ width: 0, height: 0 });
	React.useLayoutEffect(() => {
		const el = ref.current;
		if (!el) return;
		const ro = new ResizeObserver(([entry]) =>
			setSize({
				width: entry.contentRect.width,
				height: entry.contentRect.height,
			}),
		);
		ro.observe(el);
		return () => ro.disconnect();
	}, [ref]);
	return size;
}
