import {
	mutationOptions,
	type QueryClient,
	queryOptions,
} from "@tanstack/react-query";
import { isNotFound, notFound } from "@tanstack/react-router";
import type {
	ClientSession,
	PendingActionResponse,
	Session,
	UpdateSessionInput,
} from "@/lib/api/types/session";
import {
	getDraftSession,
	listDraftSessions,
	removeDraftSession,
	toCreateSessionInput,
	updateDraftSession,
} from "./drafts";
import {
	createSessionFn,
	deleteSessionFn,
	getSessionFn,
	listSessionsFn,
	updateSessionFn,
} from "./functions";

/** Don't retry a 404: it won't fix itself and it delays the "not found" UI. */
function retryUnlessNotFound(failureCount: number, error: unknown) {
	return !isNotFound(error) && failureCount < 3;
}

function fromServer(session: Session): ClientSession {
	return { ...session, isDraft: false };
}

function fromDraft(session: Session): ClientSession {
	return { ...session, isDraft: true };
}

export function sessionsListQueryOptions() {
	return queryOptions({
		queryKey: ["sessions"],
		queryFn: async (): Promise<ClientSession[]> => {
			const sessions = await listSessionsFn();
			return [
				...listDraftSessions().map(fromDraft),
				...sessions.map(fromServer),
			];
		},
	});
}

export function sessionQueryOptions(sessionId: string) {
	return queryOptions({
		queryKey: ["sessions", sessionId],
		queryFn: async (): Promise<ClientSession> => {
			const draft = getDraftSession(sessionId);
			if (draft) return fromDraft(draft);
			const session = await getSessionFn({ data: { sessionId } });
			if (!session) throw notFound();
			return fromServer(session);
		},
		retry: retryUnlessNotFound,
	});
}

/** Writes one session into both caches, so the list and open tabs agree right away. */
function setSessionData(client: QueryClient, session: ClientSession) {
	client.setQueryData(sessionQueryOptions(session.id).queryKey, session);
	void client.invalidateQueries({
		queryKey: sessionsListQueryOptions().queryKey,
		exact: true,
	});
}

/**
 * Sends a draft to the server, on its first send. Idempotent on the server, so a
 * retry after a lost response is harmless.
 */
export function createSessionFromDraftMutationOptions() {
	return mutationOptions({
		mutationKey: ["sessions", "create-from-draft"],
		mutationFn: async ({
			sessionId,
			firstMessage,
		}: {
			sessionId: string;
			firstMessage: string;
		}): Promise<ClientSession> => {
			const draft = getDraftSession(sessionId);
			if (!draft) {
				// Already created (another tab, a retry): the server has it.
				const session = await getSessionFn({ data: { sessionId } });
				if (!session) throw notFound();
				return fromServer(session);
			}
			const session = await createSessionFn({
				data: toCreateSessionInput(draft, firstMessage),
			});
			removeDraftSession(sessionId);
			return fromServer(session);
		},
		onSuccess: (session, _variables, _onMutateResult, { client }) =>
			setSessionData(client, session),
	});
}

/** Renames, switches the lead agent, changes settings, pins or archives. Drafts update locally. */
export function updateSessionMutationOptions() {
	return mutationOptions({
		mutationKey: ["sessions", "update"],
		mutationFn: async ({
			sessionId,
			patch,
		}: UpdateSessionInput): Promise<ClientSession> => {
			const draft = updateDraftSession(sessionId, patch);
			if (draft) return fromDraft(draft);
			const session = await updateSessionFn({ data: { sessionId, patch } });
			if (!session) throw notFound();
			return fromServer(session);
		},
		onSuccess: (session, _variables, _onMutateResult, { client }) =>
			setSessionData(client, session),
	});
}

/** Deletes a session and its transcript. The variable is the session id. */
export function deleteSessionMutationOptions() {
	return mutationOptions({
		mutationKey: ["sessions", "delete"],
		mutationFn: async (sessionId: string): Promise<void> => {
			if (getDraftSession(sessionId)) {
				removeDraftSession(sessionId);
				return;
			}
			await deleteSessionFn({ data: { sessionId } });
		},
		onSuccess: (_data, sessionId, _onMutateResult, { client }) => {
			client.removeQueries({
				queryKey: sessionQueryOptions(sessionId).queryKey,
			});
			void client.invalidateQueries({
				queryKey: sessionsListQueryOptions().queryKey,
				exact: true,
			});
		},
	});
}

/**
 * Approves, refuses or answers a session's pending action. Every response resumes the
 * run: a refusal is reported back to the agent, which decides what to do instead.
 *
 * Not wired yet: in TanStack AI an answer is a `resume` batch sent with the next chat
 * request, so this lands with the chat UI. Until agents have tools, nothing pauses.
 */
export function respondToPendingActionMutationOptions() {
	return mutationOptions({
		mutationKey: ["sessions", "respond-to-pending-action"],
		mutationFn: async (_variables: {
			sessionId: string;
			actionId: string;
			response: PendingActionResponse;
		}): Promise<void> => {
			throw new Error("Responding to pending actions isn't available yet.");
		},
		// Prefix match: refreshes the list and this session's own query.
		onSettled: (_data, _error, _variables, _onMutateResult, { client }) =>
			client.invalidateQueries({ queryKey: ["sessions"] }),
	});
}
