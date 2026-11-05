import { fetchServerSentEvents, useChat } from "@tanstack/ai-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import {
	createSessionFromDraftMutationOptions,
	sessionQueryOptions,
	sessionsListQueryOptions,
} from "@/lib/api/sessions/queries";
import type { ClientSession } from "@/lib/api/types/session";

/** The chat endpoint (`routes/api/chat`). The session id is the `threadId`. */
const CHAT_URL = "/api/chat";

/**
 * One session's chat: the transcript, sending and stopping. The server owns the
 * history, so nothing is cached in the browser.
 *
 * A draft only exists on this device, so its first send creates it on the server.
 */
export function useSessionChat(session: ClientSession) {
	const queryClient = useQueryClient();
	const createFromDraft = useMutation(createSessionFromDraftMutationOptions());

	/*
	 * The server's reason for refusing a request (a missing API key, an agent that
	 * no longer exists). The chat client only reports "Stream response body read
	 * failed", so the connection keeps the reason here.
	 */
	const [serverError, setServerError] = useState<string | null>(null);
	const connection = useMemo(
		() =>
			fetchServerSentEvents(CHAT_URL, {
				async fetchClient(...args: Parameters<typeof fetch>) {
					setServerError(null);
					const response = await fetch(...args);
					if (response.ok) return response;
					const body = (await response.text().catch(() => "")).trim();
					const reason =
						readErrorMessage(body) || `Request failed (${response.status}).`;
					setServerError(reason);
					throw new Error(reason);
				},
			}),
		[],
	);

	const chat = useChat({
		threadId: session.id,
		connection,
		/*
		 * Read once per thread. A draft has nothing to load (the server would refuse
		 * it), and after its first send this tab already holds the messages; the
		 * next mount loads them from the server.
		 */
		persistence: !session.isDraft,
	});

	/* The run status (tab spinner, side panel) lives on the session: refresh it as the run starts and ends. */
	const { status } = chat;
	useEffect(() => {
		if (status === "submitted") return;
		void queryClient.invalidateQueries({
			queryKey: sessionQueryOptions(session.id).queryKey,
			exact: true,
		});
		void queryClient.invalidateQueries({
			queryKey: sessionsListQueryOptions().queryKey,
			exact: true,
		});
	}, [status, queryClient, session.id]);

	async function send(text: string) {
		if (session.isDraft) {
			await createFromDraft.mutateAsync({
				sessionId: session.id,
				firstMessage: text,
			});
		}
		await chat.sendMessage(text);
	}

	const error = createFromDraft.error ?? chat.error;

	return {
		messages: chat.messages,
		send,
		stop: chat.stop,
		/** Resends the last message, e.g. after an error. */
		retry: chat.reload,
		isRunning: chat.isLoading || createFromDraft.isPending,
		isHydrating: chat.isHydrating,
		/** Why the last send failed, in words: the server's reason when there is one. */
		errorMessage: error
			? (serverError ?? (error.message || "Something went wrong."))
			: null,
	};
}

/** Our routes answer with plain text; TanStack's helpers with `{ "error": "..." }`. */
function readErrorMessage(body: string): string {
	try {
		const parsed: unknown = JSON.parse(body);
		if (
			typeof parsed === "object" &&
			parsed !== null &&
			"error" in parsed &&
			typeof parsed.error === "string"
		) {
			return parsed.error;
		}
	} catch {
		// Not JSON: plain text.
	}
	return body;
}
