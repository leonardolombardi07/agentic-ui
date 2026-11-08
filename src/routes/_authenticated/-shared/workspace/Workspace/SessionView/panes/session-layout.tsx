import {
	ArrowLeftIcon,
	Maximize2Icon,
	Minimize2Icon,
	XIcon,
} from "lucide-react";
import {
	type ReactNode,
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
} from "react";
import { useWorkspaceCommands } from "../../../commands";
import type { PaneId, Panes, TabRef } from "../../../model";
import { useLayoutSettings } from "../../../settings";
import { useWorkspace, workspace } from "../../../store";
import { DockedPanes, dockedLayout } from "./docked-panes";
import { IconAction, PaneHeader } from "./pane-chrome";
import { DEFAULT_PANE, getPane, type PaneProps } from "./registry";
import { COMPACT_TOOLBAR_BELOW, PaneToolbar } from "./toolbar";
import { usePanesLayout } from "./use-panes-layout";

type SessionLayoutProps = {
	tabRef: TabRef;
	panes: Panes;
	paneProps: PaneProps;
	/** Left side of the session header. */
	breadcrumb: ReactNode;
	/** The chat: transcript and composer. Gets what it needs to open things in the panes. */
	children: (layout: LayoutActions) => ReactNode;
};

export type LayoutActions = {
	/** Shows a file in the Files pane: docked, or as the sheet when narrow. */
	openFile: (fileId: string) => void;
};

/**
 * A session with its panes. The same pieces, arranged by the width this session has
 * (see use-panes-layout.ts):
 *
 *   grid    [ header | chat ] [ columns of stacked panes ]
 *   tabs    [ header | chat ] [ one column, panes as tabs ]
 *   sheet   [ header | chat, the front pane over it ]
 *
 * Resizing never opens or closes panes, it only changes how they are shown. So a group
 * that gets narrow hides its docked panes instead of covering the chat with them; the
 * sheet only shows when asked for here (a header control, a file chip).
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
	// "Overlay" panes never dock, so focus mode wouldn't make room for them.
	const panesDock = useLayoutSettings((s) => s.sessionPanes === "auto");
	const mode = layout?.mode ?? null;
	const [sheetOpen, setSheetOpen] = useState(false);
	const [expanded, setExpanded] = useState<PaneId | null>(null);
	const commands = useWorkspaceCommands();
	const isMaximized = useWorkspace(
		(ws) => ws.maximizedGroupId === tabRef.groupId,
	);

	// The sheet is a request made while narrow: it doesn't carry over a dock and back.
	useEffect(() => {
		if (mode !== "sheet") setSheetOpen(false);
	}, [mode]);

	const ranked = rankByRecent(panes);
	const front = ranked[0];
	const docked =
		layout && layout.mode !== "sheet" && panes.open && panes.views.length > 0
			? dockedLayout(panes, ranked, layout.width, layout.mode)
			: null;
	const sheetPane =
		mode === "sheet" && sheetOpen && panes.open ? front : undefined;
	const expandedPane =
		expanded && docked?.shown.includes(expanded) ? expanded : null;

	/** On screen right now (docked, the front tab, or the sheet). */
	function isShowing(id: PaneId) {
		return docked ? docked.shown.includes(id) : sheetPane === id;
	}

	function handlePaneIcon(id: PaneId) {
		if (mode !== "sheet") {
			// Docked: close what's on screen; anything else comes to the front.
			if (isShowing(id)) workspace.closePane(tabRef, id);
			else workspace.openPane(tabRef, id);
			return;
		}
		// Sheet: the controls are its switcher. The front one hides it again.
		if (isShowing(id)) {
			setSheetOpen(false);
			return;
		}
		workspace.openPane(tabRef, id);
		setSheetOpen(true);
	}

	const panesShown = docked !== null || sheetPane !== undefined;

	function handlePanesToggle() {
		if (mode !== "sheet") {
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

	function openFile(fileId: string) {
		workspace.selectFile(tabRef, fileId);
		if (mode === "sheet") setSheetOpen(true);
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
					{layout ? (
						<PaneToolbar
							mode={layout.mode}
							compact={layout.width < COMPACT_TOOLBAR_BELOW}
							isShowing={isShowing}
							onPaneIcon={handlePaneIcon}
							panesShown={panesShown}
							onPanesToggle={handlePanesToggle}
						/>
					) : null}
				</header>
				<div className="relative flex min-h-0 flex-1 flex-col">
					{children({ openFile })}
					{sheetPane ? (
						<PaneSheet
							pane={sheetPane}
							paneProps={paneProps}
							onHide={() => setSheetOpen(false)}
							onClose={() => closePane(sheetPane)}
							// The way out of "too narrow": give this session the whole main area.
							onFocusMode={
								isMaximized || !panesDock
									? undefined
									: () => commands.toggleMaximized(tabRef.groupId)
							}
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

/** Open panes, most recently used first. Tolerates `recent` missing some (old saves). */
function rankByRecent(panes: Panes): PaneId[] {
	const recent = panes.recent.filter((id) => panes.views.includes(id));
	return [...recent, ...panes.views.filter((id) => !recent.includes(id))];
}

/**
 * The front pane over the chat, below the header (whose icons switch panes). Scoped to
 * this session: no backdrop or focus trap, so the other group stays usable.
 */
function PaneSheet({
	pane,
	paneProps,
	onHide,
	onClose,
	onFocusMode,
}: {
	pane: PaneId;
	paneProps: PaneProps;
	onHide: () => void;
	onClose: () => void;
	/** Absent when already in focus mode. */
	onFocusMode?: () => void;
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
					<>
						{onFocusMode ? (
							<IconAction
								label="Focus mode"
								tooltip="Focus mode: room to show panes beside the chat"
								onClick={onFocusMode}
								testId="sheet-focus-mode"
							>
								<Maximize2Icon />
							</IconAction>
						) : null}
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
