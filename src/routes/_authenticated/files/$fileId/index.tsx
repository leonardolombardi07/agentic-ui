import {
	createFileRoute,
	useLocation,
	useNavigate,
} from "@tanstack/react-router";
import { useLayoutEffect } from "react";
import { fileQueryOptions } from "@/lib/api/files/queries";
import { seo } from "@/lib/seo";
import { warnTabLimit } from "../../-shared/workspace/commands";
import { isShowing } from "../../-shared/workspace/model";
import { workspace } from "../../-shared/workspace/store";

/*
 * A session file as an editor tab, so it can be read big or next to another session.
 * Same shape as `/agents/$agentId`: the workspace (in MainArea) renders it, and this
 * route only syncs the URL into the store.
 */
export const Route = createFileRoute("/_authenticated/files/$fileId/")({
	staticData: { main: "workspace" },
	// The workspace lives in localStorage, so the server can't render this route.
	ssr: false,
	// Validates the file (404 -> notFound(), no tab is created) and warms the cache.
	loader: ({ context: { queryClient }, params }) =>
		queryClient.ensureQueryData(fileQueryOptions(params.fileId)),
	head: ({ loaderData }) => ({
		meta: seo({ title: loaderData ? loaderData.name : "File not found" }),
	}),
	component: RevealFile,
});

/** URL -> store. In the component, not the loader: loaders also run on hover. */
function RevealFile() {
	const { fileId } = Route.useParams();
	// See RevealSession: only reveal once the location and the params agree.
	const isSettled = useLocation({
		select: (l) => l.pathname === `/files/${encodeURIComponent(fileId)}`,
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
		const target = { kind: "file", fileId } as const;
		workspace.reveal(target, hint); // idempotent: the loop breaker
		/*
		 * The active group was full. Catches every way here (links, Back, deep links) in
		 * one place; `/sessions` sends the URL back to whatever tab is focused.
		 */
		if (!isShowing(workspace.getState(), target)) {
			warnTabLimit();
			void navigate({ to: "/sessions", replace: true });
		}
	}, [isSettled, fileId, hintGroupId, hintTabId, navigate]);

	return null;
}
