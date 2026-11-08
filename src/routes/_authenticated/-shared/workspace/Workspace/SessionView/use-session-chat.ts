import { fetchServerSentEvents, useChat } from "@tanstack/ai-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { uploadFilesMutationOptions } from "@/lib/api/files/queries";
import {
	createSessionFromDraftMutationOptions,
	sessionQueryOptions,
	sessionsListQueryOptions,
} from "@/lib/api/sessions/queries";
import type { ClientSession } from "@/lib/api/types/session";
import { attachmentsPart } from "./attachments";

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
	const upload = useMutation(uploadFilesMutationOptions());

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

	/**
	 * Sends a turn. Files are uploaded first, tied to the message id chosen here, then
	 * announced to the model in the same message (see attachments.ts).
	 */
	async function send(text: string, files: File[] = []) {
		if (session.isDraft) {
			await createFromDraft.mutateAsync({
				sessionId: session.id,
				// Titles the session; a files-only first message is titled by its files.
				firstMessage: text.trim() || files.map((f) => f.name).join(", "),
			});
		}
		if (files.length === 0) {
			await chat.sendMessage(text);
			return;
		}
		const messageId = crypto.randomUUID();
		const uploaded = await upload.mutateAsync({
			sessionId: session.id,
			messageId,
			files,
		});
		const content = [
			...(text.trim() ? [{ type: "text" as const, content: text }] : []),
			await attachmentsPart(uploaded, files),
		];
		await chat.sendMessage({ id: messageId, content });
	}

	const error = createFromDraft.error ?? upload.error ?? chat.error;

	return {
		messages: chat.messages,
		send,
		stop: chat.stop,
		/** Resends the last message, e.g. after an error. */
		retry: chat.reload,
		isRunning: chat.isLoading || createFromDraft.isPending || upload.isPending,
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
