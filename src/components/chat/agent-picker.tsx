import { Autocomplete } from "@base-ui/react/autocomplete";
import { cn } from "cn";
import {
	ArrowLeftIcon,
	BotIcon,
	CheckIcon,
	ChevronDownIcon,
	LayoutGridIcon,
	SearchIcon,
	SparklesIcon,
} from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";

/** The fields the picker needs. Kept local so the design system doesn't depend on the API types. */
type AgentPickerAgent = {
	id: string;
	name: string;
	description: string;
};

type AgentPickerProps = {
	/** Selected agent id. `null` is the Default agent. */
	value: string | null;
	onValueChange: (agentId: string | null) => void;
	/** Shown first: the user's own agents. `undefined` while loading. */
	yourAgents: AgentPickerAgent[] | undefined;
	/** Everything the user can use, shown after "Browse all agents". `undefined` while loading. */
	allAgents: AgentPickerAgent[] | undefined;
	disabled?: boolean;
};

type Scope = "yours" | "all";

type AgentItem = {
	kind: "agent";
	/** `null` is the Default agent. */
	id: string | null;
	name: string;
	description: string;
};

type BrowseAllItem = { kind: "browse-all"; name: string };

type Item = AgentItem | BrowseAllItem;

/** `value` doubles as the visible group label; `null` renders no label. */
type ItemGroup = { value: string | null; items: Item[] };

const DEFAULT_AGENT: AgentItem = {
	kind: "agent",
	id: null,
	name: "Default",
	description: "General-purpose agent.",
};

/**
 * Agent button for the composer. Opens a command-palette-style dialog: search first,
 * the user's agents listed up front, and "Browse all agents" to widen the search
 * in place without leaving the dialog.
 */
function AgentPicker({
	value,
	onValueChange,
	yourAgents,
	allAgents,
	disabled = false,
}: AgentPickerProps) {
	const [open, setOpen] = useState(false);
	const [scope, setScope] = useState<Scope>("yours");
	const [query, setQuery] = useState("");
	const inputRef = useRef<HTMLInputElement>(null);

	const selected =
		value === null
			? DEFAULT_AGENT
			: (findAgent(allAgents, value) ?? findAgent(yourAgents, value));
	const yourAgentIds = new Set(yourAgents?.map((agent) => agent.id));
	const scopeAgents = scope === "yours" ? yourAgents : allAgents;
	const groups = buildGroups({ scope, query, agents: scopeAgents });
	const isLoading = scopeAgents === undefined;

	function handleOpenChange(nextOpen: boolean) {
		setOpen(nextOpen);
		// Reset on open, not on close, so the closing animation doesn't flash the reset list.
		if (nextOpen) {
			setScope("yours");
			setQuery("");
		}
	}

	function changeScope(nextScope: Scope) {
		setScope(nextScope);
		inputRef.current?.focus();
	}

	function handleItem(item: Item) {
		if (item.kind === "browse-all") {
			changeScope("all");
			return;
		}
		onValueChange(item.id);
		setOpen(false);
	}

	function handleInputKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
		// Backspace on an empty search steps back out of "all", like leaving a folder.
		if (event.key === "Backspace" && scope === "all" && query === "") {
			event.preventDefault();
			changeScope("yours");
		}
	}

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<Tooltip>
				<TooltipTrigger
					render={
						<DialogTrigger
							disabled={disabled}
							render={
								<Button
									variant="ghost"
									size="sm"
									className="max-w-48"
									data-testid="agent-picker-trigger"
								/>
							}
						/>
					}
				>
					{value === null ? <SparklesIcon /> : <BotIcon />}
					<span className="truncate">{selected?.name ?? "Agent"}</span>
					<ChevronDownIcon className="opacity-60" />
				</TooltipTrigger>
				<TooltipContent>Choose agent</TooltipContent>
			</Tooltip>

			<DialogContent
				showCloseButton={false}
				initialFocus={inputRef}
				// Pinned near the top so the dialog doesn't jump while filtering changes its height.
				className="top-[15vh] h-[min(28rem,75vh)] w-[min(36rem,calc(100vw-2rem))] translate-y-0"
				data-testid="agent-picker-dialog"
			>
				<DialogTitle className="sr-only">Choose an agent</DialogTitle>
				<DialogDescription className="sr-only">
					Search your agents, or browse all agents.
				</DialogDescription>

				<Autocomplete.Root
					inline
					open
					autoHighlight="always"
					keepHighlight
					items={groups}
					filteredItems={groups}
					itemToStringValue={(item: Item) => item.name}
					value={query}
					onValueChange={(nextQuery, details) => {
						// Pressing an item would copy its name into the search; we close or switch scope instead.
						if (details.reason === "item-press") return;
						setQuery(nextQuery);
					}}
				>
					<div className="flex items-center gap-2 border-b border-border px-3 py-2">
						{scope === "all" ? (
							<Tooltip>
								<TooltipTrigger
									render={
										<Button
											variant="ghost"
											size="icon-xs"
											aria-label="Back to your agents"
											onClick={() => changeScope("yours")}
											data-testid="agent-picker-back"
										/>
									}
								>
									<ArrowLeftIcon />
								</TooltipTrigger>
								<TooltipContent>Back to your agents (Backspace)</TooltipContent>
							</Tooltip>
						) : (
							<SearchIcon className="size-4 shrink-0 text-muted-foreground" />
						)}
						<Autocomplete.Input
							ref={inputRef}
							onKeyDown={handleInputKeyDown}
							placeholder={
								scope === "yours"
									? "Search your agents..."
									: "Search all agents..."
							}
							aria-label={
								scope === "yours" ? "Search your agents" : "Search all agents"
							}
							className="h-8 min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
							data-testid="agent-picker-search"
						/>
					</div>

					{isLoading ? (
						<p className="flex-1 p-4 text-sm text-muted-foreground">
							Loading agents...
						</p>
					) : (
						<>
							<Autocomplete.Empty className="p-4 text-sm text-muted-foreground empty:hidden">
								No agents match "{query}".
							</Autocomplete.Empty>
							<Autocomplete.List
								className="min-h-0 flex-1 overflow-y-auto p-1.5 empty:hidden"
								data-testid="agent-picker-list"
							>
								{(group: ItemGroup) => (
									<Autocomplete.Group
										key={group.value ?? "actions"}
										items={group.items}
										className="not-first:mt-1.5 not-first:border-t not-first:border-border not-first:pt-1.5"
									>
										{group.value ? (
											<Autocomplete.GroupLabel className="px-2 pt-1 pb-1.5 text-xs font-medium text-muted-foreground">
												{group.value}
											</Autocomplete.GroupLabel>
										) : null}
										<Autocomplete.Collection>
											{(item: Item) => (
												<PickerItem
													key={
														item.kind === "agent"
															? (item.id ?? "default")
															: item.kind
													}
													item={item}
													query={query}
													isSelected={
														item.kind === "agent" && item.id === value
													}
													isYours={
														scope === "all" &&
														item.kind === "agent" &&
														item.id !== null &&
														yourAgentIds.has(item.id)
													}
													onSelect={handleItem}
												/>
											)}
										</Autocomplete.Collection>
									</Autocomplete.Group>
								)}
							</Autocomplete.List>
						</>
					)}
				</Autocomplete.Root>

				<div className="flex items-center gap-3 border-t border-border px-3 py-2 text-xs text-muted-foreground">
					<span>
						<Kbd>Enter</Kbd> to select
					</span>
					<span>
						<Kbd>Esc</Kbd> to close
					</span>
				</div>
			</DialogContent>
		</Dialog>
	);
}

