import { queryOptions } from "@tanstack/react-query";
import type { User } from "@/lib/api/types/user";

/* Mock backend until auth exists. Only the query options are public. */
const CURRENT_USER: User = {
	id: "u-leonardo",
	firstName: "Leonardo",
	lastName: "Lombardi",
	email: "leonardo@company.com",
};

function delay(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

/** The signed-in user. Rarely changes, so it stays fresh for the whole visit. */
export function currentUserQueryOptions() {
	return queryOptions({
		queryKey: ["users", "me"],
		queryFn: async () => {
			await delay(100);
			return CURRENT_USER;
		},
		staleTime: Number.POSITIVE_INFINITY,
	});
}
