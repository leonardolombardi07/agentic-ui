import { useQuery } from "@tanstack/react-query";
import { isNotFound, Link } from "@tanstack/react-router";
import { ChevronRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { agentQueryOptions } from "@/lib/api/agents/queries";
import { sessionQueryOptions } from "@/lib/api/sessions/queries";
import { Composer } from "../../composer";
import { useWorkspaceCommands } from "../commands";
import type { SessionTab } from "../model";
import { workspace } from "../store";

/** Placeholder: header, breadcrumb and composer. Messages and right panel come later. */
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

	return (
		<div className="flex h-full flex-col" data-testid="session-view">
			<div className="flex flex-1 flex-col gap-2 p-6">
				<nav
					aria-label="Breadcrumb"
					className="flex items-center gap-1 text-sm text-muted-foreground"
				>
					{session.agentId ? (
						<AgentCrumb agentId={session.agentId} />
					) : (
						<span>No agent</span>
					)}
					<ChevronRightIcon className="size-3.5" />
					<span className="text-foreground">{session.title}</span>
				</nav>
				<h1 className="text-2xl font-medium">Session: {session.title}</h1>
				<p className="text-sm text-muted-foreground">
					{session.isDraft
						? "Draft (not sent yet)"
						: `Run status: ${session.runStatus}`}
				</p>
			</div>
			<div className="sticky bottom-0 mx-auto w-full max-w-3xl px-4 pb-4">
				{/* Sending lands with messages; for now the composer just clears to show the round trip. */}
				<Composer
					draft={tab.composerDraft}
					onDraftChange={(composerDraft) =>
						workspace.updateTab({ groupId, tabId: tab.id }, { composerDraft })
					}
					defaultAgentId={session.agentId}
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
