import { z } from "zod";
import { DEFAULT_MODEL } from "@/lib/api/models/mock-data";
import {
	type CreateSessionInput,
	type Session,
	SessionSchema,
	type SessionSettings,
	type UpdateSessionInput,
} from "@/lib/api/types/session";
import { createPersistedStore } from "@/lib/store";

/*
 * Sessions created on the client by "New session" (Routes.md, assumption 4).
 * They become real on the first send (`createSessionFn`), so "New" never leaves
 * empty sessions on the server. Persisted so a draft tab survives a reload; this is
 * also why `/sessions/*` doesn't render on the server (`ssr: false`).
 */
const store = createPersistedStore({
	// v3: model ids moved to OpenRouter's free models; older drafts point at retired ids.
	key: "agentic-ui:session-drafts:v3",
	schema: z.array(SessionSchema),
	initialState: [],
	debounceMs: 0,
});

/** Until the composer remembers the last choice: the default model. */
const DEFAULT_SETTINGS: SessionSettings = {
	modelId: DEFAULT_MODEL.id,
	effort: DEFAULT_MODEL.defaultEffort,
	permissionMode: "ask",
};

export function createDraftSession({
	leadAgentId,
	title,
	settings,
}: {
	leadAgentId?: string;
	title?: string;
	settings?: SessionSettings;
}): string {
	const id = crypto.randomUUID();
	const now = new Date().toISOString();
	const draft: Session = {
		id,
		title: title ?? "New session",
		titleSource: title ? "generated" : "placeholder",
		leadAgentId: leadAgentId ?? null,
		settings: settings ?? DEFAULT_SETTINGS,
		pinned: false,
		archivedAt: null,
		createdAt: now,
		updatedAt: now,
		runStatus: "idle",
		pendingActions: [],
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

/**
 * What the server needs to create the draft on its first send. A placeholder title
 * is replaced by one made from that first message.
 */
export function toCreateSessionInput(
	draft: Session,
	firstMessage: string,
): CreateSessionInput {
	const title =
		draft.titleSource === "placeholder" ? titleFromMessage(firstMessage) : null;
	return {
		id: draft.id,
		title: title ?? draft.title,
		titleSource: title ? "generated" : draft.titleSource,
		leadAgentId: draft.leadAgentId,
		settings: draft.settings,
	};
}

/** First line of the message, shortened: a stand-in until the server names sessions. */
export function titleFromMessage(text: string): string | null {
	const line = text.split("\n")[0].trim();
	if (line.length === 0) return null;
	return line.length > 60 ? `${line.slice(0, 57)}...` : line;
}

/** Same rules as the server's `updateSession`, applied locally. */
export function updateDraftSession(
	sessionId: string,
	patch: UpdateSessionInput["patch"],
): Session | undefined {
	const draft = getDraftSession(sessionId);
	if (!draft) return undefined;
	const next: Session = {
		...draft,
		...(patch.title === undefined
			? {}
			: { title: patch.title, titleSource: "user" }),
		...(patch.leadAgentId === undefined
			? {}
			: { leadAgentId: patch.leadAgentId }),
		...(patch.pinned === undefined ? {} : { pinned: patch.pinned }),
		...(patch.archived === undefined
			? {}
			: { archivedAt: patch.archived ? new Date().toISOString() : null }),
		settings: { ...draft.settings, ...patch.settings },
		updatedAt: new Date().toISOString(),
	};
	store.setState((drafts) =>
		drafts.map((d) => (d.id === sessionId ? next : d)),
	);
	return next;
}

/** Called once the server has the session: from then on it's the source of truth. */
export function removeDraftSession(sessionId: string): void {
	store.setState((drafts) => {
		const next = drafts.filter((d) => d.id !== sessionId);
		return next.length === drafts.length ? drafts : next;
	});
}
