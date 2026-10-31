import { useRouter } from "@tanstack/react-router";
import { getActiveTabRef, type TabRef, type TabTarget } from "./model";
import { workspace } from "./store";

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
			workspace.openToSide(target);
			void syncUrl({ replace: false });
		},
		splitGroup(groupId: string) {
			workspace.focusGroup(groupId);
			workspace.splitActiveTab();
			void syncUrl({ replace: false });
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
