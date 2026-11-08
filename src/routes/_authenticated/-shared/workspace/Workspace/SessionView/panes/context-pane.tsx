import { useQuery } from "@tanstack/react-query";
import { modelsListQueryOptions } from "@/lib/api/models/queries";
import type { PermissionMode } from "@/lib/api/types/permission-mode";
import type { PaneProps } from "./registry";

const PERMISSION_LABELS: Record<PermissionMode, string> = {
	ask: "Ask before acting",
	"auto-edit": "Edit automatically",
	plan: "Plan only",
	auto: "Fully automatic",
};

/** Rough rule of thumb until the API reports real usage. */
const CHARS_PER_TOKEN = 4;

/** What the next run uses, and how much the transcript holds so far. */
export function ContextPane({ session, messages }: PaneProps) {
	const { data: modelName } = useQuery({
		...modelsListQueryOptions(),
		select: (models) =>
			models.find((m) => m.id === session.settings.modelId)?.name,
	});

	let chars = 0;
	let toolCalls = 0;
	for (const message of messages) {
		for (const part of message.parts) {
			if (part.type === "text" || part.type === "thinking")
				chars += part.content.length;
			else if (part.type === "tool-call") toolCalls += 1;
		}
	}

	const rows: [string, string][] = [
		["Model", modelName ?? session.settings.modelId],
		["Effort", session.settings.effort ?? "Not supported"],
		["Permissions", PERMISSION_LABELS[session.settings.permissionMode]],
		["Messages", String(messages.length)],
		["Tool calls", String(toolCalls)],
		["Transcript", `~${formatTokens(Math.round(chars / CHARS_PER_TOKEN))}`],
	];

	return (
		<dl
			className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 p-4 text-sm"
			data-testid="pane-context"
		>
			{rows.map(([label, value]) => (
				<div key={label} className="contents">
					<dt className="text-muted-foreground">{label}</dt>
					<dd className="min-w-0 truncate first-letter:uppercase">{value}</dd>
				</div>
			))}
		</dl>
	);
}

function formatTokens(tokens: number): string {
	return tokens < 1000
		? `${tokens} tokens`
		: `${(tokens / 1000).toFixed(1)}k tokens`;
}
