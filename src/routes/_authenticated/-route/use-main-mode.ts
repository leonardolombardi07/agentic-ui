import { useMatches } from "@tanstack/react-router";
import { useWorkspace } from "../-shared/workspace/store";

/** What the main area shows: the workspace (session and agent tabs) or a page. */
export function useMainMode(): "workspace" | "page" {
	return useMatches({
		select: (matches) => {
			if (matches.some((m) => m.status === "notFound" || m.status === "error"))
				return "page";
			return matches.some((m) => m.staticData.main === "workspace")
				? "workspace"
				: "page";
		},
	});
}

/**
 * Focus mode is on screen: a group is maximized and the workspace is showing. Pages
 * (Home, Admin) keep the side panel, since focus mode is about the workspace.
 */
export function useIsFocusMode(): boolean {
	const isMaximized = useWorkspace((ws) => ws.maximizedGroupId !== null);
	return useMainMode() === "workspace" && isMaximized;
}
