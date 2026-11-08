import { z } from "zod";
import { createPersistedStore } from "@/lib/store";

export const SIDEBAR_WIDTH = { min: 200, max: 560, default: 288 } as const;

const SidebarSchema = z.object({
	view: z.enum(["sessions", "agents"]),
	open: z.boolean(),
	/** px. Defaulted so state saved before resizing existed still loads. */
	width: z.number().default(SIDEBAR_WIDTH.default),
});

function clampWidth(width: number) {
	return Math.min(
		SIDEBAR_WIDTH.max,
		Math.max(SIDEBAR_WIDTH.min, Math.round(width)),
	);
}

export type SidebarView = z.infer<typeof SidebarSchema>["view"];

/*
 * The side panel's view is client state, not the route (Routes.md, section 0):
 * switching activity must never replace the conversation you're reading.
 */
const store = createPersistedStore({
	key: "agentic-ui:sidebar:v1",
	schema: SidebarSchema,
	initialState: { view: "sessions", open: true, width: SIDEBAR_WIDTH.default },
});

export function useSidebar<S>(
	selector: (state: z.infer<typeof SidebarSchema>) => S,
): S {
	return store.useStore(selector);
}

export const sidebar = {
	/** Open `view`, or collapse the panel if it's already the visible view (VSCode behaviour). */
	toggleView(view: SidebarView) {
		store.setState((s) =>
			s.open && s.view === view
				? { ...s, open: false }
				: { ...s, view, open: true },
		);
	},
	/** Open `view`, whatever is showing now. */
	showView(view: SidebarView) {
		store.setState((s) =>
			s.open && s.view === view ? s : { ...s, view, open: true },
		);
	},
	getWidth() {
		return store.getState().width;
	},
	setWidth(width: number) {
		const next = clampWidth(width);
		store.setState((s) => (s.width === next ? s : { ...s, width: next }));
	},
	close() {
		store.setState((s) => (s.open ? { ...s, open: false } : s));
	},
};
