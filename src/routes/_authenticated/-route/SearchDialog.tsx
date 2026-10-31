import { Autocomplete } from "@base-ui/react/autocomplete";
import type { BaseUIEvent } from "@base-ui/react/types";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { cn } from "cn";
import {
	MessageSquareIcon,
	MessageSquarePlusIcon,
	SearchIcon,
} from "lucide-react";
import { useRef, useState } from "react";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	agentsListQueryOptions,
	myAgentsListQueryOptions,
} from "@/lib/api/agents/queries";
import { sessionsListQueryOptions } from "@/lib/api/sessions/queries";
import type { Agent } from "@/lib/api/types/agent";
import type { Session } from "@/lib/api/types/session";
import { AgentAvatar } from "../-shared/agent-avatar";
import {
	describePendingAction,
	PendingActionIcon,
} from "../-shared/pending-action-icon";
import { useWorkspaceCommands } from "../-shared/workspace/commands";

/** What the results are narrowed to. Order matters: Left/Right walk it. */
const TYPES = [
	{ id: "all", label: "All" },
	{ id: "sessions", label: "Sessions" },
	{ id: "agents", label: "Agents" },
] as const;

type ResultType = (typeof TYPES)[number]["id"];

type SessionItem = {
	kind: "session";
	session: Session;
	/** `undefined` for the default agent, or while agents are loading. */
	agent: Agent | undefined;
};
type AgentItem = { kind: "agent"; agent: Agent };
type NewSessionItem = {
	kind: "new-session";
	/** Becomes the draft's prompt, so typing then picking this starts from the search. */
	prompt: string;
};
type Item = SessionItem | AgentItem | NewSessionItem;

/** `value` doubles as the visible group label. */
type ItemGroup = { value: string; items: Item[] };

/** Per group in "All" while searching: enough to scan, switch type to see the rest. */
const ALL_LIMIT = 5;
/** Recent sessions shown in "All" before typing. */
const RECENT_LIMIT = 5;

/**
 * Command-palette search over sessions and agents. Opened from the activity bar or
 * Ctrl/Cmd+K. Not a URL modal like Settings: it's a transient jump, not a place.
 */
export function SearchDialog({
	open,
	onOpenChange,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	const inputRef = useRef<HTMLInputElement>(null);
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent
				initialFocus={inputRef}
				// Pinned near the top so the dialog doesn't jump while filtering changes its height.
				className="top-[12vh] h-[min(32rem,76vh)] w-[min(40rem,calc(100vw-2rem))] translate-y-0"
				data-testid="search-dialog"
			>
				<DialogTitle className="sr-only">Search</DialogTitle>
				<DialogDescription className="sr-only">
					Search sessions and agents.
				</DialogDescription>
				{/* Inside the popup so its state resets once the close animation ends. */}
				<SearchPanel inputRef={inputRef} onClose={() => onOpenChange(false)} />
			</DialogContent>
		</Dialog>
	);
}

