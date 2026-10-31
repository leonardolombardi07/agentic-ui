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
				{sessions.map((session) => (
					<SessionRow
						key={session.id}
						session={session}
						isFocused={session.id === focusedSessionId}
					/>
				))}
			</ul>
		</>
	);
}
