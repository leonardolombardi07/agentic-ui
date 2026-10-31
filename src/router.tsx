import { createRouter as createTanStackRouter } from "@tanstack/react-router";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";
import { getContext } from "./routes/-root/tanstack-query";
import { routeTree } from "./routeTree.gen";

export function getRouter() {
	const context = getContext();

	const router = createTanStackRouter({
		routeTree,
		context,
		scrollRestoration: true,
		defaultPreload: "intent",
		defaultPreloadStaleTime: 0,
	});

	setupRouterSsrQueryIntegration({ router, queryClient: context.queryClient });

	return router;
}

declare module "@tanstack/react-router" {
	interface Register {
		router: ReturnType<typeof getRouter>;
	}
	interface StaticDataRouteOption {
		/** What the main area shows for this route. Default: "page". */
		main?: "workspace" | "page";
	}
	interface HistoryState {
		/** Which tab a history entry focused, so back/forward restore the exact group and tab. */
		workspaceTab?: { groupId: string; tabId: string };
		/** Set when a modal was opened by an in-app link, so closing it can just go Back. */
		modalOpenedInApp?: boolean;
	}
}
