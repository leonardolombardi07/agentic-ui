import { mutationOptions, queryOptions } from "@tanstack/react-query";
import { isNotFound, notFound } from "@tanstack/react-router";
import type { PendingActionResponse, Session } from "@/lib/api/types/session";
import { getDraftSession, listDraftSessions } from "./drafts";

/* Mock backend until the real API exists. Only the query options are public. */
const SESSIONS: Session[] = [
	{
		id: "s-q3-earnings",
		title: "Q3 earnings summary",
		agentId: "research",
		runStatus: "running",
		pendingAction: null,
		updatedAt: "2026-10-30T18:20:00Z",
		isDraft: false,
	},
	{
		id: "s-board-deck",
		title: "Board meeting deck",
		agentId: "slides",
		runStatus: "idle",
		pendingAction: {
			kind: "approval",
			id: "a-board-deck-share",
			toolName: "Share file",
			description:
				'Share "Board deck v3.pptx" with board-members@company.com (can view).',
		},
		updatedAt: "2026-10-30T16:02:00Z",
		isDraft: false,
	},
	{
		id: "s-budget-cleanup",
		title: "Clean up 2027 budget sheet",
		agentId: "excel-analyst",
		runStatus: "idle",
		pendingAction: {
			kind: "question",
			id: "q-budget-source",
			question:
				'Both "Budget" and "Budget (final)" have 2027 totals, and they differ by $42k. Which tab is the source of truth?',
		},
		updatedAt: "2026-10-29T21:45:00Z",
		isDraft: false,
	},
	{
		id: "s-auth-pr",
		title: "Review auth middleware PR",
		agentId: "code-reviewer",
		runStatus: "idle",
		pendingAction: null,
		updatedAt: "2026-10-29T14:10:00Z",
		isDraft: false,
	},
	{
		id: "s-launch-post",
		title: "Launch blog post",
		agentId: "writer",
		runStatus: "idle",
		pendingAction: null,
		updatedAt: "2026-10-28T11:30:00Z",
		isDraft: false,
	},
	{
		id: "s-competitors",
		title: "Competitor landscape",
		agentId: "research",
		runStatus: "idle",
		pendingAction: null,
		updatedAt: "2026-10-27T09:00:00Z",
		isDraft: false,
	},
];

function delay(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Don't retry a 404: it won't fix itself and it delays the "not found" UI. */
function retryUnlessNotFound(failureCount: number, error: unknown) {
	return !isNotFound(error) && failureCount < 3;
}

export function sessionsListQueryOptions() {
	return queryOptions({
		queryKey: ["sessions"],
		queryFn: async () => {
			await delay(150);
			return [...listDraftSessions(), ...SESSIONS];
		},
	});
}

export function sessionQueryOptions(sessionId: string) {
	return queryOptions({
		queryKey: ["sessions", sessionId],
		queryFn: async () => {
			const draft = getDraftSession(sessionId);
			if (draft) return draft;
			await delay(100);
			const session = SESSIONS.find((s) => s.id === sessionId);
			if (!session) throw notFound();
			return session;
		},
		retry: retryUnlessNotFound,
	});
}

/**
 * Approves, refuses or answers a session's pending action. Every response resumes the
 * run: a refusal is reported back to the agent, which decides what to do instead.
 */
export function respondToPendingActionMutationOptions() {
	return mutationOptions({
		mutationKey: ["sessions", "respond-to-pending-action"],
		mutationFn: async ({
			sessionId,
			actionId,
		}: {
			sessionId: string;
			actionId: string;
			response: PendingActionResponse;
		}) => {
			await delay(200);
			const index = SESSIONS.findIndex((s) => s.id === sessionId);
			const session = SESSIONS[index];
			// Already resolved elsewhere (another window, the session view): nothing to do.
			if (!session || session.pendingAction?.id !== actionId) return;
			SESSIONS[index] = {
				...session,
				pendingAction: null,
				runStatus: "running",
				updatedAt: new Date().toISOString(),
			};
		},
		// Prefix match: refreshes the list and this session's own query.
		onSuccess: (_data, _variables, _onMutateResult, { client }) =>
			client.invalidateQueries({ queryKey: ["sessions"] }),
	});
}
