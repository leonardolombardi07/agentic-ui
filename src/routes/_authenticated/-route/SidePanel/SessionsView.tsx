import { useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { sessionsListQueryOptions } from "@/lib/api/sessions/queries";
import { useFocusedSessionId } from "./focused";
import { Header } from "./Header";
import { SessionRow } from "./SessionRow";

/** The panel is a quick list of recent sessions; the rest live on `/sessions/all`. */
const SESSIONS_LIMIT = 20;

export function SessionsView() {
	const { data: sessions } = useSuspenseQuery(sessionsListQueryOptions());
	const focusedSessionId = useFocusedSessionId();
	return (
		<>
			<Header
				title="Sessions"
				actions={
					<Tooltip>
						<TooltipTrigger
							render={
								<Button
									variant="ghost"
									size="icon-sm"
									aria-label="New session"
									render={<Link to="/sessions/new" />}
									nativeButton={false}
									data-testid="side-panel-new-session"
								/>
							}
						>
							<PlusIcon />
						</TooltipTrigger>
						<TooltipContent>New session</TooltipContent>
					</Tooltip>
				}
			/>
			<ul className="flex-1 overflow-y-auto p-2" data-testid="sessions-list">
				{sessions.slice(0, SESSIONS_LIMIT).map((session) => (
					<SessionRow
						key={session.id}
						session={session}
						isFocused={session.id === focusedSessionId}
					/>
				))}
			</ul>
			<div className="border-t border-sidebar-border p-2">
				<Link
					to="/sessions/all"
					className="block rounded-md px-2 py-1.5 text-sm text-brand-text hover:bg-sidebar-accent"
					data-testid="sessions-browse-all"
				>
					Browse all sessions
				</Link>
			</div>
		</>
	);
}
