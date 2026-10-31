import { useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { cn } from "cn";
import { SparklesIcon } from "lucide-react";
import { Suspense } from "react";
import { buttonVariants } from "@/components/ui/button";
import {
	HoverCard,
	HoverCardContent,
	HoverCardTrigger,
} from "@/components/ui/hover-card";
import { agentsListQueryOptions } from "@/lib/api/agents/queries";
import type { Agent } from "@/lib/api/types/agent";
import { AgentAvatar } from "./agent-avatar";

type AgentIndicatorProps = {
	/** `null` is the Default agent. */
	agentId: string | null;
	/** Spins a ring around the dot, so one glyph carries both "who" and "busy". */
	isRunning?: boolean;
	/** Where the card opens: `right` next to the sidebar, `bottom` under tabs. */
	side?: "right" | "bottom";
	/** Position the card against this instead of the dot, e.g. the whole sidebar row so it doesn't cover titles. */
	anchor?: React.RefObject<Element | null>;
};

/**
 * A dot in the agent's color for session rows and tabs. Hovering it opens a card
 * with the agent, so the list stays dense but the "who did this" is one hover away.
 */
export function AgentIndicator(props: AgentIndicatorProps) {
	return (
		// Own boundary: a row never waits on the agents list, and SSR streams the resolved dot.
		<Suspense
			fallback={
				<span className="relative -m-1 flex size-5 shrink-0 items-center justify-center p-1">
					<Dot color={undefined} isRunning={props.isRunning ?? false} />
				</span>
			}
		>
			<Indicator {...props} />
		</Suspense>
	);
}

function Indicator({
	agentId,
	isRunning = false,
	side = "bottom",
	anchor,
}: AgentIndicatorProps) {
	const { data: agent } = useSuspenseQuery({
		...agentsListQueryOptions(),
		select: (agents) => agents.find((a) => a.id === agentId) ?? null,
	});
	const isDefault = agentId === null;
	const name = isDefault ? "Default agent" : (agent?.name ?? "Unknown agent");

	return (
		<HoverCard>
			<HoverCardTrigger
				// A span, not the default <a>: rows and tabs are already links/buttons.
				render={<span />}
				className="relative -m-1 flex size-5 shrink-0 items-center justify-center p-1"
				data-testid="agent-indicator"
				data-agent-id={agentId ?? "default"}
			>
				<Dot color={agent?.color} isRunning={isRunning} />
				<span className="sr-only">
					{isRunning ? `${name}, running.` : `${name}.`}
				</span>
			</HoverCardTrigger>
			<HoverCardContent
				side={side}
				anchor={anchor}
				// React events bubble through portals: keep card clicks out of the row's link/tab button.
				onClick={(event) => event.stopPropagation()}
				data-testid="agent-indicator-card"
			>
				{isDefault ? (
					<DefaultAgentCard isRunning={isRunning} />
				) : agent ? (
					<AgentCard agent={agent} isRunning={isRunning} />
				) : (
					<p className="text-sm text-muted-foreground">
						This agent is no longer available.
					</p>
				)}
			</HoverCardContent>
		</HoverCard>
	);
}

/** Filled in the agent's color; hollow for the Default agent (and while loading). */
function Dot({
	color,
	isRunning,
}: {
	color: string | undefined;
	isRunning: boolean;
}) {
	return (
		<span
			aria-hidden
			className={cn(
				"relative flex size-3.5 items-center justify-center",
				!color && "text-muted-foreground",
			)}
			style={color ? { color } : undefined}
		>
			{isRunning ? (
				<span className="absolute inset-0 animate-spin rounded-full border-[1.5px] border-current border-t-transparent" />
			) : null}
			<span
				className={cn(
					"size-2 rounded-full",
					color ? "bg-current" : "border border-current",
				)}
			/>
		</span>
	);
}

function AgentCard({ agent, isRunning }: { agent: Agent; isRunning: boolean }) {
	return (
		<div className="flex flex-col gap-3">
			<div className="flex items-center gap-3">
				<AgentAvatar agent={agent} className="size-9" />
				<div className="min-w-0">
					<p className="truncate text-sm font-semibold">{agent.name}</p>
					<p className="truncate text-xs text-muted-foreground">
						{agent.publisher}
					</p>
				</div>
			</div>
			<p className="line-clamp-3 text-sm text-muted-foreground">
				{agent.description}
			</p>
			{isRunning ? <RunningNote color={agent.color} /> : null}
			<div className="flex gap-2 border-t border-border pt-3">
				<Link
					to="/agents/$agentId"
					params={{ agentId: agent.id }}
					className={buttonVariants({ variant: "secondary", size: "xs" })}
					data-testid="agent-indicator-view"
				>
					View agent
				</Link>
				<Link
					to="/sessions/new"
					search={{ agentId: agent.id }}
					className={buttonVariants({ variant: "ghost", size: "xs" })}
					data-testid="agent-indicator-new-session"
				>
					New session
				</Link>
			</div>
		</div>
	);
}

function DefaultAgentCard({ isRunning }: { isRunning: boolean }) {
	return (
		<div className="flex flex-col gap-3">
			<div className="flex items-center gap-3">
				<span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-control-active text-muted-foreground">
					<SparklesIcon className="size-4" />
				</span>
				<p className="text-sm font-semibold">Default agent</p>
			</div>
			<p className="text-sm text-muted-foreground">
				General-purpose agent. Pick a specialized one from the composer.
			</p>
			{isRunning ? <RunningNote color={undefined} /> : null}
		</div>
	);
}

function RunningNote({ color }: { color: string | undefined }) {
	return (
		<p className="flex items-center gap-2 text-xs text-foreground">
			<span
				aria-hidden
				className={cn(
					"size-1.5 animate-pulse rounded-full",
					color ? undefined : "bg-muted-foreground",
				)}
				style={color ? { backgroundColor: color } : undefined}
			/>
			Working on this session
		</p>
	);
}
