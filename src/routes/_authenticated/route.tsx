import { createFileRoute } from "@tanstack/react-router";
import { agentsListQueryOptions } from "@/lib/api/agents/queries";
import { sessionsListQueryOptions } from "@/lib/api/sessions/queries";
import { AppShell } from "./-route/AppShell";
import { ModalSearchSchema } from "./-route/modals/search";
import { NotFound } from "./-route/NotFound";

export const Route = createFileRoute("/_authenticated")({
	validateSearch: ModalSearchSchema,
	beforeLoad: () => {
		// Auth guard goes here, e.g. throw redirect({ to: "/login", search: { redirect: location.href } })
	},
	loader: ({ context: { queryClient } }) => {
		// Not awaited: the side panel suspends on its own, so navigation never waits for it.
		void queryClient.prefetchQuery(sessionsListQueryOptions());
		void queryClient.prefetchQuery(agentsListQueryOptions());
	},
	component: AppShell,
	notFoundComponent: NotFound,
});
