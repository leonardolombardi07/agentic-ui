import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { cn } from "cn";
import { PlusIcon } from "lucide-react";
import { useRef } from "react";
import { z } from "zod";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { agentsListQueryOptions } from "@/lib/api/agents/queries";
import { sessionsListQueryOptions } from "@/lib/api/sessions/queries";
import type { Agent } from "@/lib/api/types/agent";
import type { Session } from "@/lib/api/types/session";
import { seo } from "@/lib/seo";
import { AgentIndicator } from "../-shared/agent-indicator";
import {
	describePendingAction,
	PendingActionIcon,
} from "../-shared/pending-action-icon";
import { useWorkspaceCommands } from "../-shared/workspace/commands";

const sortOptions = ["recent", "title"] as const;

const sortLabels: Record<(typeof sortOptions)[number], string> = {
	recent: "Recent",
	title: "Title",
};

export const Route = createFileRoute("/_authenticated/sessions/all")({
	validateSearch: z.object({
		q: z.string().optional().catch(undefined),
		sort: z.enum(sortOptions).default("recent").catch("recent"),
	}),
	loader: ({ context: { queryClient } }) =>
		Promise.all([
			queryClient.ensureQueryData(sessionsListQueryOptions()),
			queryClient.ensureQueryData(agentsListQueryOptions()),
		]),
	head: () => ({
		meta: seo({
			title: "All sessions",
			description: "Search and reopen any of your sessions with agents.",
		}),
	}),
	component: AllSessions,
});

/** Every session, where the side panel only shows the most recent. Search + sort live in the URL. */
function AllSessions() {
	const { q, sort } = Route.useSearch();
	const navigate = Route.useNavigate();
	const { data: sessions } = useSuspenseQuery(sessionsListQueryOptions());
	const { data: agents } = useSuspenseQuery(agentsListQueryOptions());
	const agentsById = new Map(agents.map((agent) => [agent.id, agent]));

	const terms = (q ?? "").toLowerCase().split(/\s+/).filter(Boolean);
	const filtered = sessions.filter((session) => {
		const agentName = getAgentName(session.agentId, agentsById);
		const haystack = `${session.title} ${agentName}`.toLowerCase();
		return terms.every((term) => haystack.includes(term));
	});
	const sorted = sortSessions(filtered, sort);

	return (
		<div
			className="mx-auto flex max-w-3xl flex-col gap-6 p-8"
			data-testid="all-sessions"
		>
			<div className="flex items-center justify-between gap-3">
				<h1 className="text-2xl font-medium">Sessions</h1>
				<Link
					to="/sessions/new"
					className={buttonVariants({ variant: "outline", size: "sm" })}
					data-testid="all-sessions-new"
				>
					<PlusIcon />
					New session
				</Link>
			</div>
			<div className="flex items-center gap-3">
				<Input
					type="search"
					aria-label="Search sessions"
					placeholder="Search sessions"
					value={q ?? ""}
					onChange={(event) =>
						void navigate({
							search: (prev) => ({
								...prev,
								q: event.target.value || undefined,
							}),
							replace: true,
						})
					}
					data-testid="all-sessions-search"
				/>
				<fieldset className="flex shrink-0 gap-1 text-sm">
					<legend className="sr-only">Sort</legend>
					{sortOptions.map((option) => (
						<Link
							key={option}
							from={Route.fullPath}
							search={(prev) => ({ ...prev, sort: option })}
							replace
							aria-current={sort === option ? "true" : undefined}
							className={cn(
								"rounded-md px-2 py-1 text-muted-foreground hover:bg-accent",
								sort === option && "bg-accent text-foreground",
							)}
							data-testid={`all-sessions-sort-${option}`}
						>
							{sortLabels[option]}
						</Link>
					))}
				</fieldset>
			</div>
			{sorted.length === 0 ? (
				<p
					className="py-12 text-center text-sm text-muted-foreground"
					data-testid="all-sessions-empty"
				>
					{terms.length > 0
						? `No sessions match "${q}".`
						: "No sessions yet. Start one with an agent."}
				</p>
			) : (
				<>
					<p className="text-sm text-muted-foreground">
						{sorted.length === 1 ? "1 session" : `${sorted.length} sessions`}
					</p>
					<ul
						className="flex flex-col divide-y divide-border border-y border-border"
						data-testid="all-sessions-list"
					>
						{sorted.map((session) => (
							<Row
								key={session.id}
								session={session}
								agentName={getAgentName(session.agentId, agentsById)}
							/>
						))}
					</ul>
				</>
			)}
		</div>
	);
}

function Row({ session, agentName }: { session: Session; agentName: string }) {
	const commands = useWorkspaceCommands();
	const rowRef = useRef<HTMLLIElement>(null);

	return (
		<li ref={rowRef}>
			<Link
				to="/sessions/$sessionId"
				params={{ sessionId: session.id }}
				className="flex items-center gap-3 px-2 py-3 hover:bg-accent"
				onClick={(event) => {
					// Ctrl/Cmd-click opens to the side, like the side panel rows.
					if (event.ctrlKey || event.metaKey) {
						event.preventDefault();
						commands.openToSide({ kind: "session", sessionId: session.id });
					}
				}}
				data-testid="all-sessions-item"
				data-session-id={session.id}
			>
				<AgentIndicator
					agentId={session.agentId}
					isRunning={session.runStatus === "running"}
					side="right"
					anchor={rowRef}
				/>
				<span className="min-w-0 flex-1">
					<span className="block truncate text-sm font-medium">
						{session.title}
					</span>
					<span className="block truncate text-xs text-muted-foreground">
						{agentName}
						{" - "}
						<time dateTime={session.updatedAt}>
							{formatRelative(session.updatedAt)}
						</time>
					</span>
				</span>
				{session.pendingAction ? (
					<>
						<PendingActionIcon action={session.pendingAction} />
						<span className="sr-only">
							{describePendingAction(session.pendingAction)}
						</span>
					</>
				) : null}
			</Link>
		</li>
	);
}

/** Same naming as `AgentIndicator`, so the list and its hover card agree. */
function getAgentName(agentId: string | null, agentsById: Map<string, Agent>) {
	if (agentId === null) return "Default agent";
	return agentsById.get(agentId)?.name ?? "Unknown agent";
}

function sortSessions(
	sessions: Session[],
	sort: (typeof sortOptions)[number],
): Session[] {
	if (sort === "title") {
		return [...sessions].sort((a, b) => a.title.localeCompare(b.title));
	}
	return [...sessions].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

const relativeFormat = new Intl.RelativeTimeFormat(undefined, {
	numeric: "auto",
});

const units: [Intl.RelativeTimeFormatUnit, number][] = [
	["year", 365 * 24 * 60 * 60],
	["month", 30 * 24 * 60 * 60],
	["week", 7 * 24 * 60 * 60],
	["day", 24 * 60 * 60],
	["hour", 60 * 60],
	["minute", 60],
];

/** "3 hours ago". Client-only route (ssr: false), so reading the clock can't mismatch. */
function formatRelative(iso: string): string {
	const seconds = (new Date(iso).getTime() - Date.now()) / 1000;
	for (const [unit, size] of units) {
		if (Math.abs(seconds) >= size) {
			return relativeFormat.format(Math.round(seconds / size), unit);
		}
	}
	return "just now";
}
