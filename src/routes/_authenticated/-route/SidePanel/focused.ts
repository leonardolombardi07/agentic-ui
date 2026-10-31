import { getActiveTab } from "../../-shared/workspace/model";
import { useWorkspace } from "../../-shared/workspace/store";

/** The session in the focused tab, or null when that tab is an agent page (or there is none). */
export function useFocusedSessionId(): string | null {
	return useWorkspace((ws) => {
		const tab = getActiveTab(ws);
		return tab?.kind === "session" ? tab.sessionId : null;
	});
}