function SearchPanel({
	inputRef,
	onClose,
}: {
	inputRef: React.RefObject<HTMLInputElement | null>;
	onClose: () => void;
}) {
	const [type, setType] = useState<ResultType>("all");
	const [query, setQuery] = useState("");
	const highlightedRef = useRef<Item | undefined>(undefined);
	const navigate = useNavigate();
	const commands = useWorkspaceCommands();

	// Not suspense: the dialog opens instantly and fills in, instead of waiting.
	const sessionsQuery = useQuery(sessionsListQueryOptions());
	const agentsQuery = useQuery(agentsListQueryOptions());
	const myAgentsQuery = useQuery(myAgentsListQueryOptions());

	const isLoading =
		(type !== "agents" && sessionsQuery.data === undefined) ||
		(type !== "sessions" && agentsQuery.data === undefined);
	const groups = buildGroups({
		type,
		query,
		sessions: sessionsQuery.data ?? [],
		agents: agentsQuery.data ?? [],
		myAgentIds: new Set(myAgentsQuery.data?.map((agent) => agent.id)),
	});

	function changeType(next: ResultType) {
		setType(next);
		inputRef.current?.focus();
	}

	/** `toSide`: Ctrl/Cmd+Enter or Ctrl/Cmd+click, like the side panel rows. */
	function open(item: Item, { toSide }: { toSide: boolean }) {
		onClose();
		if (item.kind === "session") {
			if (toSide) {
				commands.openToSide({ kind: "session", sessionId: item.session.id });
				return;
			}
			void navigate({
				to: "/sessions/$sessionId",
				params: { sessionId: item.session.id },
			});
			return;
		}
		if (item.kind === "agent") {
			if (toSide) {
				commands.openToSide({ kind: "agent", agentId: item.agent.id });
				return;
			}
			void navigate({
				to: "/agents/$agentId",
				params: { agentId: item.agent.id },
			});
			return;
		}
		void navigate({
			to: "/sessions/new",
			search: {
				prompt: item.prompt || undefined,
				target: toSide ? "side" : "active",
			},
		});
	}

	function handleInputKeyDown(
		event: BaseUIEvent<React.KeyboardEvent<HTMLInputElement>>,
	) {
		const input = event.currentTarget;
		if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
			const item = highlightedRef.current;
			if (!item) return;
			event.preventDefault();
			event.preventBaseUIHandler();
			open(item, { toSide: true });
			return;
		}
		/*
		 * Left/Right change type only once the caret can't move further that way, so
		 * editing the search still works as usual.
		 */
		const hasSelection = input.selectionStart !== input.selectionEnd;
		if (
			event.key === "ArrowLeft" &&
			!hasSelection &&
			input.selectionStart === 0
		) {
			const index = TYPES.findIndex((t) => t.id === type);
			if (index > 0) {
				event.preventDefault();
				setType(TYPES[index - 1].id);
			}
			return;
		}
		if (
			event.key === "ArrowRight" &&
			!hasSelection &&
			input.selectionEnd === input.value.length
		) {
			const index = TYPES.findIndex((t) => t.id === type);
			if (index < TYPES.length - 1) {
				event.preventDefault();
				setType(TYPES[index + 1].id);
			}
		}
	}

	return (
		<Autocomplete.Root
			inline
			open
			autoHighlight="always"
			keepHighlight
			items={groups}
			filteredItems={groups}
			itemToStringValue={itemLabel}
			value={query}
			onValueChange={(nextQuery, details) => {
				// Pressing an item would copy its label into the search; we open it instead.
				if (details.reason === "item-press") return;
				setQuery(nextQuery);
			}}
			onItemHighlighted={(item) => {
				highlightedRef.current = item;
			}}
		>
			<div className="border-b border-border px-3 pt-2 pb-2.5">
				<div className="flex items-center gap-2 pr-8">
					<SearchIcon className="size-4 shrink-0 text-muted-foreground" />
					<Autocomplete.Input
						ref={inputRef}
						onKeyDown={handleInputKeyDown}
						placeholder={placeholder(type)}
						aria-label={placeholder(type)}
						className="h-8 min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
						data-testid="search-input"
					/>
				</div>
				<fieldset className="mt-2 flex gap-1">
					<legend className="sr-only">Result type</legend>
					{TYPES.map((t) => (
						<button
							key={t.id}
							type="button"
							aria-pressed={type === t.id}
							onClick={() => changeType(t.id)}
							className={cn(
								"rounded-md px-2.5 py-1 text-sm text-muted-foreground transition-colors duration-120 outline-none hover:bg-accent hover:text-foreground focus-visible:ring-1 focus-visible:ring-ring",
								type === t.id && "bg-accent text-foreground",
							)}
							data-testid={`search-type-${t.id}`}
						>
							{t.label}
						</button>
					))}
				</fieldset>
			</div>

			{isLoading ? (
				<p className="flex-1 p-4 text-sm text-muted-foreground">Loading...</p>
			) : (
				<>
					<Autocomplete.Empty className="p-4 text-sm text-muted-foreground empty:hidden">
						{emptyMessage(type, query)}
					</Autocomplete.Empty>
					<Autocomplete.List
						className="min-h-0 flex-1 overflow-y-auto p-1.5 empty:hidden"
						data-testid="search-results"
					>
						{(group: ItemGroup) => (
							<Autocomplete.Group
								key={group.value}
								items={group.items}
								className="not-first:mt-2"
							>
								<Autocomplete.GroupLabel className="px-2 pt-1 pb-1 text-xs font-medium text-muted-foreground">
									{group.value}
								</Autocomplete.GroupLabel>
								<Autocomplete.Collection>
									{(item: Item) => (
										<ResultItem key={itemKey(item)} item={item} onOpen={open} />
									)}
								</Autocomplete.Collection>
							</Autocomplete.Group>
						)}
					</Autocomplete.List>
				</>
			)}

			<div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border px-3 py-2 text-xs text-muted-foreground">
				<span>
					<Kbd>Enter</Kbd> Open
				</span>
				<span>
					<Kbd>Ctrl+Enter</Kbd> Open to the side
				</span>
				<span>
					<Kbd>&larr;</Kbd> <Kbd>&rarr;</Kbd> Change type
				</span>
				<span className="ml-auto">
					<Kbd>Esc</Kbd> Close
				</span>
			</div>
		</Autocomplete.Root>
	);
}

const itemClassName =
	"flex cursor-default items-center gap-2.5 rounded-md px-2 py-1.5 text-sm text-foreground outline-none select-none data-highlighted:bg-accent";

