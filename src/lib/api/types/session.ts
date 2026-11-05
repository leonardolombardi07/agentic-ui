import { z } from "zod";
import { EffortLevelSchema } from "./model";
import { PermissionModeSchema } from "./permission-mode";

/**
 * Something the agent can't continue without: permission to run a tool, or an answer
 * to a question. Derived from TanStack AI's interrupt store, never stored on the session.
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

/** Generated on the client (`crypto.randomUUID()`), and also the TanStack AI `threadId`. */
export const SessionIdSchema = z.string().min(1).max(128);

/**
 * What the next run uses. Model and effort are fixed when a run starts (see `RunMeta`
 * on the server); permission mode is read live, so tightening it applies right away.
 */
export const SessionSettingsSchema = z.object({
	/** An OpenRouter model id, e.g. `nvidia/nemotron-3.5-super-vl:free`. */
	modelId: z.string().min(1),
	/** Null when the model has no effort control. */
	effort: EffortLevelSchema.nullable(),
	permissionMode: PermissionModeSchema,
});

export type SessionSettings = z.infer<typeof SessionSettingsSchema>;

/** Where the title came from. "user" once renamed, so auto-titles never overwrite it. */
export const TitleSourceSchema = z.enum(["placeholder", "generated", "user"]);

export type TitleSource = z.infer<typeof TitleSourceSchema>;

/**
 * Derived from TanStack AI's run and interrupt stores:
 * - `running`: a run is streaming
 * - `waiting`: paused on the user (see `pendingActions`)
 * - `failed`: the last run errored
 */
export const RunStatusSchema = z.enum(["idle", "running", "waiting", "failed"]);

export type RunStatus = z.infer<typeof RunStatusSchema>;

/** A session as the API returns it: the stored row plus state derived from the run stores. */
export const SessionSchema = z.object({
	id: SessionIdSchema,
	title: z.string(),
	titleSource: TitleSourceSchema,
	/**
	 * The agent that leads the next turn; other agents join as its subagents.
	 * `null` is the built-in Default agent, until it becomes a real agent.
	 */
	leadAgentId: z.string().nullable(),
	settings: SessionSettingsSchema,
	pinned: z.boolean(),
	archivedAt: z.iso.datetime().nullable(),
	createdAt: z.iso.datetime(),
	/** Bumped on each new turn and on edits; lists sort by it. */
	updatedAt: z.iso.datetime(),
	runStatus: RunStatusSchema,
	/** Usually one, but parallel tool calls can pause a run on several at once. */
	pendingActions: z.array(PendingActionSchema),
});

export type Session = z.infer<typeof SessionSchema>;

/** A session as the UI sees it: server sessions plus local drafts (see `drafts.ts`). */
export const ClientSessionSchema = SessionSchema.extend({
	/** Created on the client and not sent to the server yet. */
	isDraft: z.boolean(),
});

export type ClientSession = z.infer<typeof ClientSessionSchema>;

/** Creates a session on its first send. Idempotent: the id is the client's. */
export const CreateSessionInputSchema = SessionSchema.pick({
	id: true,
	title: true,
	titleSource: true,
	leadAgentId: true,
	settings: true,
});

export type CreateSessionInput = z.infer<typeof CreateSessionInputSchema>;

export const UpdateSessionInputSchema = z.object({
	sessionId: SessionIdSchema,
	patch: z.object({
		/** Renaming sets `titleSource` to "user". */
		title: z.string().trim().min(1).max(200).optional(),
		/** Applies from the next turn; a running run keeps its agent. */
		leadAgentId: z.string().nullable().optional(),
		settings: SessionSettingsSchema.partial().optional(),
		pinned: z.boolean().optional(),
		archived: z.boolean().optional(),
	}),
});

export type UpdateSessionInput = z.infer<typeof UpdateSessionInputSchema>;

/** The action the UI shows first. Several only happen with parallel tool calls. */
export function getPendingAction(session: Session): PendingAction | null {
	return session.pendingActions[0] ?? null;
}
