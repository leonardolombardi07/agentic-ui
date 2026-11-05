import { useMutation, useQuery } from "@tanstack/react-query";
import { isNotFound, Link } from "@tanstack/react-router";
import { ChevronRightIcon } from "lucide-react";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { agentQueryOptions } from "@/lib/api/agents/queries";
import {
	sessionQueryOptions,
	updateSessionMutationOptions,
} from "@/lib/api/sessions/queries";
import type { ClientSession } from "@/lib/api/types/session";
import { Composer, type ComposerMessage } from "../../../composer";
import { takeFirstMessage } from "../../../first-message";
import { useWorkspaceCommands } from "../../commands";
import type { SessionTab } from "../../model";
import { workspace } from "../../store";
import { Messages } from "./Messages";
import { useSessionChat } from "./use-session-chat";

/** A session tab: breadcrumb, transcript and composer. The right panel comes later. */
export function SessionView({
	tab,
	groupId,
}: {
	tab: SessionTab;
	groupId: string;
}) {
	const commands = useWorkspaceCommands();
	const {
		data: session,
		error,
		isPending,
	} = useQuery(sessionQueryOptions(tab.sessionId));

	if (isNotFound(error)) {
		/* Persisted tabs can point at sessions deleted elsewhere. Validated lazily, not up front. */
		return (
			<div
				className="flex flex-col items-start gap-3 p-6"
				data-testid="session-not-found"
			>
				<h1 className="text-xl font-medium">Session not found</h1>
				<Button
					variant="secondary"
					onClick={() => commands.closeTab({ groupId, tabId: tab.id })}
				>
					Close tab
				</Button>
			</div>
		);
	}
	if (isPending)
		return <p className="p-6 text-sm text-muted-foreground">Loading...</p>;
	if (!session) return null;

	return <SessionChat session={session} tab={tab} groupId={groupId} />;
}

/** Split out so the chat hook only mounts once the session is known. */
function SessionChat({
	session,
	tab,
	groupId,
}: {
	session: ClientSession;
	tab: SessionTab;
	groupId: string;
}) {
	const chat = useSessionChat(session);
	const update = useMutation(updateSessionMutationOptions());

	// A session started from Home or an agent page arrives with its first message.
	const sentFirst = useRef(false);
	useEffect(() => {
		// StrictMode runs effects twice in dev; the message must go out once.
		if (sentFirst.current) return;
		sentFirst.current = true;
		const text = takeFirstMessage(session.id);
		if (text) void chat.send(text);
	}, [chat.send, session.id]);

	function handleSend(message: ComposerMessage) {
		void chat.send(message.text);
	}

	return (
		<div className="flex h-full flex-col" data-testid="session-view">
			<nav
				aria-label="Breadcrumb"
				className="flex items-center gap-1 border-b border-border px-4 py-2 text-sm text-muted-foreground"
			>
				{session.leadAgentId ? (
					<AgentCrumb agentId={session.leadAgentId} />
				) : (
					<span>Default agent</span>
				)}
				<ChevronRightIcon aria-hidden className="size-3.5" />
				<h1 className="truncate text-foreground">{session.title}</h1>
			</nav>
			<Messages
				messages={chat.messages}
				isRunning={chat.isRunning}
				emptyState={
					chat.isHydrating ? (
						<p className="text-sm text-muted-foreground">Loading messages...</p>
					) : (
						<p
							className="py-12 text-center text-sm text-muted-foreground"
							data-testid="messages-empty"
						>
							Send a message to start.
						</p>
					)
				}
				footer={
					chat.errorMessage ? (
						<div
							role="alert"
							className="flex items-center gap-3 rounded-lg border border-border p-3 text-sm"
							data-testid="chat-error"
						>
							<span className="min-w-0 flex-1 text-destructive-foreground">
								{chat.errorMessage}
							</span>
							{chat.messages.length > 0 ? (
								<Button
									variant="secondary"
									size="sm"
									onClick={() => void chat.retry()}
									data-testid="chat-retry"
								>
									Retry
								</Button>
							) : null}
						</div>
					) : null
				}
			/>
			<div className="mx-auto w-full max-w-3xl px-4 pb-4">
				<Composer
					draft={tab.composerDraft}
					onDraftChange={(composerDraft) =>
						workspace.updateTab({ groupId, tabId: tab.id }, { composerDraft })
					}
					defaultAgentId={session.leadAgentId}
					defaultSettings={session.settings}
					// Saved on the session; a running reply keeps its agent and model.
					onAgentIdChange={(leadAgentId) =>
						update.mutate({ sessionId: session.id, patch: { leadAgentId } })
					}
					onSettingsChange={(settings) =>
						update.mutate({ sessionId: session.id, patch: { settings } })
					}
					onSend={handleSend}
					isRunning={chat.isRunning}
					onStop={chat.stop}
				/>
			</div>
		</div>
	);
}

function AgentCrumb({ agentId }: { agentId: string }) {
	const { data: agent } = useQuery(agentQueryOptions(agentId));
	return (
		<Link
			to="/agents/$agentId"
			params={{ agentId }}
			className="hover:text-foreground hover:underline"
		>
			{agent?.name ?? agentId}
		</Link>
	);
}