function ResultItem({
	item,
	onOpen,
}: {
	item: Item;
	onOpen: (item: Item, options: { toSide: boolean }) => void;
}) {
	function handleClick(event: React.MouseEvent) {
		onOpen(item, { toSide: event.ctrlKey || event.metaKey });
	}

	if (item.kind === "session") {
		const { session, agent } = item;
		return (
			<Autocomplete.Item
				value={item}
				onClick={handleClick}
				className={itemClassName}
				data-testid="search-result-session"
				data-session-id={session.id}
			>
				{agent ? (
					<AgentAvatar agent={agent} className="size-4" />
				) : (
					<MessageSquareIcon
						aria-hidden
						className="size-4 shrink-0 text-muted-foreground"
					/>
				)}
				<span className="min-w-0 flex-1 truncate">{session.title}</span>
				{session.pendingAction ? (
					<>
						<span className="sr-only">
							{`, ${describePendingAction(session.pendingAction)}`}
						</span>
						<PendingActionIcon action={session.pendingAction} />
					</>
				) : null}
				{agent ? (
					<span className="shrink-0 text-xs text-muted-foreground">
						{agent.name}
					</span>
				) : null}
			</Autocomplete.Item>
		);
	}

	if (item.kind === "agent") {
		return (
			<Autocomplete.Item
				value={item}
				onClick={handleClick}
				className={itemClassName}
				data-testid="search-result-agent"
				data-agent-id={item.agent.id}
			>
				<AgentAvatar agent={item.agent} className="size-4" />
				<span className="shrink-0 truncate">{item.agent.name}</span>
				<span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
					{item.agent.description}
				</span>
			</Autocomplete.Item>
		);
	}

	return (
		<Autocomplete.Item
			value={item}
			onClick={handleClick}
			className={itemClassName}
			data-testid="search-result-new-session"
		>
			<MessageSquarePlusIcon
				aria-hidden
				className="size-4 shrink-0 text-muted-foreground"
			/>
			<span className="min-w-0 flex-1 truncate">{itemLabel(item)}</span>
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

function itemLabel(item: Item): string {
	if (item.kind === "session") return item.session.title;
	if (item.kind === "agent") return item.agent.name;
	return item.prompt ? `New session: "${item.prompt}"` : "New session";
}

function itemKey(item: Item): string {
	if (item.kind === "session") return `session:${item.session.id}`;
	if (item.kind === "agent") return `agent:${item.agent.id}`;
	return "new-session";
}

function placeholder(type: ResultType): string {
	if (type === "sessions") return "Search sessions";
	if (type === "agents") return "Search agents";
	return "Search sessions and agents";
}

function emptyMessage(type: ResultType, query: string): string {
	const trimmed = query.trim();
	if (type === "agents") {
		return trimmed ? `No agents match "${trimmed}".` : "No agents yet.";
	}
	return trimmed ? `No sessions match "${trimmed}".` : "No sessions yet.";
}

/** Every whitespace-separated term must appear somewhere in `fields`. */
function matches(fields: string[], terms: string[]): boolean {
	const haystack = fields.join(" ").toLowerCase();
	return terms.every((term) => haystack.includes(term));
}

function byMostRecent(a: Session, b: Session): number {
	return b.updatedAt.localeCompare(a.updatedAt);
}

function buildGroups({
	type,
	query,
	sessions,
	agents,
	myAgentIds,
}: {
	type: ResultType;
	query: string;
	sessions: Session[];
	agents: Agent[];
	myAgentIds: Set<string>;
}): ItemGroup[] {
	const prompt = query.trim();
	const terms = prompt.toLowerCase().split(/\s+/).filter(Boolean);
	const agentsById = new Map(agents.map((agent) => [agent.id, agent]));

	const sessionItems: SessionItem[] = [...sessions]
		.sort(byMostRecent)
		.map((session) => ({
			kind: "session" as const,
			session,
			agent: session.agentId ? agentsById.get(session.agentId) : undefined,
		}))
		// The agent's name matches too, so "slides" finds every Slides session.
		.filter((item) =>
			matches([item.session.title, item.agent?.name ?? ""], terms),
		);
	const agentItems: AgentItem[] = agents
		.filter((agent) => matches([agent.name, agent.description], terms))
		.map((agent) => ({ kind: "agent" as const, agent }));
	const newSession: NewSessionItem = { kind: "new-session", prompt };

	const groups: ItemGroup[] = [];
	function push(value: string, items: Item[]) {
		if (items.length > 0) groups.push({ value, items });
	}

	if (terms.length > 0) {
		if (type === "all") {
			push("Sessions", sessionItems.slice(0, ALL_LIMIT));
			push("Agents", agentItems.slice(0, ALL_LIMIT));
			push("Actions", [newSession]);
		} else if (type === "sessions") {
			push("Sessions", sessionItems);
		} else {
			push("Agents", agentItems);
		}
		return groups;
	}

	// Before typing: what's waiting on the user first, then what they're likely after.
	const needsAttention = sessionItems.filter(
		(item) => item.session.pendingAction,
	);
	const rest = sessionItems.filter((item) => !item.session.pendingAction);
	if (type === "all") {
		push("Needs attention", needsAttention);
		push("Recent", rest.slice(0, RECENT_LIMIT));
		push(
			"Your agents",
			agentItems.filter((item) => myAgentIds.has(item.agent.id)),
		);
		push("Actions", [newSession]);
	} else if (type === "sessions") {
		push("Needs attention", needsAttention);
		push("Sessions", rest);
	} else {
		push(
			"Your agents",
			agentItems.filter((item) => myAgentIds.has(item.agent.id)),
		);
		push(
			"All agents",
			agentItems.filter((item) => !myAgentIds.has(item.agent.id)),
		);
	}
	return groups;
}
