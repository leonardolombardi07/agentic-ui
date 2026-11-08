import { useQuery } from "@tanstack/react-query";
import {
	Link,
	type LinkProps,
	useHydrated,
	useSearch,
} from "@tanstack/react-router";
import { cn } from "cn";
import {
	BotIcon,
	HouseIcon,
	type LucideIcon,
	MessagesSquareIcon,
	PuzzleIcon,
	SearchIcon,
	SettingsIcon,
	ShieldIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { sessionsListQueryOptions } from "@/lib/api/sessions/queries";
import { workspace } from "../-shared/workspace/store";
import { SearchDialog } from "./SearchDialog";
import { type SidebarView, sidebar, useSidebar } from "./sidebar-store";
import { useIsFocusMode } from "./use-main-mode";

const itemClassName =
	"relative flex size-10 items-center justify-center rounded-lg text-muted-foreground transition-colors duration-120 outline-none hover:bg-accent hover:text-foreground focus-visible:ring-1 focus-visible:ring-ring [&_svg]:size-5";
const activeClassName =
	"bg-accent text-foreground before:absolute before:top-2 before:bottom-2 before:-left-2 before:w-0.5 before:rounded-full before:bg-brand";

export function ActivityBar() {
	// Not suspense: the bar is always on screen and must never wait on the list.
	const { data: count = 0 } = useQuery({
		...sessionsListQueryOptions(),
		select: (sessions) =>
			sessions.filter((s) => s.pendingActions.length > 0).length,
	});
	/*
	 * Client-only: the list includes local drafts and may already be in the cache when
	 * hydrating, so the server can't render the same count.
	 */
	const isHydrated = useHydrated();
	const needsActionCount = isHydrated ? count : 0;

	return (
		<nav
			aria-label="Activity bar"
			className="flex w-14 shrink-0 flex-col items-center gap-1 border-r border-sidebar-border bg-sidebar py-2"
		>
			<LinkItem
				to="/"
				exact
				label="Home"
				icon={HouseIcon}
				badge={
					needsActionCount > 0
						? {
								count: needsActionCount,
								description: `${needsActionCount} ${needsActionCount === 1 ? "session needs" : "sessions need"} your action`,
							}
						: undefined
				}
				testId="activity-home"
			/>
			<SearchItem />
			<ViewItem view="sessions" label="Sessions" icon={MessagesSquareIcon} />
			<ViewItem view="agents" label="Agents" icon={BotIcon} />
			<ModalItem
				modal="customizations"
				label="Customizations"
				icon={PuzzleIcon}
			/>
			<div className="my-1 h-px w-8 bg-sidebar-border" />
			<LinkItem
				to="/admin"
				label="Admin"
				icon={ShieldIcon}
				testId="activity-admin"
			/>
			<div className="flex-1" />
			<ModalItem modal="settings" label="Settings" icon={SettingsIcon} />
		</nav>
	);
}

/** Switches the side panel. Never navigates. */
function ViewItem({
	view,
	label,
	icon: Icon,
}: {
	view: SidebarView;
	label: string;
	icon: LucideIcon;
}) {
	const isFocusMode = useIsFocusMode();
	const isActive = useSidebar((s) => s.open && s.view === view) && !isFocusMode;
	return (
		<Tooltip>
			<TooltipTrigger
				render={
					<button
						type="button"
						aria-label={label}
						aria-pressed={isActive}
						className={cn(itemClassName, isActive && activeClassName)}
						onClick={() => {
							// Asking for the side panel means wanting it on screen: leave focus mode.
							if (isFocusMode) {
								const { maximizedGroupId } = workspace.getState();
								if (maximizedGroupId)
									workspace.toggleMaximized(maximizedGroupId);
								sidebar.showView(view);
								return;
							}
							sidebar.toggleView(view);
						}}
						data-testid={`activity-${view}`}
					/>
				}
			>
				<Icon />
			</TooltipTrigger>
			<TooltipContent side="right">{label}</TooltipContent>
		</Tooltip>
	);
}

/**
 * Opens the search dialog. Owns the Ctrl/Cmd+K shortcut too: the bar is always
 * mounted, so the shortcut works on every authenticated route.
 */
function SearchItem() {
	const [open, setOpen] = useState(false);

	useEffect(() => {
		function handleKeyDown(event: KeyboardEvent) {
			if (
				event.key.toLowerCase() === "k" &&
				(event.ctrlKey || event.metaKey) &&
				!event.altKey &&
				!event.shiftKey
			) {
				// Also stops the browser from focusing its own search bar.
				event.preventDefault();
				setOpen((wasOpen) => !wasOpen);
			}
		}
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, []);

	return (
		<>
			<Tooltip>
				<TooltipTrigger
					render={
						<button
							type="button"
							aria-label="Search"
							aria-haspopup="dialog"
							aria-keyshortcuts="Control+K Meta+K"
							className={cn(itemClassName, open && activeClassName)}
							onClick={() => setOpen(true)}
							data-testid="activity-search"
						/>
					}
				>
					<SearchIcon />
				</TooltipTrigger>
				<TooltipContent side="right">Search (Ctrl+K)</TooltipContent>
			</Tooltip>
			<SearchDialog open={open} onOpenChange={setOpen} />
		</>
	);
}

/** A count on an item, e.g. sessions waiting on the user on Home. */
type Badge = {
	count: number;
	/** Read by screen readers and shown in the tooltip, e.g. "2 sessions need your action". */
	description: string;
};

/** Navigates. Active styling comes from the router (`data-status="active"`). */
function LinkItem({
	to,
	exact = false,
	label,
	icon: Icon,
	badge,
	testId,
}: {
	to: LinkProps["to"];
	exact?: boolean;
	label: string;
	icon: LucideIcon;
	badge?: Badge;
	testId: string;
}) {
	return (
		<Tooltip>
			<TooltipTrigger
				render={
					<Link
						to={to}
						aria-label={badge ? `${label}, ${badge.description}` : label}
						activeOptions={{ exact }}
						className={itemClassName}
						activeProps={{ className: activeClassName }}
						data-testid={testId}
					/>
				}
			>
				<Icon />
				{badge ? <BadgeCount count={badge.count} /> : null}
			</TooltipTrigger>
			<TooltipContent side="right">
				{badge ? `${label} - ${badge.description}` : label}
			</TooltipContent>
		</Tooltip>
	);
}

/** Capped at 9+ so it stays a small dot-sized pill over the icon. */
function BadgeCount({ count }: { count: number }) {
	return (
		<span
			aria-hidden
			className="pointer-events-none absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-warning px-1 text-[10px] leading-none font-semibold text-neutral-950 ring-2 ring-sidebar tabular-nums"
			data-testid="activity-badge"
		>
			{count > 9 ? "9+" : count}
		</span>
	);
}

/**
 * Opens a modal over the current route (search param, see `modals/search.ts`).
 * `modalOpenedInApp` lets closing go Back instead of leaving an extra history entry.
 */
function ModalItem({
	modal,
	label,
	icon: Icon,
}: {
	modal: "settings" | "customizations";
	label: string;
	icon: LucideIcon;
}) {
	const isOpen = useSearch({
		from: "/_authenticated",
		select: (s) => Boolean(s[modal]),
	});
	return (
		<Tooltip>
			<TooltipTrigger
				render={
					<Link
						to="."
						search={(prev) =>
							modal === "settings"
								? { ...prev, customizations: undefined, settings: "general" }
								: {
										...prev,
										settings: undefined,
										customizations: "instructions",
									}
						}
						state={(prev) => ({ ...prev, modalOpenedInApp: true })}
						aria-label={label}
						aria-haspopup="dialog"
						className={cn(itemClassName, isOpen && activeClassName)}
						data-testid={`activity-${modal}`}
					/>
				}
			>
				<Icon />
			</TooltipTrigger>
			<TooltipContent side="right">{label}</TooltipContent>
		</Tooltip>
	);
}
