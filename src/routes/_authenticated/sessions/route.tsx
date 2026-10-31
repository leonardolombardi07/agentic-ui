import { createFileRoute } from "@tanstack/react-router";
import { seo } from "@/lib/seo";

/*
 * No component: the workspace is rendered by the shell (MainArea). The workspace
 * children (index, new, $sessionId) render null and only sync the URL into the
 * workspace store, so each sets `staticData.main` itself; `all` is a page.
 */
export const Route = createFileRoute("/_authenticated/sessions")({
	/*
	 * Client-only (children inherit): the workspace and session drafts live in
	 * localStorage, so the server can't validate or render these routes.
	 */
	ssr: false,
	head: () => ({
		meta: seo({
			title: "Sessions",
			description:
				"Your sessions with agents, side by side in a tabbed workspace.",
		}),
	}),
});
