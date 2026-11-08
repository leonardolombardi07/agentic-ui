import { cn } from "cn";
import { useWorkspaceCommands } from "../commands";
import type { EditorGroup as EditorGroupType } from "../model";
import { useWorkspace } from "../store";
import { AgentView } from "./AgentView";
import { FileView } from "./FileView";
import { SessionView } from "./SessionView";
import { TabBar } from "./TabBar";

export function EditorGroup({ group }: { group: EditorGroupType }) {
	const commands = useWorkspaceCommands();
	const isActiveGroup = useWorkspace((ws) => ws.activeGroupId === group.id);
	const activeTab = group.tabs.find((t) => t.id === group.activeTabId) ?? null;

	return (
		<section
			aria-label="Editor group"
			data-testid="editor-group"
			data-active={isActiveGroup}
			className={cn(
				"flex min-w-0 flex-1 flex-col",
				!isActiveGroup && "opacity-90",
			)}
			onPointerDown={() => commands.focusGroup(group.id)}
		>
			<TabBar group={group} isActiveGroup={isActiveGroup} />
			<div className="min-h-0 flex-1 overflow-auto">
				{/* Only the active tab is mounted; the rest are records in the store. */}
				{activeTab?.kind === "agent" ? (
					<AgentView key={activeTab.id} tab={activeTab} groupId={group.id} />
				) : activeTab?.kind === "file" ? (
					<FileView key={activeTab.id} tab={activeTab} groupId={group.id} />
				) : activeTab ? (
					<SessionView key={activeTab.id} tab={activeTab} groupId={group.id} />
				) : (
					<p className="p-6 text-sm text-muted-foreground">
						No tab open in this group.
					</p>
				)}
			</div>
		</section>
	);
}
