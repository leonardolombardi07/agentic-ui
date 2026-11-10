import { z } from "zod";
import { DEFAULT_MODEL } from "@/lib/api/models/mock-data";
import { EffortLevelSchema } from "@/lib/api/types/model";
import {
	SessionIdSchema,
	SessionSettingsSchema,
	TitleSourceSchema,
} from "@/lib/api/types/session";
import { PIPELINE_SESSION_ID, SUPPORT_SESSION_ID } from "./seed-transcripts";

/*
 * Our own tables, next to TanStack AI's stores (`persistence.server.ts`). In memory
 * for now. Every function is async so moving to Postgres doesn't change the callers.
 */

/**
 * The stored session row: only what TanStack AI doesn't keep. The transcript, runs and
 * pending interrupts live in its stores under `threadId = id`.
 */
export const SessionRecordSchema = z.object({
	id: SessionIdSchema,
	/** Checked on every read and write, including the chat route. */
	ownerId: z.string(),
	title: z.string(),
	titleSource: TitleSourceSchema,
	leadAgentId: z.string().nullable(),
	settings: SessionSettingsSchema,
	pinned: z.boolean(),
	archivedAt: z.iso.datetime().nullable(),
	createdAt: z.iso.datetime(),
	updatedAt: z.iso.datetime(),
});

export type SessionRecord = z.infer<typeof SessionRecordSchema>;

/**
 * What a run actually used, written once when it starts and never edited. Lives next
 * to TanStack AI's `RunRecord` (same `runId`), which owns status, timings and usage.
 */
export const RunMetaSchema = z.object({
	runId: z.string(),
	sessionId: SessionIdSchema,
	/** Set on a subagent's run: the lead's run that called it. */
	parentRunId: z.string().nullable(),
	/** `null` is the Default agent. */
	agentId: z.string().nullable(),
	agentVersion: z.number().int().positive().nullable(),
	modelId: z.string(),
	effort: EffortLevelSchema.nullable(),
	startedAt: z.iso.datetime(),
});

export type RunMeta = z.infer<typeof RunMetaSchema>;

type Tables = {
	sessions: Map<string, SessionRecord>;
	runMetas: Map<string, RunMeta>;
};

/* On `globalThis` so Vite's server HMR doesn't wipe the tables on every edit. */
const globalStore = globalThis as typeof globalThis & {
	__agenticUiTables?: Tables;
};

const tables: Tables = globalStore.__agenticUiTables ?? {
	sessions: new Map(seedSessions().map((s) => [s.id, s])),
	runMetas: new Map(),
};

globalStore.__agenticUiTables = tables;

export const sessionsTable = {
	async get(id: string): Promise<SessionRecord | null> {
		return tables.sessions.get(id) ?? null;
	},
	async listByOwner(ownerId: string): Promise<SessionRecord[]> {
		return [...tables.sessions.values()].filter((s) => s.ownerId === ownerId);
	},
	/** Inserts or replaces the whole row. */
	async put(record: SessionRecord): Promise<void> {
		tables.sessions.set(record.id, record);
	},
	async delete(id: string): Promise<void> {
		tables.sessions.delete(id);
	},
};

export const runMetasTable = {
	async insert(meta: RunMeta): Promise<void> {
		// A retried request reuses its runId: keep the first record, it's what ran.
		if (tables.runMetas.has(meta.runId)) return;
		tables.runMetas.set(meta.runId, meta);
	},
	/** The session's most recent lead run (subagent runs excluded). */
	async latestLeadRun(sessionId: string): Promise<RunMeta | null> {
		let latest: RunMeta | null = null;
		for (const meta of tables.runMetas.values()) {
			if (meta.sessionId !== sessionId || meta.parentRunId !== null) continue;
			if (latest === null || meta.startedAt > latest.startedAt) latest = meta;
		}
		return latest;
	},
	async deleteForSession(sessionId: string): Promise<void> {
		for (const [runId, meta] of tables.runMetas) {
			if (meta.sessionId === sessionId) tables.runMetas.delete(runId);
		}
	},
};

/** A few sessions so the UI isn't empty in dev. Most have history (`seed-transcripts/`). */
function seedSessions(): SessionRecord[] {
	const base = {
		ownerId: "u-leonardo",
		titleSource: "user",
		settings: {
			modelId: DEFAULT_MODEL.id,
			effort: DEFAULT_MODEL.defaultEffort,
			permissionMode: "ask",
		},
		pinned: false,
		archivedAt: null,
	} satisfies Partial<SessionRecord>;
	const rows: Array<
		Pick<SessionRecord, "id" | "title" | "leadAgentId" | "updatedAt">
	> = [
		{
			id: PIPELINE_SESSION_ID,
			title: "Q4 pipeline review",
			leadAgentId: "research",
			updatedAt: "2026-10-31T09:15:00.000Z",
		},
		{
			id: SUPPORT_SESSION_ID,
			title: "Support backlog by SLA",
			leadAgentId: "sql-helper",
			updatedAt: "2026-10-31T08:40:00.000Z",
		},
		{
			id: "s-q3-earnings",
			title: "Q3 earnings summary",
			leadAgentId: "research",
			updatedAt: "2026-10-30T18:20:00.000Z",
		},
		{
			id: "s-board-deck",
			title: "Board meeting deck",
			leadAgentId: "slides",
			updatedAt: "2026-10-30T16:02:00.000Z",
		},
		{
			id: "s-budget-cleanup",
			title: "Clean up 2027 budget sheet",
			leadAgentId: "excel-analyst",
			updatedAt: "2026-10-29T21:45:00.000Z",
		},
		{
			id: "s-auth-pr",
			title: "Review auth middleware PR",
			leadAgentId: "code-reviewer",
			updatedAt: "2026-10-29T14:10:00.000Z",
		},
		{
			id: "s-launch-post",
			title: "Launch blog post",
			leadAgentId: "writer",
			updatedAt: "2026-10-28T11:30:00.000Z",
		},
	];
	return rows.map((row) => ({ ...base, ...row, createdAt: row.updatedAt }));
}
