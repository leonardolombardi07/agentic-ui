import { useMutation, useQuery } from "@tanstack/react-query";
import { isNotFound } from "@tanstack/react-router";
import { CheckIcon, PlusIcon, SparklesIcon, WrenchIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import {
	addAgentMutationOptions,
	agentQueryOptions,
	myAgentsListQueryOptions,
	removeAgentMutationOptions,
} from "@/lib/api/agents/queries";
import type { Agent, AgentSkill, AgentTool } from "@/lib/api/types/agent";
import { AgentAvatar } from "../../agent-avatar";
import { Composer } from "../../composer";
import { useStartSession } from "../../use-start-session";
import { useWorkspaceCommands } from "../commands";
import type { AgentTab } from "../model";
import { workspace } from "../store";

const numberFormat = new Intl.NumberFormat();
const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" });

/**
 * An agent's page as an editor tab: what it is, what it can do (skills, tools), and a
 * composer at the bottom. Its sessions live in the side panel's Agents view, not here.
 */
export function AgentView({
	tab,
	groupId,
}: {
	tab: AgentTab;
	groupId: string;
}) {
	const commands = useWorkspaceCommands();
	const {
		data: agent,
		error,
		isPending,
	} = useQuery(agentQueryOptions(tab.agentId));

	if (isNotFound(error)) {
		/* Persisted tabs can point at agents removed elsewhere. */
		return (
			<div
				className="flex flex-col items-start gap-3 p-6"
				data-testid="agent-not-found"
			>
				<h1 className="text-xl font-medium">Agent not found</h1>
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
	if (!agent) return null;

	return (
		<div className="flex min-h-full flex-col" data-testid="agent-view">
			<div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-8 pt-8 pb-4">
				<Header agent={agent} />
				<div className="grid grid-cols-1 gap-8 md:grid-cols-[minmax(0,1fr)_13rem]">
					<div className="flex min-w-0 flex-col gap-8">
						<Section title="Skills" count={agent.skills.length}>
							<SkillList skills={agent.skills} />
						</Section>
						<Section title="Tools" count={agent.tools.length}>
							<ToolList tools={agent.tools} />
						</Section>
					</div>
					<Details agent={agent} />
				</div>
			</div>
			<AgentComposer agent={agent} tab={tab} groupId={groupId} />
		</div>
	);
}

function Header({ agent }: { agent: Agent }) {
	return (
		<header className="flex items-start gap-5">
			<AgentAvatar agent={agent} className="size-16" />
			<div className="flex min-w-0 flex-1 flex-col gap-2">
				<div className="flex items-start justify-between gap-4">
					<div className="min-w-0">
						<h1 className="truncate text-2xl font-semibold">{agent.name}</h1>
						<p className="text-sm text-muted-foreground">{agent.description}</p>
					</div>
					<AddButton agent={agent} />
				</div>
				<p
					className="text-sm whitespace-pre-line text-muted-foreground"
					data-testid="agent-instructions"
				>
					{agent.instructions}
				</p>
			</div>
		</header>
	);
}

function AddButton({ agent }: { agent: Agent }) {
	const { data: myAgents } = useQuery(myAgentsListQueryOptions());
	const add = useMutation(addAgentMutationOptions());
	const remove = useMutation(removeAgentMutationOptions());
	// Unknown until the list loads: render nothing rather than a button that flips.
	if (!myAgents) return null;
	const isAdded = myAgents.some((a) => a.id === agent.id);
	const isPending = add.isPending || remove.isPending;

	if (isAdded) {
		return (
			<Tooltip>
				<TooltipTrigger
					render={
						<Button
							variant="ghost"
							size="sm"
							className="shrink-0 text-success hover:text-success"
							aria-label={`Remove ${agent.name} from your agents`}
							disabled={isPending}
							onClick={() => remove.mutate(agent.id)}
							data-testid="agent-remove"
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
		<Button
			variant="secondary"
			size="sm"
			className="shrink-0"
			disabled={isPending}
			onClick={() => add.mutate(agent.id)}
			data-testid="agent-add"
		>
			<PlusIcon />
			Add agent
		</Button>
	);
}

function Section({
	title,
	count,
	children,
}: {
	title: string;
	count: number;
	children: ReactNode;
}) {
	return (
		<section className="flex flex-col gap-3">
			<h2 className="flex items-baseline gap-2 text-base font-semibold">
				{title}
				<span className="text-xs font-normal text-muted-foreground">
					{count}
				</span>
			</h2>
			{children}
		</section>
	);
}

function SkillList({ skills }: { skills: AgentSkill[] }) {
	if (skills.length === 0)
		return <p className="text-sm text-muted-foreground">No skills.</p>;
	return (
		<ul className="flex flex-col gap-1" data-testid="agent-skills">
			{skills.map((skill) => (
				<Item
					key={skill.id}
					icon={<SparklesIcon />}
					title={skill.name}
					description={skill.description}
					meta={`Version ${skill.version}`}
				/>
			))}
		</ul>
	);
}

function ToolList({ tools }: { tools: AgentTool[] }) {
	if (tools.length === 0)
		return <p className="text-sm text-muted-foreground">No tools.</p>;
	return (
		<ul className="flex flex-col gap-1" data-testid="agent-tools">
			{tools.map((tool) => (
				<Item
					key={tool.id}
					icon={<WrenchIcon />}
					title={tool.name}
					description={tool.description}
					meta={tool.source}
				/>
			))}
		</ul>
	);
}

function Item({
	icon,
	title,
	description,
	meta,
}: {
	icon: ReactNode;
	title: string;
	description: string;
	meta: string;
}) {
	return (
		<li className="flex items-start gap-3 rounded-lg p-2">
			<span
				aria-hidden
				className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground [&_svg]:size-4"
			>
				{icon}
			</span>
			<div className="min-w-0 flex-1">
				<p className="flex items-baseline gap-2 text-sm font-medium">
					<span className="truncate">{title}</span>
					<span className="shrink-0 text-xs font-normal text-muted-foreground">
						{meta}
					</span>
				</p>
				<p className="text-sm text-muted-foreground">{description}</p>
			</div>
		</li>
	);
}

function Details({ agent }: { agent: Agent }) {
	const rows: [string, string][] = [
		["Publisher", agent.publisher],
		["Category", agent.category],
		["Version", String(agent.version)],
		["Updated", dateFormat.format(new Date(agent.updatedAt))],
		[
			"Installs",
			`${numberFormat.format(agent.installCount)} ${agent.installCount === 1 ? "install" : "installs"}`,
		],
	];
	return (
		<dl
			className="flex flex-col gap-4 border-border md:border-l md:pl-6"
			data-testid="agent-details"
		>
			{rows.map(([label, value]) => (
				<div key={label} className="flex flex-col gap-0.5">
					<dt className="text-xs text-muted-foreground">{label}</dt>
					<dd className="text-sm font-medium">{value}</dd>
				</div>
			))}
		</dl>
	);
}

/** Sending starts a session with the chosen agent and opens it. */
function AgentComposer({
	agent,
	tab,
	groupId,
}: {
	agent: Agent;
	tab: AgentTab;
	groupId: string;
}) {
	const startSession = useStartSession();

	return (
		// The fade keeps scrolled content from showing hard-edged under the composer.
		<div className="sticky bottom-0 bg-linear-to-t from-background from-70% to-transparent pt-6">
			<div className="mx-auto w-full max-w-3xl px-4 pb-4">
				<Composer
					draft={tab.composerDraft}
					onDraftChange={(composerDraft) =>
						workspace.updateTab({ groupId, tabId: tab.id }, { composerDraft })
					}
					defaultAgentId={agent.id}
					placeholder={`Message ${agent.name}...`}
					onSend={startSession}
				/>
			</div>
		</div>
	);
}
