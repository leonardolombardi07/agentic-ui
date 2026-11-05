import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useLayoutEffect, useRef } from "react";
import { z } from "zod";
import { createDraftSession } from "@/lib/api/sessions/drafts";
import { sessionsListQueryOptions } from "@/lib/api/sessions/queries";
import { seo } from "@/lib/seo";
import { warnTabLimit } from "../-shared/workspace/commands";
import {
	getActiveGroup,
	getSideGroup,
	hasRoomFor,
} from "../-shared/workspace/model";
import { workspace } from "../-shared/workspace/store";

export const Route = createFileRoute("/_authenticated/sessions/new")({
	staticData: { main: "workspace" },
	validateSearch: z.object({
		agentId: z.string().optional(),
		prompt: z.string().optional(),
		target: z.enum(["active", "side"]).default("active"),
	}),
	head: () => ({ meta: seo({ title: "New session" }) }),
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
		// Check before creating the draft, or a full group would leave an orphan behind.
		const ws = workspace.getState();
		const group =
			search.target === "side" ? getSideGroup(ws) : getActiveGroup(ws);
		if (!hasRoomFor(group)) {
			warnTabLimit();
			void navigate({ to: "/sessions", replace: true });
			return;
		}
		const sessionId = createDraftSession({ leadAgentId: search.agentId });
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
