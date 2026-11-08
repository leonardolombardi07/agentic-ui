import { cn } from "cn";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import type { PaneId } from "../../../model";
import { getPane } from "./registry";

/** A pane's title bar: icon, title and actions. */
export function PaneHeader({
	pane,
	leading,
	actions,
}: {
	pane: PaneId;
	leading?: ReactNode;
	actions: ReactNode;
}) {
	const def = getPane(pane);
	const Icon = def.icon;
	return (
		<div
			className={cn(
				"flex h-10 shrink-0 items-center gap-2 border-b border-border pr-1",
				leading ? "pl-1" : "pl-3",
			)}
		>
			{leading}
			<Icon aria-hidden className="size-4 shrink-0 text-muted-foreground" />
			<h2 className="min-w-0 flex-1 truncate text-sm font-medium">
				{def.label}
			</h2>
			<div className="flex shrink-0 items-center">{actions}</div>
		</div>
	);
}

/** A small icon button with a tooltip, as used across the pane chrome. */
export function IconAction({
	label,
	tooltip = label,
	pressed,
	onClick,
	testId,
	children,
}: {
	/** Accessible name. A toggle keeps one name and announces its state through `pressed`. */
	label: string;
	/** What a click will do, when it says more than the name. */
	tooltip?: string;
	/** Set for toggles only, so screen readers announce on/off. */
	pressed?: boolean;
	onClick: () => void;
	testId: string;
	children: ReactNode;
}) {
	return (
		<Tooltip>
			<TooltipTrigger
				render={
					<Button
						variant="ghost"
						size="icon-sm"
						aria-label={label}
						aria-pressed={pressed}
						className={cn(pressed && "bg-accent text-foreground")}
						onClick={onClick}
						data-testid={testId}
					/>
				}
			>
				{children}
			</TooltipTrigger>
			<TooltipContent>{tooltip}</TooltipContent>
		</Tooltip>
	);
}
