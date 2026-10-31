import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { createDraftSession } from "@/lib/api/sessions/drafts";
import { sessionsListQueryOptions } from "@/lib/api/sessions/queries";
import type { ComposerMessage } from "./composer";

/** Starts a session from a composer message and opens it: used by Home and agent pages. */
export function useStartSession() {
	const navigate = useNavigate();
	const queryClient = useQueryClient();

	return function startSession(message: ComposerMessage) {
		// TODO: send `message` as the first turn once the API exists; for now it only names the session.
		const sessionId = createDraftSession({
			agentId: message.agentId ?? undefined,
			title: toTitle(message.text),
		});
		void queryClient.invalidateQueries({
			queryKey: sessionsListQueryOptions().queryKey,
			exact: true,
		});
		void navigate({ to: "/sessions/$sessionId", params: { sessionId } });
	};
}

/** First line of the message, shortened: a stand-in until the server names sessions. */
function toTitle(text: string): string | undefined {
	const line = text.split("\n")[0].trim();
	if (line.length === 0) return undefined;
	return line.length > 60 ? `${line.slice(0, 57)}...` : line;
}
