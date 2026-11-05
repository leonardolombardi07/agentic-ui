import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import {
	createDraftSession,
	titleFromMessage,
} from "@/lib/api/sessions/drafts";
import { sessionsListQueryOptions } from "@/lib/api/sessions/queries";
import type { ComposerMessage } from "./composer";
import { queueFirstMessage } from "./first-message";

/** Starts a session from a composer message and opens it: used by Home and agent pages. */
export function useStartSession() {
	const navigate = useNavigate();
	const queryClient = useQueryClient();

	return function startSession(message: ComposerMessage) {
		const sessionId = createDraftSession({
			leadAgentId: message.agentId ?? undefined,
			title: titleFromMessage(message.text) ?? undefined,
			settings: message.settings,
		});
		// The session's view sends it: it owns the chat stream.
		queueFirstMessage(sessionId, message.text);
		void queryClient.invalidateQueries({
			queryKey: sessionsListQueryOptions().queryKey,
			exact: true,
		});
		void navigate({ to: "/sessions/$sessionId", params: { sessionId } });
	};
}
