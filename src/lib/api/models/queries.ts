import { queryOptions } from "@tanstack/react-query";
import { type Model, ModelSchema } from "@/lib/api/types/model";

/* Mock backend until the real API exists. Only the query options are public. */
const MODELS: Model[] = ModelSchema.array().parse([
	{
		id: "claude-opus-5-5",
		name: "Opus 5.5",
		description: "Most capable, for complex work.",
		effortLevels: ["low", "medium", "high", "xhigh", "max"],
		defaultEffort: "high",
	},
	{
		id: "claude-sonnet-5-5",
		name: "Sonnet 5.5",
		description: "Fast and capable, for everyday tasks.",
		effortLevels: ["low", "medium", "high"],
		defaultEffort: "medium",
	},
	{
		id: "claude-haiku-5-5",
		name: "Haiku 5.5",
		description: "Fastest, for quick answers.",
		effortLevels: [],
		defaultEffort: null,
	},
]);

function delay(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Available models, the default one first. */
export function modelsListQueryOptions() {
	return queryOptions({
		queryKey: ["models"],
		queryFn: async () => {
			await delay(150);
			return MODELS;
		},
		staleTime: Number.POSITIVE_INFINITY,
	});
}
