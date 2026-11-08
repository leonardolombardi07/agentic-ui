import { createPersistedStore } from "@/lib/store";
import * as M from "./model";
import { layoutSettings } from "./settings";

const store = createPersistedStore({
	key: "agentic-ui:workspace:v1",
	schema: M.WorkspaceSchema,
	initialState: M.emptyWorkspace(),
});

/** The user's layout settings, as the model's limits. Read fresh on every op. */
function limits(): M.Limits {
	return layoutSettings.getState();
}

/*
 * Lowering a limit closes what no longer fits (see `fitToLimits`), on load too: the
 * saved workspace may predate the settings, or another tab may have changed them.
 */
if (typeof window !== "undefined") {
	store.setState((ws) => M.fitToLimits(ws, limits()));
	layoutSettings.subscribe(() =>
		store.setState((ws) => M.fitToLimits(ws, limits())),
	);
}

/** Read the workspace in React. The selector must return a stable value. */
export function useWorkspace<S>(selector: (ws: M.Workspace) => S): S {
	return store.useStore(selector);
}

/**
 * Raw store ops. They never navigate: user actions go through `useWorkspaceCommands`,
 * which also updates the URL. Only routes call these directly (to follow the URL).
 */
export const workspace = {
	getState: store.getState,
	limits,
	reveal(target: M.TabTarget, hint?: M.TabRef) {
		store.setState((ws) => M.reveal(ws, target, hint, undefined, limits()));
	},
	open(target: M.TabTarget, init?: { draft?: string }) {
		store.setState((ws) =>
			M.reveal(ws, target, undefined, { composerDraft: init?.draft }, limits()),
		);
	},
	openToSide(target: M.TabTarget, init?: { draft?: string }) {
		store.setState((ws) =>
			M.openToSide(ws, target, { composerDraft: init?.draft }, limits()),
		);
	},
	splitActiveTab() {
		store.setState((ws) => M.splitActiveTab(ws, limits()));
	},
	closeTab(ref: M.TabRef) {
		store.setState((ws) => M.closeTab(ws, ref));
	},
	focusTab(ref: M.TabRef) {
		store.setState((ws) => M.focusTab(ws, ref));
	},
	focusGroup(groupId: string) {
		store.setState((ws) => M.focusGroup(ws, groupId));
	},
	toggleMaximized(groupId: string) {
		store.setState((ws) => M.toggleMaximized(ws, groupId));
	},
	resizeGroups(boundary: number, size: number) {
		store.setState((ws) => M.resizeGroups(ws, boundary, size));
	},
	resetGroupSize(boundary: number) {
		store.setState((ws) => M.resetGroupSize(ws, boundary));
	},
	updateTab(ref: M.TabRef, patch: M.TabPatch) {
		store.setState((ws) => M.updateTab(ws, ref, patch));
	},
	/* Panes are view state: they never touch the URL, so callers use these directly. */
	openPane(ref: M.TabRef, id: M.PaneId) {
		store.setState((ws) => M.openPane(ws, ref, id));
	},
	closePane(ref: M.TabRef, id: M.PaneId) {
		store.setState((ws) => M.closePane(ws, ref, id));
	},
	setPanesOpen(ref: M.TabRef, open: boolean, fallback: M.PaneId) {
		store.setState((ws) => M.setPanesOpen(ws, ref, open, fallback));
	},
	touchPane(ref: M.TabRef, id: M.PaneId) {
		store.setState((ws) => M.touchPane(ws, ref, id));
	},
	selectFile(ref: M.TabRef, fileId: string | null) {
		store.setState((ws) => M.selectFile(ws, ref, fileId));
	},
	setPanesSize(ref: M.TabRef, size: number) {
		store.setState((ws) => M.setPanesSize(ws, ref, size));
	},
};
