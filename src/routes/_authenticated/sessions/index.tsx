import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useLayoutEffect } from "react";
import { getActiveTab } from "../-shared/workspace/model";
import { useWorkspace } from "../-shared/workspace/store";

export const Route = createFileRoute("/_authenticated/sessions/")({
	staticData: { main: "workspace" },
	component: SessionsIndex,
});

/** Keeps "URL = focused tab": redirect to the active tab (a session, an agent or a file), else show the workspace's empty state. */
function SessionsIndex() {
	const navigate = useNavigate();
	// Primitives, so the selectors stay stable.
	const activeSessionId = useWorkspace((ws) => {
		const tab = getActiveTab(ws);
		return tab?.kind === "session" ? tab.sessionId : null;
	});
	const activeAgentId = useWorkspace((ws) => {
		const tab = getActiveTab(ws);
		return tab?.kind === "agent" ? tab.agentId : null;
	});
	const activeFileId = useWorkspace((ws) => {
		const tab = getActiveTab(ws);
		return tab?.kind === "file" ? tab.fileId : null;
	});

	useLayoutEffect(() => {
		if (activeSessionId) {
			void navigate({
				to: "/sessions/$sessionId",
				params: { sessionId: activeSessionId },
				replace: true,
			});
		} else if (activeAgentId) {
			void navigate({
				to: "/agents/$agentId",
				params: { agentId: activeAgentId },
				replace: true,
			});
		} else if (activeFileId) {
			void navigate({
				to: "/files/$fileId",
				params: { fileId: activeFileId },
				replace: true,
			});
		}
	}, [activeSessionId, activeAgentId, activeFileId, navigate]);

	return null;
}
