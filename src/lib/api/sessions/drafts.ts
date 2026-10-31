import { z } from "zod";
import { type Session, SessionSchema } from "@/lib/api/types/session";
import { createPersistedStore } from "@/lib/store";

/*
 * Sessions created on the client by "New session" (Routes.md, assumption 4).
 * They become real on the first send (`PUT /sessions/:id`), so "New" never leaves
 * empty sessions on the server. Persisted so a draft tab survives a reload; this is
 * also why `/sessions/*` doesn't render on the server (`ssr: false`).
 */
const store = createPersistedStore({
	key: "agentic-ui:session-drafts:v1",
	schema: z.array(SessionSchema),
	initialState: [],
	debounceMs: 0,
});

export function createDraftSession({
	agentId,
	title,
}: {
	agentId?: string;
	title?: string;
}): string {
	const id = crypto.randomUUID();
	const draft: Session = {
		id,
		title: title ?? "New session",
		agentId: agentId ?? null,
		runStatus: "idle",
		pendingAction: null,
		updatedAt: new Date().toISOString(),
		isDraft: true,
	};
	store.setState((drafts) => [draft, ...drafts]);
	return id;
}

export function getDraftSession(sessionId: string): Session | undefined {
	return store.getState().find((d) => d.id === sessionId);
}

export function listDraftSessions(): Session[] {
	return store.getState();
}
