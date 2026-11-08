import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { agentQueryOptions } from "@/lib/api/agents/queries";
import { AgentAvatar } from "../../../../agent-avatar";
import type { PaneProps } from "./registry";

/** The agent leading this session: what it is and what it can use. */
export function AgentPane({ session }: PaneProps) {
	if (!session.leadAgentId) {
		return (
			<div className="flex flex-col gap-1 p-4 text-sm">
				<p className="font-medium">Default agent</p>
				<p className="text-muted-foreground">
					The built-in agent. Pick another one in the composer; it takes over
					from the next message.
				</p>
			</div>
		);
	}
	return <LeadAgent agentId={session.leadAgentId} />;
}

function LeadAgent({ agentId }: { agentId: string }) {
	const { data: agent, isPending } = useQuery(agentQueryOptions(agentId));
	if (isPending)
		return <p className="p-4 text-sm text-muted-foreground">Loading...</p>;
	if (!agent)
		return (
			<p className="p-4 text-sm text-muted-foreground">
				This agent is no longer available.
			</p>
		);

	return (
		<div className="flex flex-col gap-5 p-4 text-sm" data-testid="pane-agent">
			<div className="flex items-start gap-3">
				<AgentAvatar agent={agent} className="size-9" />
				<div className="min-w-0 flex-1">
					<p className="truncate font-medium">{agent.name}</p>
					<p className="text-xs text-muted-foreground">
						{agent.publisher} - v{agent.version}
					</p>
				</div>
			</div>
			<p className="text-muted-foreground">{agent.description}</p>
			<Link
				to="/agents/$agentId"
				params={{ agentId }}
				className="w-fit text-xs text-brand hover:underline"
			>
				Open agent page
			</Link>
			<Section title="Skills" empty="No skills.">
				{agent.skills.map((skill) => (
					<li key={skill.id}>
						<p>{skill.name}</p>
						<p className="text-xs text-muted-foreground">{skill.description}</p>
					</li>
				))}
			</Section>
			<Section title="Tools" empty="No tools.">
				{agent.tools.map((tool) => (
					<li key={tool.id}>
						<p>
							{tool.name}{" "}
							<span className="text-xs text-muted-foreground">
								{tool.source}
							</span>
						</p>
						<p className="text-xs text-muted-foreground">{tool.description}</p>
					</li>
				))}
			</Section>
		</div>
	);
}

function Section({
	title,
	empty,
	children,
}: {
	title: string;
	empty: string;
	children: React.ReactNode[];
}) {
	return (
		<section className="flex flex-col gap-2">
			<h3 className="text-xs font-medium text-muted-foreground uppercase">
				{title}
			</h3>
			{children.length === 0 ? (
				<p className="text-xs text-muted-foreground">{empty}</p>
			) : (
				<ul className="flex flex-col gap-2">{children}</ul>
			)}
		</section>
	);
}
