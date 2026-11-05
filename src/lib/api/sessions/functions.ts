import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getCurrentUserId } from "@/lib/api/auth.server";
import {
	CreateSessionInputSchema,
	SessionIdSchema,
	UpdateSessionInputSchema,
} from "@/lib/api/types/session";
import {
	createSession,
	deleteSession,
	getSession,
	listSessions,
	updateSession,
} from "./service.server";

/*
 * The sessions API. Server functions rather than `fetch("/api/...")`: they also run
 * during SSR (a relative fetch can't), and the types flow end to end. Only the query
 * options in `queries.ts` call these, so moving to another backend changes one file.
 */

export const listSessionsFn = createServerFn({ method: "GET" }).handler(() =>
	listSessions(getCurrentUserId()),
);

/** `null` when the session doesn't exist or isn't the caller's. */
export const getSessionFn = createServerFn({ method: "GET" })
	.validator(z.object({ sessionId: SessionIdSchema }))
	.handler(({ data }) => getSession(getCurrentUserId(), data.sessionId));

export const createSessionFn = createServerFn({ method: "POST" })
	.validator(CreateSessionInputSchema)
	.handler(({ data }) => createSession(getCurrentUserId(), data));

/** `null` when the session doesn't exist or isn't the caller's. */
export const updateSessionFn = createServerFn({ method: "POST" })
	.validator(UpdateSessionInputSchema)
	.handler(({ data }) => updateSession(getCurrentUserId(), data));

export const deleteSessionFn = createServerFn({ method: "POST" })
	.validator(z.object({ sessionId: SessionIdSchema }))
	.handler(({ data }) => deleteSession(getCurrentUserId(), data.sessionId));
