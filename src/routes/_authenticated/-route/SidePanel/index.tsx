import { Suspense, useRef } from "react";
import { ResizeHandle } from "@/components/ui/resize-handle";
import { SIDEBAR_WIDTH, sidebar, useSidebar } from "../sidebar-store";
import { AgentsView } from "./AgentsView";
import { SessionsView } from "./SessionsView";

/** Depends on client state only, never on the route. Has its own Suspense boundary. */
export function SidePanel() {
	const open = useSidebar((s) => s.open);
	const view = useSidebar((s) => s.view);
	const width = useSidebar((s) => s.width);
	const widthAtDragStart = useRef(width);

	if (!open) return null;

	return (
		<aside
			aria-label={view === "sessions" ? "Sessions" : "Agents"}
			className="relative flex shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground"
			style={{ width }}
			data-testid="side-panel"
		>
			<Suspense
				fallback={
					<p className="p-4 text-sm text-muted-foreground">Loading...</p>
				}
			>
				{view === "sessions" ? <SessionsView /> : <AgentsView />}
			</Suspense>
			<ResizeHandle
				aria-label="Resize side panel"
				className="-right-[3.5px]"
				value={width}
				min={SIDEBAR_WIDTH.min}
				max={SIDEBAR_WIDTH.max}
				onResizeStart={() => {
					widthAtDragStart.current = sidebar.getWidth();
				}}
				onResize={(deltaX) =>
					sidebar.setWidth(widthAtDragStart.current + deltaX)
				}
				onKeyboardResize={(step) => sidebar.setWidth(sidebar.getWidth() + step)}
				onReset={() => sidebar.setWidth(SIDEBAR_WIDTH.default)}
				data-testid="side-panel-resize"
			/>
		</aside>
	);
}
