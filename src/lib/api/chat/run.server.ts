import { chat, type chatParamsFromRequest } from "@tanstack/ai";
import { withPersistence } from "@tanstack/ai-persistence";
import { AGENTS } from "@/lib/api/agents/mock-data";
import { getServerEnv } from "@/lib/api/env.server";
import { MODELS } from "@/lib/api/models/mock-data";
import { persistence } from "@/lib/api/persistence.server";
import {
	type RunMeta,
	runMetasTable,
	type SessionRecord,
} from "@/lib/api/sessions/store.server";
import type { EffortLevel } from "@/lib/api/types/model";
import { createChatAdapter, type OpenRouterModelId } from "./adapters.server";

/** The built-in Default agent (`leadAgentId: null`), until it's a real agent. */
const DEFAULT_AGENT_INSTRUCTIONS =
	"You are a helpful assistant. Answer clearly and concisely.";

type ChatParams = Awaited<ReturnType<typeof chatParamsFromRequest>>;

/** What a run uses. Fixed for the whole run: switching agents mid-run applies next turn. */
type RunPlan = Pick<
	RunMeta,
	"agentId" | "agentVersion" | "modelId" | "effort"
> & {
	instructions: string;
};

export class RunPlanError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "RunPlanError";
	}
}

/**
 * Starts one run of a session's lead agent and returns its chunk stream. Records what
 * the run used (`RunMeta`) before it starts; TanStack AI records how it went.
 */
export async function startRun({
	session,
	params,
	abortController,
}: {
	session: SessionRecord;
	params: ChatParams;
	abortController: AbortController;
}) {
	// Throws `MissingEnvError` before anything is recorded.
	const env = getServerEnv();
	const plan = await planRun(session, params);
	// Safe: `planRun` only accepts ids from MODELS, which are OpenRouter ids.
	const adapter = createChatAdapter(plan.modelId as OpenRouterModelId, env);

	await runMetasTable.insert({
		runId: params.runId,
		sessionId: session.id,
		parentRunId: params.parentRunId ?? null,
		agentId: plan.agentId,
		agentVersion: plan.agentVersion,
		modelId: plan.modelId,
		effort: plan.effort,
		startedAt: new Date().toISOString(),
	});

	return chat({
		adapter,
		messages: params.messages,
		threadId: session.id,
		runId: params.runId,
		systemPrompts: [plan.instructions],
		...(plan.effort ? { reasoning: plan.effort } : {}),
		...(params.resume ? { resume: params.resume } : {}),
		abortController,
		middleware: [withPersistence(persistence)],
	});
}

/**
 * A new turn uses the session's current lead agent and settings. A resume (the user
 * answered an approval) continues the interrupted run, so it keeps that run's agent
 * and model even if the session's changed since.
 */
async function planRun(
	session: SessionRecord,
	params: ChatParams,
): Promise<RunPlan> {
	const interrupted = params.resume
		? await runMetasTable.latestLeadRun(session.id)
		: null;
	const agentId = interrupted ? interrupted.agentId : session.leadAgentId;
	const modelId = interrupted ? interrupted.modelId : session.settings.modelId;
	const chosenEffort = interrupted
		? interrupted.effort
		: session.settings.effort;

	const model = MODELS.find((m) => m.id === modelId);
	if (!model) throw new RunPlanError(`Unknown model "${modelId}".`);

	const agent = agentId === null ? null : AGENTS.find((a) => a.id === agentId);
	if (agent === undefined) {
		throw new RunPlanError(`Agent "${agentId}" no longer exists.`);
	}

	return {
		agentId,
		agentVersion: agent?.version ?? null,
		modelId: model.id,
		effort: resolveEffort(
			model.effortLevels,
			model.defaultEffort,
			chosenEffort,
		),
		instructions: agent?.instructions ?? DEFAULT_AGENT_INSTRUCTIONS,
	};
}

/** The chosen level if the model supports it, otherwise its default (null if none). */
function resolveEffort(
	levels: EffortLevel[],
	defaultEffort: EffortLevel | null,
	chosen: EffortLevel | null,
): EffortLevel | null {
	if (chosen !== null && levels.includes(chosen)) return chosen;
	return defaultEffort;
}