function PickerItem({
	item,
	query,
	isSelected,
	isYours,
	onSelect,
}: {
	item: Item;
	query: string;
	isSelected: boolean;
	isYours: boolean;
	onSelect: (item: Item) => void;
}) {
	const itemClassName =
		"flex cursor-default items-center gap-3 rounded-md px-2 py-1.5 text-sm outline-none select-none data-highlighted:bg-accent";

	if (item.kind === "browse-all") {
		return (
			<Autocomplete.Item
				value={item}
				onClick={() => onSelect(item)}
				className={cn(itemClassName, "text-brand-text")}
				data-testid="agent-picker-browse-all"
			>
				<LayoutGridIcon className="size-4 shrink-0" />
				<span className="truncate">
					{query.trim()
						? `Search all agents for "${query.trim()}"`
						: "Browse all agents"}
				</span>
			</Autocomplete.Item>
		);
	}

	return (
		<Autocomplete.Item
			value={item}
			onClick={() => onSelect(item)}
			className={itemClassName}
			data-testid="agent-picker-item"
			data-agent-id={item.id ?? "default"}
		>
			<span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-control-active text-muted-foreground">
				{item.id === null ? (
					<SparklesIcon className="size-3.5" />
				) : (
					<BotIcon className="size-3.5" />
				)}
			</span>
			<span className="min-w-0 flex-1">
				<span className="flex items-center gap-1.5">
					<span className="truncate font-medium text-foreground">
						{item.name}
					</span>
					{isYours ? (
						<span className="shrink-0 rounded-full bg-brand-soft px-1.5 text-[11px] text-brand-text">
							Yours
						</span>
					) : null}
				</span>
				<span className="block truncate text-xs text-muted-foreground">
					{item.description}
				</span>
			</span>
			{isSelected ? (
				<CheckIcon
					className="size-4 shrink-0 text-foreground"
					aria-label="Selected"
				/>
			) : null}
		</Autocomplete.Item>
	);
}

function Kbd({ children }: { children: React.ReactNode }) {
	return (
		<kbd className="rounded border border-border bg-control px-1 font-sans text-[11px]">
			{children}
		</kbd>
	);
}

function findAgent(
	agents: AgentPickerAgent[] | undefined,
	id: string,
): AgentPickerAgent | undefined {
	return agents?.find((agent) => agent.id === id);
}

/** Every whitespace-separated term must appear in the name or description. */
function matches(agent: AgentItem, query: string): boolean {
	const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
	const haystack = `${agent.name} ${agent.description}`.toLowerCase();
	return terms.every((term) => haystack.includes(term));
}

function buildGroups({
	scope,
	query,
	agents,
}: {
	scope: Scope;
	query: string;
	agents: AgentPickerAgent[] | undefined;
}): ItemGroup[] {
	const agentItems: AgentItem[] = [
		DEFAULT_AGENT,
		...(agents ?? []).map((agent) => ({ kind: "agent" as const, ...agent })),
	].filter((agent) => matches(agent, query));

	if (scope === "all") {
		return agentItems.length > 0
			? [{ value: "All agents", items: agentItems }]
			: [];
	}

	const groups: ItemGroup[] = [];
	if (agentItems.length > 0) {
		groups.push({ value: "Your agents", items: agentItems });
	}
	// Always offered, so a search with no local match still has somewhere to go.
	groups.push({
		value: null,
		items: [{ kind: "browse-all", name: "Browse all agents" }],
	});
	return groups;
}

export { AgentPicker };
export type { AgentPickerAgent, AgentPickerProps };
