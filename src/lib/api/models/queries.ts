import { queryOptions } from "@tanstack/react-query";
import { MODELS } from "./mock-data";

/* Mock backend until the real API exists. Only the query options are public. */

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
