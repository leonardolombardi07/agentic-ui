import { cn } from "cn";
import {
	CheckIcon,
	PanelRightCloseIcon,
	PanelRightIcon,
	PanelRightOpenIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import type { PaneId } from "../../../model";
import { IconAction } from "./pane-chrome";
import { PANE_LIST } from "./registry";
import type { PanesMode } from "./use-panes-layout";

/** Below this session width the pane icons fold into one menu, so the title keeps room. */
export const COMPACT_TOOLBAR_BELOW = 560;

type PaneToolbarProps = {
	mode: PanesMode;
	compact: boolean;
	isShowing: (id: PaneId) => boolean;
	onPaneIcon: (id: PaneId) => void;
	panesShown: boolean;
	onPanesToggle: () => void;
};

/** The session header's pane controls: one icon per pane plus show/hide, or a menu. */
export function PaneToolbar(props: PaneToolbarProps) {
	return props.compact ? <PanesMenu {...props} /> : <PaneIcons {...props} />;
}

/** What clicking a pane's control does right now, in words. */
function actionLabel(mode: PanesMode, label: string, showing: boolean) {
	if (!showing) return `Show ${label}`;
	return mode === "sheet" ? `Hide ${label}` : `Close ${label}`;
}

function PaneIcons({
	mode,
	isShowing,
	onPaneIcon,
	panesShown,
	onPanesToggle,
}: PaneToolbarProps) {
	return (
		<div
			role="toolbar"
			aria-label="Panes"
			className="flex shrink-0 items-center"
			data-testid="pane-toolbar"
		>
			{PANE_LIST.map((pane) => {
				const showing = isShowing(pane.id);
				const Icon = pane.icon;
				return (
					<IconAction
						key={pane.id}
						label={pane.label}
						tooltip={actionLabel(mode, pane.label, showing)}
						pressed={showing}
						onClick={() => onPaneIcon(pane.id)}
						testId={`pane-toggle-${pane.id}`}
					>
						<Icon />
					</IconAction>
				);
			})}
			<div aria-hidden className="mx-1 h-4 w-px bg-border" />
			<IconAction
				label="Panes"
				tooltip={panesShown ? "Hide panes" : "Show panes"}
				pressed={panesShown}
				onClick={onPanesToggle}
				testId="panes-toggle"
			>
				{panesShown ? <PanelRightCloseIcon /> : <PanelRightOpenIcon />}
			</IconAction>
		</div>
	);
}

function PanesMenu({
	mode,
	isShowing,
	onPaneIcon,
	panesShown,
	onPanesToggle,
}: PaneToolbarProps) {
	return (
		<DropdownMenu>
			<Tooltip>
				<TooltipTrigger
					render={
						<DropdownMenuTrigger
							render={
								<Button
									variant="ghost"
									size="icon-sm"
									aria-label="Panes"
									className={cn(panesShown && "bg-accent text-foreground")}
									data-testid="panes-menu"
								/>
							}
						/>
					}
				>
					<PanelRightIcon />
				</TooltipTrigger>
				<TooltipContent>Panes</TooltipContent>
			</Tooltip>
			<DropdownMenuContent align="end" className="min-w-52">
				{PANE_LIST.map((pane) => {
					const showing = isShowing(pane.id);
					const Icon = pane.icon;
					return (
						<DropdownMenuItem
							key={pane.id}
							onClick={() => onPaneIcon(pane.id)}
							data-testid={`panes-menu-${pane.id}`}
						>
							<Icon />
							<span className="flex-1">{pane.label}</span>
							{showing ? (
								<CheckIcon aria-label="Showing" className="text-foreground" />
							) : null}
						</DropdownMenuItem>
					);
				})}
				<DropdownMenuSeparator />
				<DropdownMenuItem
					onClick={onPanesToggle}
					data-testid="panes-menu-toggle"
				>
					{panesShown ? <PanelRightCloseIcon /> : <PanelRightOpenIcon />}
					{panesShown
						? mode === "sheet"
							? "Back to chat"
							: "Hide panes"
						: "Show panes"}
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
