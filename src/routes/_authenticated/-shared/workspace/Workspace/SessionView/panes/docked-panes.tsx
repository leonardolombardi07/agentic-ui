import { cn } from "cn";
import { Maximize2Icon, XIcon } from "lucide-react";
import { useRef } from "react";
import { ResizeHandle } from "@/components/ui/resize-handle";
import {
	defaultPanesSize,
	PANES_PER_COLUMN,
	type PaneId,
	type Panes,
	type TabRef,
} from "../../../model";
import { workspace } from "../../../store";
import { IconAction, PaneHeader } from "./pane-chrome";
import { getPane, type PaneProps } from "./registry";
import { CHAT_MIN_WIDTH, PANE_COLUMN_MIN_WIDTH } from "./use-panes-layout";

/* -------------------------------------------------------------------------- */
/* Layout math                                                                 */
/* -------------------------------------------------------------------------- */

export type DockedLayout = {
	arrangement: "grid" | "tabs";
	/** Panes in each column, in open order. With tabs: one column, all open panes. */
	columns: PaneId[][];
	/** Panes on screen. With tabs, only the front one. */
	shown: PaneId[];
	/** Panes width in px, and the bounds a drag keeps it in. */
	px: number;
	min: number;
	max: number;
};

/**
 * `ranked` is the open panes, most recently used first.
 * - grid: as many columns as fit beside the chat. If there are more panes than room
 *   (only while a drag holds the grid), the most recent show and the rest stay open.
 * - tabs: one column holding every open pane as a tab; the most recent shows.
 */
export function dockedLayout(
	panes: Panes,
	ranked: PaneId[],
	width: number,
	arrangement: "grid" | "tabs",
): DockedLayout {
	let columns: PaneId[][];
	let shown: PaneId[];
	if (arrangement === "tabs") {
		columns = [panes.views];
		shown = ranked.slice(0, 1);
	} else {
		const maxColumns = Math.max(
			1,
			Math.floor((width - CHAT_MIN_WIDTH) / PANE_COLUMN_MIN_WIDTH),
		);
		const fit = ranked.slice(0, maxColumns * PANES_PER_COLUMN);
		shown = panes.views.filter((id) => fit.includes(id));
		columns = [];
		for (let i = 0; i < shown.length; i += PANES_PER_COLUMN) {
			columns.push(shown.slice(i, i + PANES_PER_COLUMN));
		}
	}
	const min = columns.length * PANE_COLUMN_MIN_WIDTH;
	const max = Math.max(min, width - CHAT_MIN_WIDTH);
	const px = Math.min(max, Math.max(min, panes.size * width));
	return { arrangement, columns, shown, px, min, max };
}

/* -------------------------------------------------------------------------- */
/* Docked panes                                                                */
/* -------------------------------------------------------------------------- */

/** The panes beside the chat: a grid of columns, or one column of tabs. Resizable. */
export function DockedPanes({
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
			data-arrangement={layout.arrangement}
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
			{layout.arrangement === "tabs" && layout.shown[0] ? (
				<TabbedColumn
					tabRef={tabRef}
					tabs={layout.columns[0] ?? []}
					front={layout.shown[0]}
					paneProps={paneProps}
					onExpand={onExpand}
					onClose={onClose}
				/>
			) : (
				layout.columns.map((column, index) => (
					<div
						// Keyed by position: a column stays mounted while its panes change.
						// biome-ignore lint/suspicious/noArrayIndexKey: see above
						key={index}
						className="flex min-w-0 flex-1 flex-col border-l border-border first:border-l-0"
					>
						{column.map((id) => (
							<StackedPane
								key={id}
								tabRef={tabRef}
								pane={id}
								paneProps={paneProps}
								onExpand={() => onExpand(id)}
								onClose={() => onClose(id)}
							/>
						))}
					</div>
				))
			)}
		</aside>
	);
}

/** Using a pane (pointer or focus inside it) makes it the most recent. */
function touchHandlers(tabRef: TabRef, pane: PaneId) {
	function touch() {
		workspace.touchPane(tabRef, pane);
	}
	return { onPointerDownCapture: touch, onFocusCapture: touch };
}

/** Grid: one pane in a column, with its own header. */
function StackedPane({
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
	return (
		<section
			aria-label={def.label}
			className="flex min-h-0 flex-1 flex-col border-t border-border first:border-t-0"
			{...touchHandlers(tabRef, pane)}
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

/**
 * Tabs: room for one column only, so the open panes share it as tabs (stacking them
 * would leave each too short to use). The tab strip doubles as the panes' header.
 */
function TabbedColumn({
	tabRef,
	tabs,
	front,
	paneProps,
	onExpand,
	onClose,
}: {
	tabRef: TabRef;
	tabs: PaneId[];
	front: PaneId;
	paneProps: PaneProps;
	onExpand: (id: PaneId) => void;
	onClose: (id: PaneId) => void;
}) {
	const def = getPane(front);
	return (
		<div className="flex min-w-0 flex-1 flex-col" data-testid="panes-tabs">
			<div className="flex h-10 shrink-0 items-stretch border-b border-border">
				<div
					role="tablist"
					aria-label="Open panes"
					className="flex min-w-0 flex-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
				>
					{tabs.map((id) => {
						const tab = getPane(id);
						const Icon = tab.icon;
						const isFront = id === front;
						return (
							<div
								key={id}
								className={cn(
									"group/pane-tab flex min-w-0 shrink-0 items-center border-r border-border pr-0.5 text-sm",
									isFront
										? "bg-background text-foreground shadow-[inset_0_-2px_0_var(--brand)]"
										: "text-muted-foreground hover:bg-accent",
								)}
							>
								<button
									type="button"
									role="tab"
									id={`pane-tab-${tabRef.tabId}-${id}`}
									aria-selected={isFront}
									aria-controls={`pane-panel-${tabRef.tabId}`}
									// Roving focus isn't worth it for four tabs; each is a plain stop.
									className="flex min-w-0 items-center gap-1.5 py-2 pl-2.5 outline-none focus-visible:underline"
									onClick={() => workspace.openPane(tabRef, id)}
									data-testid={`pane-tab-${id}`}
								>
									<Icon aria-hidden className="size-3.5 shrink-0" />
									<span className="max-w-32 truncate">{tab.label}</span>
								</button>
								<IconAction
									label={`Close ${tab.label}`}
									onClick={() => onClose(id)}
									testId={`pane-close-${id}`}
								>
									<XIcon />
								</IconAction>
							</div>
						);
					})}
				</div>
				<div className="flex shrink-0 items-center px-1">
					<IconAction
						label="Full size"
						onClick={() => onExpand(front)}
						testId={`pane-expand-${front}`}
					>
						<Maximize2Icon />
					</IconAction>
				</div>
			</div>
			<section
				id={`pane-panel-${tabRef.tabId}`}
				role="tabpanel"
				aria-labelledby={`pane-tab-${tabRef.tabId}-${front}`}
				className="min-h-0 flex-1 overflow-y-auto"
				{...touchHandlers(tabRef, front)}
				data-testid={`pane-${front}`}
			>
				{def.render(paneProps)}
			</section>
		</div>
	);
}
