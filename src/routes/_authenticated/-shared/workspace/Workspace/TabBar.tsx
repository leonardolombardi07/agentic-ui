import { useQuery } from "@tanstack/react-query";
import { cn } from "cn";
import {
	Columns2Icon,
	Maximize2Icon,
	Minimize2Icon,
	PlusIcon,
	XIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { agentQueryOptions } from "@/lib/api/agents/queries";
import { fileQueryOptions } from "@/lib/api/files/queries";
import { sessionQueryOptions } from "@/lib/api/sessions/queries";
import { fileIcon } from "@/lib/file-preview";
import { AgentAvatar } from "../../agent-avatar";
import { AgentIndicator } from "../../agent-indicator";
import { useWorkspaceCommands } from "../commands";
import type { AgentTab, EditorGroup, FileTab, SessionTab, Tab } from "../model";
import { useWorkspace } from "../store";

export function TabBar({
	group,
	isActiveGroup,
}: {
	group: EditorGroup;
	isActiveGroup: boolean;
}) {
	const commands = useWorkspaceCommands();
	const canSplit = group.activeTabId !== null;
	const isMaximized = useWorkspace((ws) => ws.maximizedGroupId === group.id);
	const focusLabel = isMaximized ? "Exit focus mode" : "Focus mode";

	return (
		<div className="flex h-10 shrink-0 items-stretch border-b border-border bg-sidebar">
			<div
				role="tablist"
				aria-label="Open tabs"
				/*
				 * Tabs shrink to fit (there are at most MAX_TABS_PER_GROUP), so this rarely
				 * overflows. When a narrow split does, it still scrolls by wheel or focus,
				 * just without a scrollbar eating into the 40px bar.
				 */
				className="flex min-w-0 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
				// Tab clicks focus the group themselves; don't also trigger the group's handler.
				onPointerDown={(event) => event.stopPropagation()}
			>
				{group.tabs.map((tab) => {
					const props = {
						isActive: tab.id === group.activeTabId,
						isActiveGroup,
						onSelect: () =>
							commands.focusTab({ groupId: group.id, tabId: tab.id }),
						// Double-click maximizes, as in VSCode.
						onToggleFocus: () => commands.toggleMaximized(group.id),
						onClose: () =>
							commands.closeTab({ groupId: group.id, tabId: tab.id }),
					};
					return tab.kind === "agent" ? (
						<AgentTabItem key={tab.id} tab={tab} {...props} />
					) : tab.kind === "file" ? (
						<FileTabItem key={tab.id} tab={tab} {...props} />
					) : (
						<SessionTabItem key={tab.id} tab={tab} {...props} />
					);
				})}
			</div>
			{/* Right after the last tab, like a browser: it reads as "one more tab here". */}
			<div
				className="flex flex-1 items-center px-1"
				// newSession focuses the group itself; the group's handler would navigate twice.
				onPointerDown={(event) => event.stopPropagation()}
			>
				<Tooltip>
					<TooltipTrigger
						render={
							<Button
								variant="ghost"
								size="icon-sm"
								aria-label="New session"
								// Stays enabled when full: clicking explains the limit instead.
								onClick={() => commands.newSession(group.id)}
								data-testid="tab-bar-new-session"
							/>
						}
					>
						<PlusIcon />
					</TooltipTrigger>
					<TooltipContent>New session</TooltipContent>
				</Tooltip>
			</div>
			<div className="flex shrink-0 items-center gap-0.5 px-1">
				<Tooltip>
					<TooltipTrigger
						render={
							<Button
								variant="ghost"
								size="icon-sm"
								aria-label="Focus mode"
								aria-pressed={isMaximized}
								aria-keyshortcuts="Control+Period Meta+Period"
								disabled={!canSplit}
								onClick={() => commands.toggleMaximized(group.id)}
								data-testid="focus-mode"
							/>
						}
					>
						{isMaximized ? <Minimize2Icon /> : <Maximize2Icon />}
					</TooltipTrigger>
					<TooltipContent>{focusLabel} (Ctrl+.)</TooltipContent>
				</Tooltip>
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
	onToggleFocus: () => void;
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
						agentId={session.leadAgentId}
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

function FileTabItem({ tab, ...props }: TabItemProps & { tab: FileTab }) {
	const { data: file, isError } = useQuery(fileQueryOptions(tab.fileId));
	const Icon = file ? fileIcon(file) : null;
	return (
		<TabItem
			{...props}
			kind="file"
			icon={
				Icon ? (
					<Icon aria-hidden className="size-4 shrink-0 text-muted-foreground" />
				) : null
			}
			title={isError ? "File not found" : (file?.name ?? "Loading...")}
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
	onToggleFocus,
	onClose,
}: TabItemProps & {
	kind: Tab["kind"];
	icon: ReactNode;
	title: string;
}) {
	return (
		<div
			className={cn(
				"group/tab flex max-w-56 min-w-20 items-center gap-1 border-r border-border pr-1 pl-3 text-sm",
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
				onDoubleClick={onToggleFocus}
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
