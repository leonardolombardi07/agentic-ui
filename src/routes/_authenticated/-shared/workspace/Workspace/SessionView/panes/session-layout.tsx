import { cn } from "cn";
import {
	ArrowLeftIcon,
	Maximize2Icon,
	Minimize2Icon,
	PanelRightCloseIcon,
	PanelRightOpenIcon,
	XIcon,
} from "lucide-react";
import {
	type ReactNode,
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
} from "react";
import { Button } from "@/components/ui/button";
import { ResizeHandle } from "@/components/ui/resize-handle";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import {
	defaultPanesSize,
	PANES_PER_COLUMN,
	type PaneId,
	type Panes,
	type TabRef,
} from "../../../model";
import { workspace } from "../../../store";
import { DEFAULT_PANE, getPane, PANE_LIST, type PaneProps } from "./registry";
import {
	CHAT_MIN_WIDTH,
	PANE_COLUMN_MIN_WIDTH,
	type PanesMode,
	usePanesLayout,
} from "./use-panes-layout";

type SessionLayoutProps = {
	tabRef: TabRef;
	panes: Panes;
	paneProps: PaneProps;
	/** Left side of the session header. */
	breadcrumb: ReactNode;
	/** The chat: transcript and composer. */
	children: ReactNode;
};

/**
 * A session with its panes. The same pieces, arranged by the width this session has
 * (see use-panes-layout.ts):
 *
 *   docked  [ header | chat ] [ pane columns ]   panes beside the chat, resizable
 *   sheet   [ header | chat, the front pane over it ]
 *
 * Resizing never opens or closes panes, it only changes how they are shown. So a group
 * that gets narrow hides its docked panes instead of covering the chat with them; the
 * sheet only shows when asked for here (a header icon).
 */
export function SessionLayout({
	tabRef,
	panes,
	paneProps,
	breadcrumb,
	children,
}: SessionLayoutProps) {
	const rootRef = useRef<HTMLDivElement>(null);
	const layout = usePanesLayout(rootRef);
	const mode = layout?.mode ?? null;
	const [sheetOpen, setSheetOpen] = useState(false);
	const [expanded, setExpanded] = useState<PaneId | null>(null);

	// The sheet is a request made while narrow: it doesn't carry over a dock and back.
	useEffect(() => {
		if (mode === "docked") setSheetOpen(false);
	}, [mode]);

	const ranked = rankByRecent(panes);
	const front = ranked[0];
	const docked =
		layout?.mode === "docked" && panes.open && panes.views.length > 0
			? dockedLayout(panes, ranked, layout.width)
			: null;
	const sheetPane =
		mode === "sheet" && sheetOpen && panes.open ? front : undefined;
	const expandedPane =
		mode === "docked" && expanded && docked?.shown.includes(expanded)
			? expanded
			: null;

	function isShowing(id: PaneId) {
		return mode === "docked"
			? Boolean(docked?.shown.includes(id))
			: sheetPane === id;
	}

	function handlePaneIcon(id: PaneId) {
		if (mode === "docked") {
			if (isShowing(id)) workspace.closePane(tabRef, id);
			else workspace.openPane(tabRef, id);
			return;
		}
		// Sheet: the icons are its switcher. The front one hides it again.
		if (isShowing(id)) {
			setSheetOpen(false);
			return;
		}
		workspace.openPane(tabRef, id);
		setSheetOpen(true);
	}

	const panesShown =
		mode === "docked" ? docked !== null : sheetPane !== undefined;

	function handlePanesToggle() {
		if (mode === "docked") {
			workspace.setPanesOpen(tabRef, !panesShown, DEFAULT_PANE);
			return;
		}
		if (panesShown) {
			setSheetOpen(false);
			return;
		}
		workspace.setPanesOpen(tabRef, true, DEFAULT_PANE);
		setSheetOpen(true);
	}

	function closePane(id: PaneId) {
		workspace.closePane(tabRef, id);
		if (expanded === id) setExpanded(null);
	}

	return (
		<div
			ref={rootRef}
			className="relative flex h-full min-w-0"
			data-testid="session-view"
			data-panes-mode={mode ?? undefined}
		>
			<div className="flex min-w-0 flex-1 flex-col">
				<header className="flex h-10 shrink-0 items-center gap-2 border-b border-border pr-1 pl-4">
					<div className="flex min-w-0 flex-1 items-center">{breadcrumb}</div>
					{mode ? (
						<PaneToolbar
							mode={mode}
							isShowing={isShowing}
							onPaneIcon={handlePaneIcon}
							panesShown={panesShown}
							onPanesToggle={handlePanesToggle}
						/>
					) : null}
				</header>
				<div className="relative flex min-h-0 flex-1 flex-col">
					{children}
					{sheetPane ? (
						<PaneSheet
							pane={sheetPane}
							paneProps={paneProps}
							onHide={() => setSheetOpen(false)}
							onClose={() => closePane(sheetPane)}
						/>
					) : null}
				</div>
			</div>

			{docked ? (
				<DockedPanes
					tabRef={tabRef}
					layout={docked}
					width={layout?.width ?? 0}
					paneProps={paneProps}
					onExpand={setExpanded}
					onClose={closePane}
				/>
			) : null}

			{expandedPane ? (
				<ExpandedPane
					pane={expandedPane}
					paneProps={paneProps}
					onCollapse={() => setExpanded(null)}
					onClose={() => closePane(expandedPane)}
				/>
			) : null}
		</div>
	);
}

