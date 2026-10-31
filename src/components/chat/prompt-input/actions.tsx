import { cn } from "cn";
import type { ReactElement, ReactNode } from "react";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { usePromptInput } from "./context";

function PromptInputActions({
	className,
	...props
}: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="prompt-input-actions"
			className={cn("flex items-center gap-1", className)}
			{...props}
		/>
	);
}

type PromptInputActionProps = {
	tooltip: ReactNode;
	/** The control, usually a `Button`. Receives the trigger props through `render`. */
	children: ReactElement;
	side?: "top" | "bottom" | "left" | "right";
};

/** Wraps a control in a tooltip. Prefer it for icon-only buttons. */
function PromptInputAction({
	tooltip,
	children,
	side = "top",
}: PromptInputActionProps) {
	const { disabled } = usePromptInput();
	return (
		<Tooltip disabled={disabled}>
			<TooltipTrigger render={children} />
			<TooltipContent side={side}>{tooltip}</TooltipContent>
		</Tooltip>
	);
}

export { PromptInputAction, PromptInputActions };
