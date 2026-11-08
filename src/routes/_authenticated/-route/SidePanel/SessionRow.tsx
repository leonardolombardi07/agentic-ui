import { Link } from "@tanstack/react-router";
import { cn } from "cn";
import { Columns2Icon } from "lucide-react";
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { getPendingAction, type Session } from "@/lib/api/types/session";
import { AgentIndicator } from "../../-shared/agent-indicator";
import {
	describePendingAction,
	PendingActionIcon,
} from "../../-shared/pending-action-icon";
import { useWorkspaceCommands } from "../../-shared/workspace/commands";
import { useCanOpenToSide } from "../../-shared/workspace/settings";

/** A session in a side panel list: the Sessions view, or an agent's sessions in the Agents view. */
export function SessionRow({
	session,
	isFocused,
}: {
	session: Session;
	isFocused: boolean;
}) {
	const commands = useWorkspaceCommands();
	const canOpenToSide = useCanOpenToSide();
	const rowRef = useRef<HTMLLIElement>(null);
	const target = { kind: "session", sessionId: session.id } as const;

	const pendingAction = getPendingAction(session);

	return (
		<li ref={rowRef} className="group/item relative">
			<Link
				to="/sessions/$sessionId"
				params={{ sessionId: session.id }}
				className={cn(
					"flex items-center gap-2 rounded-md py-1.5 pr-9 pl-2 text-sm text-muted-foreground hover:bg-sidebar-accent hover:text-foreground",
					isFocused && "bg-sidebar-accent text-foreground",
				)}
				onClick={(event) => {
					// Ctrl/Cmd-click opens to the side instead of in the active group.
					if (event.ctrlKey || event.metaKey) {
						event.preventDefault();
						commands.openToSide(target);
					}
				}}
				data-testid="sessions-list-item"
			>
				<AgentIndicator
					agentId={session.leadAgentId}
					isRunning={session.runStatus === "running"}
					side="right"
					anchor={rowRef}
				/>
				<span className="truncate">{session.title}</span>
				{pendingAction ? (
					<span className="sr-only">
						{`, ${describePendingAction(pendingAction)}`}
					</span>
				) : null}
			</Link>
			{pendingAction ? (
				/* Sits where "Open to the side" appears, and yields that spot on hover/focus. */
				<span className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 transition-opacity group-focus-within/item:opacity-0 group-hover/item:opacity-0">
					<PendingActionIcon action={pendingAction} />
				</span>
			) : null}
			{canOpenToSide ? (
				<Tooltip>
					<TooltipTrigger
						render={
							<Button
								variant="ghost"
								size="icon-xs"
								aria-label={`Open ${session.title} to the side`}
								className="absolute top-1/2 right-1.5 -translate-y-1/2 opacity-0 group-hover/item:opacity-100 focus-visible:opacity-100"
								onClick={() => commands.openToSide(target)}
								data-testid="sessions-list-open-to-side"
							/>
						}
					>
						<Columns2Icon />
					</TooltipTrigger>
					<TooltipContent>Open to the side (Ctrl+click)</TooltipContent>
				</Tooltip>
			) : null}
		</li>
	);
}