/* -------------------------------------------------------------------------- */
/* Layout math                                                                 */
/* -------------------------------------------------------------------------- */

/** Open panes, most recently used first. Tolerates `recent` missing some (old saves). */
function rankByRecent(panes: Panes): PaneId[] {
	const recent = panes.recent.filter((id) => panes.views.includes(id));
	return [...recent, ...panes.views.filter((id) => !recent.includes(id))];
}

type DockedLayout = {
	/** Shown panes, in open order, split into columns. */
	columns: PaneId[][];
	shown: PaneId[];
	/** Panes width in px, and the bounds a drag keeps it in. */
	px: number;
	min: number;
	max: number;
};

/**
 * As many columns as fit beside the chat. When there are more panes than room, the
 * most recently used ones show; the rest stay open (their icons bring them back).
 */
function dockedLayout(
	panes: Panes,
	ranked: PaneId[],
	width: number,
): DockedLayout {
	const maxColumns = Math.max(
		1,
		Math.floor((width - CHAT_MIN_WIDTH) / PANE_COLUMN_MIN_WIDTH),
	);
	const fit = ranked.slice(0, maxColumns * PANES_PER_COLUMN);
	const shown = panes.views.filter((id) => fit.includes(id));
	const columns: PaneId[][] = [];
	for (let i = 0; i < shown.length; i += PANES_PER_COLUMN) {
		columns.push(shown.slice(i, i + PANES_PER_COLUMN));
	}
	const min = columns.length * PANE_COLUMN_MIN_WIDTH;
	const max = Math.max(min, width - CHAT_MIN_WIDTH);
	const px = Math.min(max, Math.max(min, panes.size * width));
	return { columns, shown, px, min, max };
}

/* -------------------------------------------------------------------------- */
/* Header toolbar                                                              */
/* -------------------------------------------------------------------------- */

