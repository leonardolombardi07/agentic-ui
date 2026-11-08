import { createPersistedStore } from "@/lib/store";
import * as M from "./model";

const store = createPersistedStore({
	key: "agentic-ui:workspace:v1",
	schema: M.WorkspaceSchema,
	initialState: M.emptyWorkspace(),
});

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
	reveal(target: M.TabTarget, hint?: M.TabRef) {
		store.setState((ws) => M.reveal(ws, target, hint));
	},
	open(target: M.TabTarget, init?: { draft?: string }) {
		store.setState((ws) =>
			M.reveal(ws, target, undefined, { composerDraft: init?.draft }),
		);
	},
	openToSide(target: M.TabTarget, init?: { draft?: string }) {
		store.setState((ws) =>
			M.openToSide(ws, target, { composerDraft: init?.draft }),
		);
	},
	splitActiveTab() {
		store.setState(M.splitActiveTab);
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
	setSplitRatio(ratio: number) {
		store.setState((ws) => M.setSplitRatio(ws, ratio));
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
	setPanesSize(ref: M.TabRef, size: number) {
		store.setState((ws) => M.setPanesSize(ws, ref, size));
	},
};
