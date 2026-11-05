import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ArrowUpIcon } from "lucide-react";
import { useState } from "react";
import {
	PromptInput,
	PromptInputAction,
	PromptInputEditor,
} from "@/components/chat/prompt-input";
import { Button } from "@/components/ui/button";
import {
	respondToPendingActionMutationOptions,
	sessionsListQueryOptions,
} from "@/lib/api/sessions/queries";
import {
	getPendingAction,
	type PendingAction,
	type PendingActionResponse,
	type Session,
} from "@/lib/api/types/session";
import { AgentIndicator } from "../../-shared/agent-indicator";
import { PendingActionIcon } from "../../-shared/pending-action-icon";

/** A session paused on the user, with the action the UI shows first. */
type Actionable = { session: Session; action: PendingAction };

function toActionable(sessions: Session[]): Actionable[] {
	return sessions.flatMap((session) => {
		const action = getPendingAction(session);
		return action ? [{ session, action }] : [];
	});
}

/** Sessions paused on the user, answerable in place so they don't have to open each one. */
export function NeedsAction() {
	const { data: sessions } = useSuspenseQuery({
		...sessionsListQueryOptions(),
		select: toActionable,
	});

	return (
		<section
			className="flex flex-col gap-3"
			aria-labelledby="needs-action-title"
			data-testid="needs-action"
		>
			<h2
				id="needs-action-title"
				className="flex items-baseline gap-2 text-sm font-medium text-muted-foreground"
			>
				Needs action
				{sessions.length > 0 ? (
					<span className="text-xs font-normal">{sessions.length}</span>
				) : null}
			</h2>
			{sessions.length === 0 ? (
				<p
					className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground"
					data-testid="needs-action-empty"
				>
					You're all caught up. Agents will show up here when they need your
					approval or an answer.
				</p>
			) : (
				<ul className="flex flex-col gap-2">
					{sessions.map(({ session, action }) => (
						<Item
							// Keyed by action too: a new action on the same session starts with a fresh reply.
							key={`${session.id}:${action.id}`}
							session={session}
							action={action}
						/>
					))}
				</ul>
			)}
		</section>
	);
}

function Item({ session, action }: Actionable) {
	const respond = useMutation(respondToPendingActionMutationOptions());

	function handleRespond(response: PendingActionResponse) {
		respond.mutate({ sessionId: session.id, actionId: action.id, response });
	}

	return (
		<li
			className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4"
			data-testid="needs-action-item"
			data-session-id={session.id}
		>
			<div className="flex min-w-0 items-center gap-2 text-sm">
				<AgentIndicator agentId={session.leadAgentId} side="bottom" />
				<Link
					to="/sessions/$sessionId"
					params={{ sessionId: session.id }}
					className="truncate font-medium hover:underline"
					data-testid="needs-action-open"
				>
					{session.title}
				</Link>
				<span className="ml-auto flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
					<PendingActionIcon action={action} />
					{action.kind === "approval" ? "Approval" : "Question"}
				</span>
			</div>
			{action.kind === "approval" ? (
				<ApprovalRequest
					action={action}
					isPending={respond.isPending}
					onRespond={handleRespond}
				/>
			) : (
				<QuestionRequest
					action={action}
					isPending={respond.isPending}
					onRespond={handleRespond}
				/>
			)}
			{respond.isError ? (
				<p role="alert" className="text-xs text-destructive-foreground">
					Couldn't send your response. Try again.
				</p>
			) : null}
		</li>
	);
}

type RequestProps<TKind extends PendingAction["kind"]> = {
	action: Extract<PendingAction, { kind: TKind }>;
	isPending: boolean;
	onRespond: (response: PendingActionResponse) => void;
};

function ApprovalRequest({
	action,
	isPending,
	onRespond,
}: RequestProps<"approval">) {
	return (
		<div className="flex flex-wrap items-end justify-between gap-3">
			<div className="flex min-w-0 flex-col gap-1 text-sm">
				<p>
					<span className="text-muted-foreground">Wants to use </span>
					<span className="rounded bg-muted px-1.5 py-0.5 text-xs font-medium">
						{action.toolName}
					</span>
				</p>
				<p className="text-muted-foreground">{action.description}</p>
			</div>
			<div className="flex shrink-0 gap-2">
				<Button
					variant="secondary"
					size="sm"
					disabled={isPending}
					onClick={() => onRespond({ kind: "refuse" })}
					data-testid="needs-action-refuse"
				>
					Refuse
				</Button>
				<Button
					size="sm"
					disabled={isPending}
					onClick={() => onRespond({ kind: "approve" })}
					data-testid="needs-action-approve"
				>
					Approve
				</Button>
			</div>
		</div>
	);
}

/** A compact prompt input: the reply goes to the paused run, not into a new session. */
function QuestionRequest({
	action,
	isPending,
	onRespond,
}: RequestProps<"question">) {
	const [reply, setReply] = useState("");
	const canSend = reply.trim().length > 0 && !isPending;

	function handleSubmit() {
		if (!canSend) return;
		onRespond({ kind: "answer", text: reply.trim() });
	}

	return (
		<div className="flex flex-col gap-2">
			<p className="text-sm">{action.question}</p>
			<PromptInput
				value={reply}
				onValueChange={setReply}
				onSubmit={handleSubmit}
				disabled={isPending}
				maxHeight={120}
				className="flex-row items-end gap-1 rounded-lg p-1"
				data-testid="needs-action-reply"
			>
				<div className="min-w-0 flex-1">
					<PromptInputEditor
						placeholder="Reply..."
						aria-label="Reply to the agent"
						className="py-1 text-sm leading-5"
						data-testid="needs-action-reply-editor"
					/>
				</div>
				<PromptInputAction tooltip="Send reply (Enter)">
					<Button
						size="icon-sm"
						aria-label="Send reply"
						disabled={!canSend}
						onClick={handleSubmit}
						data-testid="needs-action-reply-send"
					>
						<ArrowUpIcon />
					</Button>
				</PromptInputAction>
			</PromptInput>
		</div>
	);
}