function PaneToolbar({
	mode,
	isShowing,
	onPaneIcon,
	panesShown,
	onPanesToggle,
}: {
	mode: PanesMode;
	isShowing: (id: PaneId) => boolean;
	onPaneIcon: (id: PaneId) => void;
	panesShown: boolean;
	onPanesToggle: () => void;
}) {
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
						tooltip={
							showing
								? mode === "docked"
									? `Close ${pane.label}`
									: `Hide ${pane.label}`
								: `Show ${pane.label}`
						}
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

/* -------------------------------------------------------------------------- */
/* Docked                                                                      */
/* -------------------------------------------------------------------------- */

function DockedPanes({
	tabRef,
	layout,
	width,
	paneProps,
	onExpand,
	onClose,
}: {
	tabRef: TabRef;
	layout: DockedLayout;
	width: number;
	paneProps: PaneProps;
	onExpand: (id: PaneId) => void;
	onClose: (id: PaneId) => void;
}) {
	const pxAtDragStart = useRef(layout.px);

	function resizeTo(px: number) {
		if (width <= 0) return;
		const clamped = Math.min(layout.max, Math.max(layout.min, px));
		workspace.setPanesSize(tabRef, clamped / width);
	}

	return (
		<aside
			aria-label="Panes"
			className="relative flex shrink-0 border-l border-border"
			style={{ width: layout.px }}
			data-testid="panes-docked"
		>
			<ResizeHandle
				aria-label="Resize panes"
				className="-left-[3.5px]"
				value={layout.px}
				min={layout.min}
				max={layout.max}
				onResizeStart={() => {
					pxAtDragStart.current = layout.px;
				}}
				// Dragging left (negative) widens the panes.
				onResize={(deltaX) => resizeTo(pxAtDragStart.current - deltaX)}
				onKeyboardResize={(step) => resizeTo(layout.px - step)}
				onReset={() =>
					workspace.setPanesSize(
						tabRef,
						defaultPanesSize(layout.columns.length),
					)
				}
				data-testid="panes-resize"
			/>
			{layout.columns.map((column, index) => (
				<div
					// Keyed by position: a column stays mounted while its panes change.
					// biome-ignore lint/suspicious/noArrayIndexKey: see above
					key={index}
					className="flex min-w-0 flex-1 flex-col border-l border-border first:border-l-0"
				>
					{column.map((id) => (
						<DockedPane
							key={id}
							tabRef={tabRef}
							pane={id}
							paneProps={paneProps}
							onExpand={() => onExpand(id)}
							onClose={() => onClose(id)}
						/>
					))}
				</div>
			))}
		</aside>
	);
}

function DockedPane({
	tabRef,
	pane,
	paneProps,
	onExpand,
	onClose,
}: {
	tabRef: TabRef;
	pane: PaneId;
	paneProps: PaneProps;
	onExpand: () => void;
	onClose: () => void;
}) {
	const def = getPane(pane);
	function touch() {
		workspace.touchPane(tabRef, pane);
	}
	return (
		<section
			aria-label={def.label}
			className="flex min-h-0 flex-1 flex-col border-t border-border first:border-t-0"
			onPointerDownCapture={touch}
			onFocusCapture={touch}
			data-testid={`pane-${pane}`}
		>
			<PaneHeader
				pane={pane}
				actions={
					<>
						<IconAction
							label="Full size"
							onClick={onExpand}
							testId={`pane-expand-${pane}`}
						>
							<Maximize2Icon />
						</IconAction>
						<IconAction
							label={`Close ${def.label}`}
							onClick={onClose}
							testId={`pane-close-${pane}`}
						>
							<XIcon />
						</IconAction>
					</>
				}
			/>
			<div className="min-h-0 flex-1 overflow-y-auto">
				{def.render(paneProps)}
			</div>
		</section>
	);
}

/* -------------------------------------------------------------------------- */
/* Sheet (narrow) and full size                                                */
/* -------------------------------------------------------------------------- */

/**
 * The front pane over the chat, below the header (whose icons switch panes). Scoped to
 * this session: no backdrop or focus trap, so the other group stays usable.
 */
function PaneSheet({
	pane,
	paneProps,
	onHide,
	onClose,
}: {
	pane: PaneId;
	paneProps: PaneProps;
	onHide: () => void;
	onClose: () => void;
}) {
	const def = getPane(pane);
	return (
		<section
			aria-label={def.label}
			className="absolute inset-0 z-20 flex flex-col bg-background animate-in fade-in-0 slide-in-from-right-4 duration-150"
			onKeyDown={(event) => {
				if (event.key === "Escape") onHide();
			}}
			data-testid="panes-sheet"
		>
			<PaneHeader
				pane={pane}
				leading={
					<IconAction label="Back to chat" onClick={onHide} testId="sheet-hide">
						<ArrowLeftIcon />
					</IconAction>
				}
				actions={
					<IconAction
						label={`Close ${def.label}`}
						onClick={onClose}
						testId={`pane-close-${pane}`}
					>
						<XIcon />
					</IconAction>
				}
			/>
			<div className="min-h-0 flex-1 overflow-y-auto">
				{def.render(paneProps)}
			</div>
		</section>
	);
}

/** One pane over the whole session, header included. Escape returns. */
function ExpandedPane({
	pane,
	paneProps,
	onCollapse,
	onClose,
}: {
	pane: PaneId;
	paneProps: PaneProps;
	onCollapse: () => void;
	onClose: () => void;
}) {
	const def = getPane(pane);
	const ref = useRef<HTMLDivElement>(null);

	// Move focus in, and back to where it was (the expand button) on the way out.
	useLayoutEffect(() => {
		const previous =
			document.activeElement instanceof HTMLElement
				? document.activeElement
				: null;
		ref.current?.focus();
		return () => previous?.focus();
	}, []);

	return (
		<div
			ref={ref}
			role="dialog"
			aria-label={`${def.label} (full size)`}
			tabIndex={-1}
			className="absolute inset-0 z-30 flex flex-col bg-background outline-none animate-in fade-in-0 zoom-in-95 duration-150"
			onKeyDown={(event) => {
				if (event.key === "Escape") onCollapse();
			}}
			data-testid="pane-expanded"
		>
			<PaneHeader
				pane={pane}
				actions={
					<>
						<IconAction
							label="Exit full size"
							onClick={onCollapse}
							testId="pane-collapse"
						>
							<Minimize2Icon />
						</IconAction>
						<IconAction
							label={`Close ${def.label}`}
							onClick={onClose}
							testId={`pane-close-${pane}`}
						>
							<XIcon />
						</IconAction>
					</>
				}
			/>
			<div className="min-h-0 flex-1 overflow-y-auto">
				{def.render(paneProps)}
			</div>
		</div>
	);
}

/* -------------------------------------------------------------------------- */
/* Shared bits                                                                 */
/* -------------------------------------------------------------------------- */

function PaneHeader({
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

function IconAction({
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
