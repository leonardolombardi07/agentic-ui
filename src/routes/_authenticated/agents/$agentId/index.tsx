import {
	createFileRoute,
	useLocation,
	useNavigate,
} from "@tanstack/react-router";
import { useLayoutEffect } from "react";
import { agentQueryOptions } from "@/lib/api/agents/queries";
import { seo } from "@/lib/seo";
import { warnTabLimit } from "../../-shared/workspace/commands";
import { isShowing } from "../../-shared/workspace/model";
import { workspace } from "../../-shared/workspace/store";

/*
 * An agent's page is an editor tab, like VSCode's extension details, so it can sit next
 * to a session or in a split. Same shape as `/sessions/$sessionId`: the workspace (in
 * MainArea) renders it, and this route only syncs the URL into the store.
 */
export const Route = createFileRoute("/_authenticated/agents/$agentId/")({
	staticData: { main: "workspace" },
	// The workspace lives in localStorage, so the server can't render this route.
	ssr: false,
	// Validates the agent (404 -> notFound(), no tab is created) and warms the cache.
	loader: ({ context: { queryClient }, params }) =>
		queryClient.ensureQueryData(agentQueryOptions(params.agentId)),
	head: ({ loaderData }) => ({
		meta: loaderData
			? seo({ title: loaderData.name, description: loaderData.description })
			: seo({ title: "Agent not found" }),
	}),
	component: RevealAgent,
});

/** URL -> store. In the component, not the loader: loaders also run on hover. */
function RevealAgent() {
	const { agentId } = Route.useParams();
	// See RevealSession: only reveal once the location and the params agree.
	const isSettled = useLocation({
		select: (l) => l.pathname === `/agents/${encodeURIComponent(agentId)}`,
	});
	const hintGroupId = useLocation({
		select: (l) => l.state.workspaceTab?.groupId,
	});
	const hintTabId = useLocation({ select: (l) => l.state.workspaceTab?.tabId });
	const navigate = useNavigate();

	useLayoutEffect(() => {
		if (!isSettled) return;
		const hint =
			hintGroupId && hintTabId
				? { groupId: hintGroupId, tabId: hintTabId }
				: undefined;
		const target = { kind: "agent", agentId } as const;
		workspace.reveal(target, hint); // idempotent: the loop breaker
		/*
		 * The active group was full. Catches every way here (links, Back, deep links) in
		 * one place; `/sessions` sends the URL back to whatever tab is focused.
		 */
		if (!isShowing(workspace.getState(), target)) {
			warnTabLimit();
			void navigate({ to: "/sessions", replace: true });
		}
	}, [isSettled, agentId, hintGroupId, hintTabId, navigate]);

	return null;
}
