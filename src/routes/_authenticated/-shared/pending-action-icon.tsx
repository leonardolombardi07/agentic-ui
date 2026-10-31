import { cn } from "cn";
import { MessageCircleQuestionMarkIcon, ShieldAlertIcon } from "lucide-react";
import type { PendingAction } from "@/lib/api/types/session";

/** Short label for a pending action, for screen readers and tooltips. */
export function describePendingAction(action: PendingAction): string {
	return action.kind === "approval"
		? "Waiting for your approval"
		: "Waiting for your answer";
}

/** Marks a session the agent can't continue without the user: a shield for approvals, a bubble for questions. */
export function PendingActionIcon({
	action,
	className,
}: {
	action: PendingAction;
	className?: string;
}) {
	const Icon =
		action.kind === "approval"
			? ShieldAlertIcon
			: MessageCircleQuestionMarkIcon;
	return (
		<Icon
			aria-hidden
			className={cn("size-3.5 shrink-0 text-warning", className)}
			data-testid="pending-action-icon"
			data-kind={action.kind}
		/>
	);
}
