import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useLayoutEffect, useRef } from "react";
import { z } from "zod";
import { createDraftSession } from "@/lib/api/sessions/drafts";
import { sessionsListQueryOptions } from "@/lib/api/sessions/queries";
import { workspace } from "../-shared/workspace/store";

export const Route = createFileRoute("/_authenticated/sessions/new")({
	validateSearch: z.object({
		agentId: z.string().optional(),
		prompt: z.string().optional(),
		target: z.enum(["active", "side"]).default("active"),
	}),
	// The work happens in the component, NOT beforeLoad: preload-on-hover would create drafts.
	component: NewSession,
});

/** One-shot entry point: creates a draft tab, then replaces itself with `/sessions/$id`. */
function NewSession() {
	const search = Route.useSearch();
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	// StrictMode runs effects twice in dev; one entry must create exactly one draft.
	const done = useRef(false);

	useLayoutEffect(() => {
		if (done.current) return;
		done.current = true;
		const sessionId = createDraftSession({ agentId: search.agentId });
		void queryClient.invalidateQueries({
			queryKey: sessionsListQueryOptions().queryKey,
			exact: true,
		});
		if (search.target === "side") {
			workspace.openToSide(
				{ kind: "session", sessionId },
				{ draft: search.prompt },
			);
		} else {
			workspace.open({ kind: "session", sessionId }, { draft: search.prompt });
		}
		void navigate({
			to: "/sessions/$sessionId",
			params: { sessionId },
			replace: true,
		});
	}, [navigate, queryClient, search]);

	return null;
}
