import { useMutation } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { CheckIcon, PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import {
	addAgentMutationOptions,
	removeAgentMutationOptions,
} from "@/lib/api/agents/queries";
import type { Agent } from "@/lib/api/types/agent";
import { AgentAvatar } from "../../-shared/agent-avatar";

const installFormat = new Intl.NumberFormat();

type AgentCardProps = {
	agent: Agent;
	/** Whether the agent is already in the user's agents. */
	isAdded: boolean;
};

/**
 * The whole card opens the agent: the name link is stretched over it (`after:inset-0`),
 * so the Add button can sit on top without nesting interactive elements.
 */
export function AgentCard({ agent, isAdded }: AgentCardProps) {
	return (
		<li
			className="group/card relative flex flex-col gap-3 rounded-card border border-border bg-card p-5 transition-colors duration-120 hover:bg-control-hover"
			data-testid="agent-card"
			data-agent-id={agent.id}
		>
			<div className="flex items-center gap-3">
				<AgentAvatar agent={agent} className="size-10" />
				<h2 className="min-w-0 flex-1 truncate text-[15px] font-semibold">
					<Link
						to="/agents/$agentId"
						params={{ agentId: agent.id }}
						className="text-foreground outline-none after:absolute after:inset-0 after:rounded-card focus-visible:after:ring-1 focus-visible:after:ring-ring"
						data-testid="agent-card-link"
					>
						{agent.name}
					</Link>
				</h2>
				<AddButton agent={agent} isAdded={isAdded} />
			</div>
			<p className="line-clamp-2 text-sm text-muted-foreground">
				{agent.description}
			</p>
			<p className="mt-auto text-xs text-muted-foreground">
				{agent.publisher} &middot; {installFormat.format(agent.installCount)}{" "}
				{agent.installCount === 1 ? "install" : "installs"}
			</p>
		</li>
	);
}

function AddButton({ agent, isAdded }: AgentCardProps) {
	const add = useMutation(addAgentMutationOptions());
	const remove = useMutation(removeAgentMutationOptions());
	const isPending = add.isPending || remove.isPending;

	if (isAdded) {
		return (
			<Tooltip>
				<TooltipTrigger
					render={
						<Button
							variant="ghost"
							size="sm"
							// Above the stretched link, so clicks don't open the agent.
							className="relative z-10 text-success hover:text-success"
							aria-label={`Remove ${agent.name} from your agents`}
							disabled={isPending}
							onClick={() => remove.mutate(agent.id)}
							data-testid="agent-card-remove"
						/>
					}
				>
					<CheckIcon />
					Added
				</TooltipTrigger>
				<TooltipContent>Remove from your agents</TooltipContent>
			</Tooltip>
		);
	}

	return (
		<Tooltip>
			<TooltipTrigger
				render={
					<Button
						variant="outline"
						size="sm"
						className="relative z-10"
						aria-label={`Add ${agent.name} to your agents`}
						disabled={isPending}
						onClick={() => add.mutate(agent.id)}
						data-testid="agent-card-add"
					/>
				}
			>
				<PlusIcon />
				Add
			</TooltipTrigger>
			<TooltipContent>Add to your agents</TooltipContent>
		</Tooltip>
	);
}
