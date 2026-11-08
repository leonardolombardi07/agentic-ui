import type { ToolCallState } from "@tanstack/ai";
import { cn } from "cn";
import { WrenchIcon } from "lucide-react";
import type { PaneProps } from "./registry";

const STATE_LABELS: Record<ToolCallState, string> = {
	"awaiting-input": "Preparing",
	"input-streaming": "Preparing",
	"input-complete": "Running",
	"approval-requested": "Needs approval",
	"approval-responded": "Running",
	complete: "Done",
	error: "Failed",
};

/** Every tool call in the session, newest first. */
export function ActivityPane({ messages }: PaneProps) {
	const calls = messages
		.flatMap((message) => message.parts)
		.filter((part) => part.type === "tool-call")
		.reverse();

	if (calls.length === 0) {
		return (
			<p
				className="p-4 text-sm text-muted-foreground"
				data-testid="pane-activity-empty"
			>
				No tool calls yet.
			</p>
		);
	}

	return (
		<ol className="flex flex-col p-2 text-sm" data-testid="pane-activity">
			{calls.map((call) => (
				<li
					key={call.id}
					className="flex items-center gap-2 rounded-md px-2 py-1.5"
				>
					<WrenchIcon
						aria-hidden
						className="size-3.5 shrink-0 text-muted-foreground"
					/>
					<span className="min-w-0 flex-1 truncate">{call.name}</span>
					<span
						className={cn(
							"shrink-0 text-xs text-muted-foreground",
							call.state === "error" && "text-destructive-foreground",
						)}
					>
						{STATE_LABELS[call.state]}
					</span>
				</li>
			))}
		</ol>
	);
}
