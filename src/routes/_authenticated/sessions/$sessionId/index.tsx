import { createFileRoute, useLocation } from "@tanstack/react-router";
import { useLayoutEffect } from "react";
import { z } from "zod";
import { sessionQueryOptions } from "@/lib/api/sessions/queries";
import { workspace } from "../../-shared/workspace/store";

export const Route = createFileRoute("/_authenticated/sessions/$sessionId/")({
	validateSearch: z.object({
		/** One-shot deep link to a message (e.g. a pending approval). TODO: scroll to it, then replace it away. */
		messageId: z.string().optional(),
	}),
	// Validates the session (404 -> notFound(), no tab is created) and warms the cache.
	loader: ({ context: { queryClient }, params }) =>
		queryClient.ensureQueryData(sessionQueryOptions(params.sessionId)),
	component: RevealSession,
});

/**
 * URL -> store. Runs in the component, not the loader: loaders also run on hover
 * (defaultPreload: "intent") and on the server, which would open tabs on mouse-over.
 */
function RevealSession() {
	const { sessionId } = Route.useParams();
	/*
	 * During a navigation the location (and its history state) updates before this
	 * match's params do. Reading them together would pair the NEW tab hint with the OLD
	 * session and reopen a tab that was just closed. So only reveal once both agree.
	 */
	const isSettled = useLocation({
		select: (l) => l.pathname === `/sessions/${encodeURIComponent(sessionId)}`,
	});
	const hintGroupId = useLocation({
		select: (l) => l.state.workspaceTab?.groupId,
	});
	const hintTabId = useLocation({ select: (l) => l.state.workspaceTab?.tabId });

	useLayoutEffect(() => {
		if (!isSettled) return;
		const hint =
			hintGroupId && hintTabId
				? { groupId: hintGroupId, tabId: hintTabId }
				: undefined;
		workspace.reveal({ kind: "session", sessionId }, hint); // idempotent: the loop breaker
	}, [isSettled, sessionId, hintGroupId, hintTabId]);

	return null;
}
