import { mutationOptions, queryOptions } from "@tanstack/react-query";
import { notFound } from "@tanstack/react-router";
import type { Prompt, PromptInput } from "@/lib/api/types/prompt";
import { PROMPTS } from "./mock-data";

/* Mock backend until the real API exists. Only the query/mutation options are public. */

/** The user's own prompts are always "yours"; library prompts become yours when added. */
const MY_PROMPT_IDS = new Set(["review-my-draft", "bug-report"]);

/** Prompts the user wrote, newest first. They are in the directory too, so detail pages find them. */
const created: Prompt[] = [];

function allPrompts(): Prompt[] {
	return [...created, ...PROMPTS];
}

function delay(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Every prompt: the library plus the ones the user wrote. */
export function promptsListQueryOptions() {
	return queryOptions({
		queryKey: ["prompts"],
		queryFn: async () => {
			await delay(150);
			return allPrompts();
		},
	});
}

/** The ids of the prompts the user keeps. */
export function myPromptIdsQueryOptions() {
	return queryOptions({
		// Not under ["prompts", ...]: that prefix holds per-id details.
		queryKey: ["my-prompts"],
		queryFn: async () => {
			await delay(100);
			return [...MY_PROMPT_IDS];
		},
	});
}

export function promptQueryOptions(promptId: string) {
	return queryOptions({
		queryKey: ["prompts", promptId],
		queryFn: async () => {
			await delay(100);
			const prompt = allPrompts().find((p) => p.id === promptId);
			if (!prompt) throw notFound();
			return prompt;
		},
		retry: false,
	});
}

/** Adds a library prompt to the user's prompts. The variable is the prompt id. */
export function addPromptMutationOptions() {
	return mutationOptions({
		mutationKey: ["my-prompts", "add"],
		mutationFn: async (promptId: string) => {
			await delay(200);
			MY_PROMPT_IDS.add(promptId);
		},
		onSuccess: (_data, _promptId, _onMutateResult, { client }) =>
			client.invalidateQueries({
				queryKey: myPromptIdsQueryOptions().queryKey,
			}),
	});
}

/** Removes a prompt from the user's prompts. The variable is the prompt id. */
export function removePromptMutationOptions() {
	return mutationOptions({
		mutationKey: ["my-prompts", "remove"],
		mutationFn: async (promptId: string) => {
			await delay(200);
			MY_PROMPT_IDS.delete(promptId);
		},
		onSuccess: (_data, _promptId, _onMutateResult, { client }) =>
			client.invalidateQueries({
				queryKey: myPromptIdsQueryOptions().queryKey,
			}),
	});
}

/** Writes a new prompt. Resolves to it, so the caller can open its page. */
export function createPromptMutationOptions() {
	return mutationOptions({
		mutationKey: ["prompts", "create"],
		mutationFn: async (input: PromptInput): Promise<Prompt> => {
			await delay(200);
			const prompt: Prompt = {
				...input,
				id: crypto.randomUUID(),
				publisher: "You",
				category: "Yours",
				updatedAt: new Date().toISOString(),
			};
			created.unshift(prompt);
			MY_PROMPT_IDS.add(prompt.id);
			return prompt;
		},
		onSuccess: async (_prompt, _input, _onMutateResult, { client }) => {
			await Promise.all([
				client.invalidateQueries({
					queryKey: promptsListQueryOptions().queryKey,
				}),
				client.invalidateQueries({
					queryKey: myPromptIdsQueryOptions().queryKey,
				}),
			]);
		},
	});
}
