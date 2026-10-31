import { createFileRoute } from "@tanstack/react-router";

/*
 * No component: the workspace is rendered by the shell (MainArea), and the child
 * routes render null. They exist to sync the URL into the workspace store.
 */
export const Route = createFileRoute("/_authenticated/sessions")({
	staticData: { main: "workspace" },
	/*
	 * Client-only (children inherit): the workspace and session drafts live in
	 * localStorage, so the server can't validate or render these routes.
	 */
	ssr: false,
});
