import type { InterruptRecord } from "@tanstack/ai-persistence";
import { z } from "zod";
import { persistence } from "@/lib/api/persistence.server";
import type {
	CreateSessionInput,
	PendingAction,
	RunStatus,
	Session,
	UpdateSessionInput,
} from "@/lib/api/types/session";
import {
	runMetasTable,
	type SessionRecord,
	sessionsTable,
} from "./store.server";

/*
 * Session use cases. Every function takes the caller's id and treats someone else's
 * session as missing, so ids can't be probed.
 */

/** The caller's unarchived sessions, most recently active first. */
export async function listSessions(ownerId: string): Promise<Session[]> {
	const records = await sessionsTable.listByOwner(ownerId);
	const visible = records
		.filter((r) => r.archivedAt === null)
		.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
	return Promise.all(visible.map(toSession));
}

export async function getSession(
	ownerId: string,
	sessionId: string,
): Promise<Session | null> {
	const record = await getOwnedRecord(ownerId, sessionId);
	return record ? toSession(record) : null;
}

/**
 * Creates the session on its first send. Idempotent, so a retried send is harmless:
 * an existing session is returned as is. Someone else's id is refused.
 */
export async function createSession(
	ownerId: string,
	input: CreateSessionInput,
): Promise<Session> {
	const existing = await sessionsTable.get(input.id);
	if (existing) {
		if (existing.ownerId !== ownerId) throw new SessionConflictError();
		return toSession(existing);
	}
	const now = new Date().toISOString();
	const record: SessionRecord = {
		...input,
		ownerId,
		pinned: false,
		archivedAt: null,
		createdAt: now,
		updatedAt: now,
	};
	await sessionsTable.put(record);
	return toSession(record);
}

export async function updateSession(
	ownerId: string,
	{ sessionId, patch }: UpdateSessionInput,
): Promise<Session | null> {
	const record = await getOwnedRecord(ownerId, sessionId);
	if (!record) return null;
	const next: SessionRecord = {
		...record,
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
		settings: { ...record.settings, ...patch.settings },
		updatedAt: new Date().toISOString(),
	};
	await sessionsTable.put(next);
	return toSession(next);
}

/** Returns false when there was nothing to delete. */
export async function deleteSession(
	ownerId: string,
	sessionId: string,
): Promise<boolean> {
	const record = await getOwnedRecord(ownerId, sessionId);
	if (!record) return false;
	await sessionsTable.delete(sessionId);
	await runMetasTable.deleteForSession(sessionId);
	/*
	 * TanStack AI's store contracts have no delete: clearing the transcript is all
	 * they allow. Runs and interrupts stay behind, unreachable because every read
	 * checks ownership first. A database adapter should cascade on `threadId`.
	 */
	await persistence.stores.messages.saveThread(sessionId, []);
	return true;
}

/** Marks a new turn, so the session moves to the top of the list. */
export async function touchSession(record: SessionRecord): Promise<void> {
	await sessionsTable.put({ ...record, updatedAt: new Date().toISOString() });
}

export async function getOwnedRecord(
	ownerId: string,
	sessionId: string,
): Promise<SessionRecord | null> {
	const record = await sessionsTable.get(sessionId);
	return record?.ownerId === ownerId ? record : null;
}

export class SessionConflictError extends Error {
	constructor() {
		super("A session with this id already exists.");
		this.name = "SessionConflictError";
	}
}

async function toSession(record: SessionRecord): Promise<Session> {
	const { ownerId: _ownerId, ...rest } = record;
	const { runStatus, pendingActions } = await deriveRunState(record.id);
	return { ...rest, runStatus, pendingActions };
}

/** Run state comes from TanStack AI's stores, so it can't drift from what really ran. */
async function deriveRunState(
	sessionId: string,
): Promise<{ runStatus: RunStatus; pendingActions: PendingAction[] }> {
	const { runs, interrupts } = persistence.stores;

	const pending = await interrupts.listPending(sessionId);
	if (pending.length > 0) {
		return {
			runStatus: "waiting",
			pendingActions: pending.map(toPendingAction),
		};
	}
	if (await runs.findActiveRun(sessionId)) {
		return { runStatus: "running", pendingActions: [] };
	}
	const history = (await runs.listByThread?.(sessionId)) ?? [];
	const latest = history.reduce<(typeof history)[number] | null>(
		(acc, run) => (acc === null || run.startedAt > acc.startedAt ? run : acc),
		null,
	);
	return {
		runStatus: latest?.status === "failed" ? "failed" : "idle",
		pendingActions: [],
	};
}

/*
 * The parts of an interrupt payload we show. TanStack AI writes an AG-UI interrupt:
 * tool approvals carry `metadata.kind = "approval"` and `metadata.toolName`.
 */
const InterruptPayloadSchema = z.looseObject({
	message: z.string().optional(),
	metadata: z
		.looseObject({
			kind: z.string().optional(),
			toolName: z.string().optional(),
		})
		.optional(),
});

function toPendingAction(interrupt: InterruptRecord): PendingAction {
	const parsed = InterruptPayloadSchema.safeParse(interrupt.payload);
	const payload = parsed.success ? parsed.data : {};
	const message = payload.message ?? "The agent is waiting for your input.";
	if (payload.metadata?.kind === "approval" && payload.metadata.toolName) {
		return {
			kind: "approval",
			id: interrupt.interruptId,
			toolName: payload.metadata.toolName,
			description: message,
		};
	}
	return { kind: "question", id: interrupt.interruptId, question: message };
}
