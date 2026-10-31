import { z } from "zod";

/**
 * Something the agent can't continue without: permission to run a tool, or an answer
 * to a question. At most one per session, because the run is paused until it's resolved.
 */
export const PendingActionSchema = z.discriminatedUnion("kind", [
	z.object({
		kind: z.literal("approval"),
		id: z.string(),
		/** Tool the agent wants to run, e.g. "Send email". */
		toolName: z.string(),
		/** What the call would do, in plain words. */
		description: z.string(),
	}),
	z.object({
		kind: z.literal("question"),
		id: z.string(),
		question: z.string(),
	}),
]);

export type PendingAction = z.infer<typeof PendingActionSchema>;

/** How the user resolves a `PendingAction`. */
export const PendingActionResponseSchema = z.discriminatedUnion("kind", [
	z.object({ kind: z.literal("approve") }),
	z.object({ kind: z.literal("refuse") }),
	z.object({ kind: z.literal("answer"), text: z.string().min(1) }),
]);

export type PendingActionResponse = z.infer<typeof PendingActionResponseSchema>;

export const SessionSchema = z.object({
	id: z.string(),
	title: z.string(),
	agentId: z.string().nullable(),
	runStatus: z.enum(["idle", "running"]),
	/** Defaulted so drafts persisted before this field existed still load. */
	pendingAction: PendingActionSchema.nullable().default(null),
	updatedAt: z.string(),
	/** Created on the client and not yet sent to the server (see `drafts.ts`). */
	isDraft: z.boolean(),
});

export type Session = z.infer<typeof SessionSchema>;
