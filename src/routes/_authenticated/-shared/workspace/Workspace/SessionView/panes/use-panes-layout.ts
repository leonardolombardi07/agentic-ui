import { type RefObject, useLayoutEffect, useState } from "react";

/** Narrowest the chat gets while panes are docked beside it, in px. */
export const CHAT_MIN_WIDTH = 420;

/** Narrowest a column of docked panes gets, in px. */
export const PANE_COLUMN_MIN_WIDTH = 300;

/*
 * Docking needs room for the chat and one column of panes. Two thresholds (hysteresis)
 * so a width right at the limit, or a drag across it, doesn't flip the layout back and
 * forth: dock from `enter` up, undock only below `leave`.
 */
const DOCK_AT = {
	leave: CHAT_MIN_WIDTH + PANE_COLUMN_MIN_WIDTH,
	enter: CHAT_MIN_WIDTH + PANE_COLUMN_MIN_WIDTH + 40,
} as const;

/**
 * - "docked": panes sit beside the chat, as columns.
 * - "sheet": no room beside it, so the panes cover the chat (inside this group only).
 */
export type PanesMode = "docked" | "sheet";

export type PanesLayout = { mode: PanesMode; width: number };

function nextMode(previous: PanesMode | undefined, width: number): PanesMode {
	if (previous === "docked") return width < DOCK_AT.leave ? "sheet" : "docked";
	return width >= DOCK_AT.enter ? "docked" : "sheet";
}

/**
 * Picks the layout from the width of the session's own container, not the window:
 * two groups side by side each decide for themselves, and a maximized group gets the
 * docked layout on its own. Null until measured (before the first layout effect),
 * so nothing renders in the wrong arrangement.
 */
export function usePanesLayout(
	ref: RefObject<HTMLElement | null>,
): PanesLayout | null {
	const [layout, setLayout] = useState<PanesLayout | null>(null);

	useLayoutEffect(() => {
		const el = ref.current;
		if (!el) return;
		function update(width: number) {
			setLayout((prev) => {
				const mode = nextMode(prev?.mode, width);
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

	return layout;
}
