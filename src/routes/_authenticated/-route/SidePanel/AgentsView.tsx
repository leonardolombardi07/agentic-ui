import { useSuspenseQuery } from "@tanstack/react-query";
import { Link, useParams } from "@tanstack/react-router";
import { cn } from "cn";
import { ArrowLeftIcon, MessageSquarePlusIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { agentsListQueryOptions } from "@/lib/api/agents/queries";
import { sessionsListQueryOptions } from "@/lib/api/sessions/queries";
import type { Agent } from "@/lib/api/types/agent";
import { AgentAvatar } from "../../-shared/agent-avatar";
import { useWorkspaceCommands } from "../../-shared/workspace/commands";
import { useFocusedSessionId } from "./focused";
import { Header } from "./Header";
import { SessionRow } from "./SessionRow";

/**
 * The agents list, or, while an agent's page is focused, that agent's sessions (like
 * drilling into a folder). Back returns to the list without closing the agent's tab.
 */
export function AgentsView() {
	const { data: agents } = useSuspenseQuery(agentsListQueryOptions());
	// The URL is the focused tab, so this is the agent page on screen (if any).
	const currentAgentId = useParams({
		strict: false,
		select: (p) => p.agentId ?? null,
	});
	/*
	 * The agent the user backed out of. Keyed by id instead of a boolean so opening a
	 * different agent drills in again without an effect to reset it.
	 */
	const [backedOutOf, setBackedOutOf] = useState<string | null>(null);
	const current = agents.find((a) => a.id === currentAgentId);

	if (current && backedOutOf !== current.id) {
		return (
			<AgentSessions
				agent={current}
				onBack={() => setBackedOutOf(current.id)}
			/>
		);
	}
	return (
		<AgentList
			agents={agents}
			currentAgentId={currentAgentId}
			onOpen={() => setBackedOutOf(null)}
		/>
	);
}

function AgentList({
	agents,
	currentAgentId,
	onOpen,
}: {
	agents: Agent[];
	currentAgentId: string | null;
	/** Called when a row is clicked, so re-opening the current agent drills in again. */
	onOpen: () => void;
}) {
	const commands = useWorkspaceCommands();
	return (
		<>
			<Header title="Agents" />
			<ul className="flex-1 overflow-y-auto p-2" data-testid="agents-list">
				{agents.map((agent) => (
					<li key={agent.id} className="group/item relative">
						<Link
							to="/agents/$agentId"
							params={{ agentId: agent.id }}
							className={cn(
								"flex items-center gap-2.5 rounded-md py-1.5 pr-9 pl-2 text-sm text-muted-foreground hover:bg-sidebar-accent hover:text-foreground",
								agent.id === currentAgentId &&
									"bg-sidebar-accent text-foreground",
							)}
							onClick={(event) => {
								// Ctrl/Cmd-click opens to the side, like session rows.
								if (event.ctrlKey || event.metaKey) {
									event.preventDefault();
									commands.openToSide({ kind: "agent", agentId: agent.id });
								}
								onOpen();
							}}
							data-testid="agents-list-item"
						>
							<AgentAvatar agent={agent} className="size-7" />
							<span className="min-w-0 flex-1">
								<span className="block truncate font-medium">{agent.name}</span>
								<span className="block truncate text-xs">
									{agent.description}
								</span>
							</span>
						</Link>
						<NewSessionButton
							agent={agent}
							className="absolute top-2 right-1.5 opacity-0 group-hover/item:opacity-100 focus-visible:opacity-100"
							testId="agents-list-new-session"
						/>
					</li>
				))}
			</ul>
			<div className="border-t border-sidebar-border p-2">
				<Link
					to="/agents"
					className="block rounded-md px-2 py-1.5 text-sm text-brand-text hover:bg-sidebar-accent"
					data-testid="agents-browse-all"
				>
					Browse all agents
				</Link>
			</div>
		</>
	);
}

function AgentSessions({
	agent,
	onBack,
}: {
	agent: Agent;
	onBack: () => void;
}) {
	const { data: sessions } = useSuspenseQuery(sessionsListQueryOptions());
	const focusedSessionId = useFocusedSessionId();
	const own = sessions.filter((s) => s.agentId === agent.id);

	return (
		<>
			<Header
				leading={
					<Tooltip>
						<TooltipTrigger
							render={
								<Button
									variant="ghost"
									size="icon-sm"
									aria-label="Back to all agents"
									onClick={onBack}
									data-testid="agent-sessions-back"
								/>
							}
						>
							<ArrowLeftIcon />
						</TooltipTrigger>
						<TooltipContent>Back to all agents</TooltipContent>
					</Tooltip>
				}
				title={
					<>
						<AgentAvatar agent={agent} className="size-4" />
						<span className="truncate">{agent.name}</span>
					</>
				}
				actions={<NewSessionButton agent={agent} testId="agent-sessions-new" />}
			/>
			{own.length === 0 ? (
				<p
					className="p-4 text-sm text-muted-foreground"
					data-testid="agent-sessions-empty"
				>
					No sessions with {agent.name} yet.
				</p>
			) : (
				<ul
					className="flex-1 overflow-y-auto p-2"
					aria-label={`Sessions with ${agent.name}`}
					data-testid="agent-sessions-list"
				>
					{own.map((session) => (
						<SessionRow
							key={session.id}
							session={session}
							isFocused={session.id === focusedSessionId}
						/>
					))}
				</ul>
			)}
		</>
	);
}

function NewSessionButton({
	agent,
	className,
	testId,
}: {
	agent: Agent;
	className?: string;
	testId: string;
}) {
	return (
		<Tooltip>
			<TooltipTrigger
				render={
					<Button
						variant="ghost"
						size="icon-xs"
						aria-label={`New session with ${agent.name}`}
						className={className}
						render={<Link to="/sessions/new" search={{ agentId: agent.id }} />}
						nativeButton={false}
						data-testid={testId}
					/>
				}
			>
				<MessageSquarePlusIcon />
			</TooltipTrigger>
			<TooltipContent>New session with {agent.name}</TooltipContent>
		</Tooltip>
	);
}
