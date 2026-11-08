import { useRouter } from "@tanstack/react-router";
import { snackbar } from "@/components/ui/snackbar";
import {
	getActiveGroup,
	getActiveTabRef,
	getSideGroup,
	getTabTarget,
	hasRoomFor,
	type TabRef,
	type TabTarget,
} from "./model";
import { type LayoutSettings, layoutSettings } from "./settings";
import { workspace } from "./store";

/** Shown whenever an action would open a tab in a full group (with "warn" set). */
export function warnTabLimit() {
	const max = workspace.limits().maxTabsPerGroup;
	snackbar.show(
		`An editor group can have up to ${max} ${max === 1 ? "tab" : "tabs"}. Close one to open another, or change this in Settings.`,
	);
}

/**
 * The only place user actions change focus: apply the store op, then point the URL at
 * the resulting focused tab. The `$sessionId` route's `reveal()` then finds it already
 * focused and does nothing, so there is no loop.
 *
 * Explicit opens and tab clicks push (Back walks focus history); derived changes replace.
 */
export function useWorkspaceCommands() {
	const router = useRouter();

	function isWorkspaceRoute() {
		return router.state.matches.some((m) => m.staticData.main === "workspace");
	}

	/**
	 * `keepSearch` keeps the current search params, e.g. the open Settings modal when a
	 * layout change moves focus underneath it.
	 */
	function syncUrl({
		replace,
		keepSearch = false,
	}: {
		replace: boolean;
		keepSearch?: boolean;
	}) {
		const ref = getActiveTabRef(workspace.getState());
		// Modal params are valid on every authenticated route.
		const search = keepSearch ? (prev: object) => prev : undefined;
		if (!ref) {
			return router.navigate({ to: "/sessions", search, replace });
		}
		const tab = workspace
			.getState()
			.groups.find((g) => g.id === ref.groupId)
			?.tabs.find((t) => t.id === ref.tabId);
		if (!tab) return;
		if (tab.kind === "file") {
			return router.navigate({
				to: "/files/$fileId",
				params: { fileId: tab.fileId },
				search,
				state: (prev) => ({ ...prev, workspaceTab: ref }),
				replace,
			});
		}
		if (tab.kind === "agent") {
			return router.navigate({
				to: "/agents/$agentId",
				params: { agentId: tab.agentId },
				search,
				state: (prev) => ({ ...prev, workspaceTab: ref }),
				replace,
			});
		}
		return router.navigate({
			to: "/sessions/$sessionId",
			params: { sessionId: tab.sessionId },
			search,
			state: (prev) => ({ ...prev, workspaceTab: ref }),
			replace,
		});
	}

	return {
		/** Opens `target` as a tab in the active group (or focuses its tab there). */
		open(target: TabTarget) {
			const ws = workspace.getState();
			if (!hasRoomFor(getActiveGroup(ws), target, workspace.limits())) {
				warnTabLimit();
				return;
			}
			workspace.open(target);
			void syncUrl({ replace: false });
		},
		openToSide(target: TabTarget) {
			const ws = workspace.getState();
			const limits = workspace.limits();
			if (!hasRoomFor(getSideGroup(ws, limits), target, limits)) {
				warnTabLimit();
				return;
			}
			workspace.openToSide(target);
			void syncUrl({ replace: false });
		},
		splitGroup(groupId: string) {
			const ws = workspace.getState();
			const group = ws.groups.find((g) => g.id === groupId);
			const tab = group?.tabs.find((t) => t.id === group.activeTabId);
			const limits = workspace.limits();
			if (!tab || limits.maxGroups <= 1) return;
			workspace.focusGroup(groupId);
			const side = getSideGroup(workspace.getState(), limits);
			if (!hasRoomFor(side, getTabTarget(tab), limits)) {
				warnTabLimit();
				return;
			}
			workspace.splitActiveTab();
			void syncUrl({ replace: false });
		},
		/** A new session in `groupId`, from its tab bar. */
		newSession(groupId: string) {
			const group = workspace.getState().groups.find((g) => g.id === groupId);
			if (!hasRoomFor(group, undefined, workspace.limits())) {
				warnTabLimit();
				return;
			}
			// `/sessions/new` opens the draft in the active group, so make it this one.
			workspace.focusGroup(groupId);
			void router.navigate({ to: "/sessions/new" });
		},
		focusTab(ref: TabRef) {
			const before = getActiveTabRef(workspace.getState());
			workspace.focusTab(ref);
			const after = getActiveTabRef(workspace.getState());
			if (before?.tabId === after?.tabId && isWorkspaceRoute()) return;
			void syncUrl({ replace: false });
		},
		focusGroup(groupId: string) {
			if (workspace.getState().activeGroupId === groupId) return;
			workspace.focusGroup(groupId);
			void syncUrl({ replace: true });
		},
		/** Focus mode on or off. Entering it on another group moves focus there, so the URL follows. */
		toggleMaximized(groupId: string) {
			const before = workspace.getState().activeGroupId;
			workspace.toggleMaximized(groupId);
			if (workspace.getState().activeGroupId !== before)
				void syncUrl({ replace: true });
		},
		/**
		 * Changes the layout settings. Lowering a limit can close tabs (see `fitToLimits`),
		 * so if that moved focus, the URL follows without closing the Settings modal.
		 */
		setLayoutSettings(patch: Partial<LayoutSettings>) {
			const before = getActiveTabRef(workspace.getState())?.tabId;
			layoutSettings.set(patch);
			const after = getActiveTabRef(workspace.getState())?.tabId;
			if (isWorkspaceRoute() && after !== before)
				void syncUrl({ replace: true, keepSearch: true });
		},
		closeTab(ref: TabRef) {
			const before = getActiveTabRef(workspace.getState())?.tabId;
			workspace.closeTab(ref);
			// Only fix the URL if focus moved and the workspace is what's on screen.
			const after = getActiveTabRef(workspace.getState())?.tabId;
			if (isWorkspaceRoute() && after !== before)
				void syncUrl({ replace: true });
		},
	};
}
