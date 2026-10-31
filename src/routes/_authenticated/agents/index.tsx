import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { cn } from "cn";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import {
	agentsListQueryOptions,
	myAgentsListQueryOptions,
} from "@/lib/api/agents/queries";
import { seo } from "@/lib/seo";
import { AgentCard } from "./-index/agent-card";

const sortOptions = ["recent", "popular", "name"] as const;

const sortLabels: Record<(typeof sortOptions)[number], string> = {
	recent: "Recent",
	popular: "Popular",
	name: "Name",
};

export const Route = createFileRoute("/_authenticated/agents/")({
	validateSearch: z.object({
		q: z.string().optional().catch(undefined),
		sort: z.enum(sortOptions).default("recent").catch("recent"),
	}),
	loader: ({ context: { queryClient } }) =>
		Promise.all([
			queryClient.ensureQueryData(agentsListQueryOptions()),
			queryClient.ensureQueryData(myAgentsListQueryOptions()),
		]),
	head: () => ({
		meta: seo({
			title: "Agents",
			description: "Browse, search and add agents to your workspace.",
		}),
	}),
	component: AgentsGallery,
});

/** Agent gallery: search + sort live in the URL so they're shareable. */
function AgentsGallery() {
	const { q, sort } = Route.useSearch();
	const navigate = Route.useNavigate();
	const { data: agents } = useSuspenseQuery(agentsListQueryOptions());
	const { data: myAgents } = useSuspenseQuery(myAgentsListQueryOptions());
	const myAgentIds = new Set(myAgents.map((agent) => agent.id));

	const terms = (q ?? "").toLowerCase().split(/\s+/).filter(Boolean);
	const filtered = agents.filter((agent) => {
		const haystack = `${agent.name} ${agent.description}`.toLowerCase();
		return terms.every((term) => haystack.includes(term));
	});
	const sorted = sortAgents(filtered, sort);

	return (
		<div
			className="mx-auto flex max-w-5xl flex-col gap-6 p-8"
			data-testid="agents-gallery"
		>
			<h1 className="text-2xl font-medium">Agents</h1>
			<div className="flex items-center gap-3">
				<Input
					type="search"
					aria-label="Search agents"
					placeholder="Search agents"
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
					data-testid="agents-search"
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
							data-testid={`agents-sort-${option}`}
						>
							{sortLabels[option]}
						</Link>
					))}
				</fieldset>
			</div>
			{sorted.length === 0 ? (
				<p
					className="py-12 text-center text-sm text-muted-foreground"
					data-testid="agents-empty"
				>
					No agents match "{q}".
				</p>
			) : (
				<ul
					className="grid grid-cols-1 gap-4 md:grid-cols-2"
					data-testid="agents-grid"
				>
					{sorted.map((agent) => (
						<AgentCard
							key={agent.id}
							agent={agent}
							isAdded={myAgentIds.has(agent.id)}
						/>
					))}
				</ul>
			)}
		</div>
	);
}

/** "recent" keeps the API order until agents carry a timestamp. */
function sortAgents<T extends { name: string; installCount: number }>(
	agents: T[],
	sort: (typeof sortOptions)[number],
): T[] {
	if (sort === "name") {
		return [...agents].sort((a, b) => a.name.localeCompare(b.name));
	}
	if (sort === "popular") {
		return [...agents].sort((a, b) => b.installCount - a.installCount);
	}
	return agents;
}
