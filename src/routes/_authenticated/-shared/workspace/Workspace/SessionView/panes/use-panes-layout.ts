import {
	type RefObject,
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
} from "react";
import { useIsResizeDragging } from "@/lib/resize-drag";
import { useLayoutSettings } from "../../../settings";

/** Narrowest the chat gets while panes are docked beside it, in px. */
export const CHAT_MIN_WIDTH = 420;

/** Narrowest a column of docked panes gets, in px. */
export const PANE_COLUMN_MIN_WIDTH = 300;

/**
 * - "grid": room for two or more columns of panes beside the chat, stacked in each.
 * - "tabs": room for one column; the open panes are tabs in it, one showing.
 * - "sheet": no room beside the chat, so the front pane covers it (in this group only).
 */
export type PanesMode = "grid" | "tabs" | "sheet";

export type PanesLayout = { mode: PanesMode; width: number };

/*
 * Each level needs the chat plus its columns. Two thresholds per step (hysteresis),
 * so a width right at a limit doesn't flip the layout back and forth: move up from
 * `enter`, back down only below `leave`.
 */
const HYSTERESIS = 40;
const DOCK = CHAT_MIN_WIDTH + PANE_COLUMN_MIN_WIDTH;
const GRID = CHAT_MIN_WIDTH + 2 * PANE_COLUMN_MIN_WIDTH;

function nextMode(previous: PanesMode | undefined, width: number): PanesMode {
	if (previous === "grid" && width >= GRID) return "grid";
	if (previous === "grid" || previous === "tabs") {
		if (width >= GRID + HYSTERESIS) return "grid";
		return width >= DOCK ? "tabs" : "sheet";
	}
	if (width >= GRID + HYSTERESIS) return "grid";
	return width >= DOCK + HYSTERESIS ? "tabs" : "sheet";
}

/**
 * Picks the layout from the width of the session's own container, not the window:
 * two groups side by side each decide for themselves, and a maximized group gets the
 * roomiest layout on its own. Null until measured (before the first layout effect),
 * so nothing renders in the wrong arrangement.
 *
 * While a splitter is dragged the mode holds (the width still updates), and it
 * settles once on release.
 */
export function usePanesLayout(
	ref: RefObject<HTMLElement | null>,
): PanesLayout | null {
	const [layout, setLayout] = useState<PanesLayout | null>(null);
	const isDragging = useIsResizeDragging();
	const isDraggingRef = useRef(isDragging);
	isDraggingRef.current = isDragging;

	useLayoutEffect(() => {
		const el = ref.current;
		if (!el) return;
		function update(width: number) {
			setLayout((prev) => {
				const mode =
					prev && isDraggingRef.current
						? prev.mode
						: nextMode(prev?.mode, width);
				return prev && prev.width === width && prev.mode === mode
					? prev
					: { mode, width };
			});
		}
		// Measure now so the first paint already has the right layout.
		update(el.getBoundingClientRect().width);
		const observer = new ResizeObserver(([entry]) => {
			if (entry) update(entry.contentRect.width);
		});
		observer.observe(el);
		return () => observer.disconnect();
	}, [ref]);

	// Released: settle on the mode for wherever the drag ended.
	useEffect(() => {
		if (isDragging) return;
		setLayout((prev) => {
			if (!prev) return prev;
			const mode = nextMode(prev.mode, prev.width);
			return mode === prev.mode ? prev : { ...prev, mode };
		});
	}, [isDragging]);

	// The "overlay" setting keeps panes over the chat whatever the width.
	const overlayOnly = useLayoutSettings((s) => s.sessionPanes === "overlay");
	if (overlayOnly && layout && layout.mode !== "sheet")
		return { ...layout, mode: "sheet" };
	return layout;
}
