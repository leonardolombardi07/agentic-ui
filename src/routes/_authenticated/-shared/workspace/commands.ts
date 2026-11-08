import { useRouter } from "@tanstack/react-router";
import { snackbar } from "@/components/ui/snackbar";
import {
	getActiveTabRef,
	getSideGroup,
	getTabTarget,
	hasRoomFor,
	MAX_TABS_PER_GROUP,
	type TabRef,
	type TabTarget,
} from "./model";
import { workspace } from "./store";

/** Shown whenever an action would open a tab in a full group. */
export function warnTabLimit() {
	snackbar.show(
		`An editor group can have up to ${MAX_TABS_PER_GROUP} tabs. Close one to open another.`,
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

	function syncUrl({ replace }: { replace: boolean }) {
		const ref = getActiveTabRef(workspace.getState());
		if (!ref) {
			return router.navigate({ to: "/sessions", replace });
		}
		const tab = workspace
			.getState()
			.groups.find((g) => g.id === ref.groupId)
			?.tabs.find((t) => t.id === ref.tabId);
		if (!tab) return;
		if (tab.kind === "agent") {
			return router.navigate({
				to: "/agents/$agentId",
				params: { agentId: tab.agentId },
				state: (prev) => ({ ...prev, workspaceTab: ref }),
				replace,
			});
		}
		return router.navigate({
			to: "/sessions/$sessionId",
			params: { sessionId: tab.sessionId },
			state: (prev) => ({ ...prev, workspaceTab: ref }),
			replace,
		});
	}

	return {
		openToSide(target: TabTarget) {
			if (!hasRoomFor(getSideGroup(workspace.getState()), target)) {
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
			const side = ws.groups.find((g) => g.id !== groupId);
			if (tab && !hasRoomFor(side, getTabTarget(tab))) {
				warnTabLimit();
				return;
			}
			workspace.focusGroup(groupId);
			workspace.splitActiveTab();
			void syncUrl({ replace: false });
		},
		/** A new session in `groupId`, from its tab bar. */
		newSession(groupId: string) {
			const group = workspace.getState().groups.find((g) => g.id === groupId);
			if (!hasRoomFor(group)) {
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
