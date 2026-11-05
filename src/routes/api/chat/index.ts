import {
	chatParamsFromRequest,
	toServerSentEventsResponse,
} from "@tanstack/ai";
import { reconstructChat } from "@tanstack/ai-persistence";
import { createFileRoute } from "@tanstack/react-router";
import { getCurrentUserId } from "@/lib/api/auth.server";
import { RunPlanError, startRun } from "@/lib/api/chat/run.server";
import { MissingEnvError } from "@/lib/api/env.server";
import { persistence } from "@/lib/api/persistence.server";
import {
	getOwnedRecord,
	touchSession,
} from "@/lib/api/sessions/service.server";

/*
 * The chat endpoint `useChat` talks to. The session id is the TanStack AI `threadId`.
 * The session must exist first (`createSessionFn` on the first send), so every turn
 * belongs to a session the caller owns.
 */
export const Route = createFileRoute("/api/chat/")({
	server: {
		handlers: {
			/** Runs one turn and streams it as server-sent events. */
			POST: async ({ request }) => {
				let params: Awaited<ReturnType<typeof chatParamsFromRequest>>;
				try {
					params = await chatParamsFromRequest(request);
				} catch (error) {
					// It throws a ready 400 Response for a malformed body.
					if (error instanceof Response) return error;
					throw error;
				}

				const session = await getOwnedRecord(
					getCurrentUserId(),
					params.threadId,
				);
				if (!session) return new Response("Session not found", { status: 404 });

				const abortController = new AbortController();
				request.signal.addEventListener("abort", () => abortController.abort());

				try {
					const stream = await startRun({ session, params, abortController });
					await touchSession(session);
					return toServerSentEventsResponse(stream, { abortController });
				} catch (error) {
					if (error instanceof RunPlanError) {
						return new Response(error.message, { status: 422 });
					}
					if (error instanceof MissingEnvError) {
						console.error(`[api/chat] ${error.message}`);
						return new Response(error.message, { status: 503 });
					}
					throw error;
				}
			},
			/** The stored transcript, active run and pending interrupts, for `useChat` to load. */
			GET: ({ request }) =>
				reconstructChat(persistence, request, {
					authorize: async (threadId) =>
						Boolean(await getOwnedRecord(getCurrentUserId(), threadId)),
				}),
		},
	},
});
