import { mutationOptions, queryOptions } from "@tanstack/react-query";
import { notFound } from "@tanstack/react-router";
import { AGENTS } from "./mock-data";

/* Mock backend until the real API exists. Only the query/mutation options are public. */

/** Agents the current user created or added. Real ownership comes with the API. */
const MY_AGENT_IDS = new Set(["research", "slides", "excel-analyst"]);

function delay(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

export function agentsListQueryOptions() {
	return queryOptions({
		queryKey: ["agents"],
		queryFn: async () => {
			await delay(150);
			return AGENTS;
		},
	});
}

/** The user's own agents, listed before "Browse all agents" in pickers. */
export function myAgentsListQueryOptions() {
	return queryOptions({
		// Not under ["agents", ...]: that prefix holds per-id details, and an id could be "mine".
		queryKey: ["my-agents"],
		queryFn: async () => {
			await delay(150);
			return AGENTS.filter((agent) => MY_AGENT_IDS.has(agent.id));
		},
	});
}

export function agentQueryOptions(agentId: string) {
	return queryOptions({
		queryKey: ["agents", agentId],
		queryFn: async () => {
			await delay(100);
			const agent = AGENTS.find((a) => a.id === agentId);
			if (!agent) throw notFound();
			return agent;
		},
		retry: false,
	});
}

/** Adds an agent to the user's agents. The variable is the agent id. */
export function addAgentMutationOptions() {
	return mutationOptions({
		mutationKey: ["my-agents", "add"],
		mutationFn: async (agentId: string) => {
			await delay(200);
			MY_AGENT_IDS.add(agentId);
		},
		onSuccess: (_data, _agentId, _onMutateResult, { client }) =>
			client.invalidateQueries({
				queryKey: myAgentsListQueryOptions().queryKey,
			}),
	});
}

/** Removes an agent from the user's agents. The variable is the agent id. */
export function removeAgentMutationOptions() {
	return mutationOptions({
		mutationKey: ["my-agents", "remove"],
		mutationFn: async (agentId: string) => {
			await delay(200);
			MY_AGENT_IDS.delete(agentId);
		},
		onSuccess: (_data, _agentId, _onMutateResult, { client }) =>
			client.invalidateQueries({
				queryKey: myAgentsListQueryOptions().queryKey,
			}),
	});
}
