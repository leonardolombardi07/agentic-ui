import { useQuery } from "@tanstack/react-query";
import { cn } from "cn";
import { Columns2Icon, XIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { agentQueryOptions } from "@/lib/api/agents/queries";
import { sessionQueryOptions } from "@/lib/api/sessions/queries";
import { AgentAvatar } from "../../agent-avatar";
import { AgentIndicator } from "../../agent-indicator";
import { useWorkspaceCommands } from "../commands";
import type { AgentTab, EditorGroup, SessionTab, Tab } from "../model";

export function TabBar({
	group,
	isActiveGroup,
}: {
	group: EditorGroup;
	isActiveGroup: boolean;
}) {
	const commands = useWorkspaceCommands();
	const canSplit = group.activeTabId !== null;

	return (
		<div className="flex h-10 shrink-0 items-stretch border-b border-border bg-sidebar">
			<div
				role="tablist"
				aria-label="Open tabs"
				className="flex min-w-0 flex-1 overflow-x-auto"
				// Tab clicks focus the group themselves; don't also trigger the group's handler.
				onPointerDown={(event) => event.stopPropagation()}
			>
				{group.tabs.map((tab) => {
					const props = {
						isActive: tab.id === group.activeTabId,
						isActiveGroup,
						onSelect: () =>
							commands.focusTab({ groupId: group.id, tabId: tab.id }),
						onClose: () =>
							commands.closeTab({ groupId: group.id, tabId: tab.id }),
					};
					return tab.kind === "agent" ? (
						<AgentTabItem key={tab.id} tab={tab} {...props} />
					) : (
						<SessionTabItem key={tab.id} tab={tab} {...props} />
					);
				})}
			</div>
			<div className="flex shrink-0 items-center px-1">
				<Tooltip>
					<TooltipTrigger
						render={
							<Button
								variant="ghost"
								size="icon-sm"
								aria-label="Split editor right"
								disabled={!canSplit}
								onClick={() => commands.splitGroup(group.id)}
								data-testid="split-editor"
							/>
						}
					>
						<Columns2Icon />
					</TooltipTrigger>
					<TooltipContent>Split editor right</TooltipContent>
				</Tooltip>
			</div>
		</div>
	);
}

type TabItemProps = {
	isActive: boolean;
	isActiveGroup: boolean;
	onSelect: () => void;
	onClose: () => void;
};

function SessionTabItem({ tab, ...props }: TabItemProps & { tab: SessionTab }) {
	const { data: session, isError } = useQuery(
		sessionQueryOptions(tab.sessionId),
	);
	return (
		<TabItem
			{...props}
			kind="session"
			icon={
				session ? (
					<AgentIndicator
						agentId={session.agentId}
						isRunning={session.runStatus === "running"}
					/>
				) : null
			}
			title={isError ? "Session not found" : (session?.title ?? "Loading...")}
		/>
	);
}

function AgentTabItem({ tab, ...props }: TabItemProps & { tab: AgentTab }) {
	const { data: agent, isError } = useQuery(agentQueryOptions(tab.agentId));
	return (
		<TabItem
			{...props}
			kind="agent"
			icon={agent ? <AgentAvatar agent={agent} className="size-4" /> : null}
			title={isError ? "Agent not found" : (agent?.name ?? "Loading...")}
		/>
	);
}

function TabItem({
	kind,
	icon,
	title,
	isActive,
	isActiveGroup,
	onSelect,
	onClose,
}: TabItemProps & {
	kind: Tab["kind"];
	icon: ReactNode;
	title: string;
}) {
	return (
		<div
			className={cn(
				"group/tab flex max-w-56 shrink-0 items-center gap-1 border-r border-border pr-1 pl-3 text-sm",
				isActive
					? "bg-background text-foreground"
					: "text-muted-foreground hover:bg-accent",
				isActive && isActiveGroup && "shadow-[inset_0_1px_0_var(--brand)]",
			)}
			data-testid="tab"
			data-kind={kind}
			data-active={isActive}
		>
			<button
				type="button"
				role="tab"
				aria-selected={isActive}
				className="flex min-w-0 flex-1 items-center gap-1.5 py-2 outline-none"
				onClick={onSelect}
				onAuxClick={(event) => {
					if (event.button === 1) onClose(); // middle-click closes, as in VSCode
				}}
			>
				{icon}
				<span className="truncate">{title}</span>
			</button>
			<Tooltip>
				<TooltipTrigger
					render={
						<Button
							variant="ghost"
							size="icon-xs"
							aria-label={`Close ${title}`}
							className={cn(
								!isActive &&
									"opacity-0 group-hover/tab:opacity-100 focus-visible:opacity-100",
							)}
							onClick={onClose}
							data-testid="tab-close"
						/>
					}
				>
					<XIcon />
				</TooltipTrigger>
				<TooltipContent>Close</TooltipContent>
			</Tooltip>
		</div>
	);
}
