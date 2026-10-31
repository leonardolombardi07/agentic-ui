import { cn } from "cn";
import { PanelLeftCloseIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { sidebar } from "../sidebar-store";

export function Header({
	title,
	leading,
	actions,
}: {
	title: ReactNode;
	/** Before the title, e.g. a back button. */
	leading?: ReactNode;
	actions?: ReactNode;
}) {
	return (
		<header
			className={cn(
				"flex h-10 shrink-0 items-center gap-1 border-b border-sidebar-border pr-1",
				leading ? "pl-1" : "pl-4",
			)}
		>
			{leading}
			<h2 className="flex min-w-0 flex-1 items-center gap-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
				{title}
			</h2>
			{actions}
			<Tooltip>
				<TooltipTrigger
					render={
						<Button
							variant="ghost"
							size="icon-sm"
							aria-label="Hide side panel"
							onClick={() => sidebar.close()}
							data-testid="side-panel-close"
						/>
					}
				>
					<PanelLeftCloseIcon />
				</TooltipTrigger>
				<TooltipContent>Hide side panel</TooltipContent>
			</Tooltip>
		</header>
	);
}
