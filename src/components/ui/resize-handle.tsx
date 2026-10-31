import { cn } from "cn";
import { type ComponentProps, useRef } from "react";

type ResizeHandleProps = Omit<ComponentProps<"div">, "onResize"> & {
	/** Accessible name, e.g. "Resize side panel". */
	"aria-label": string;
	/** Current value and bounds, announced by screen readers (role="separator"). */
	value: number;
	min: number;
	max: number;
	/** Called once when a drag starts, so the caller can remember the starting size. */
	onResizeStart?: () => void;
	/** Total horizontal movement in px since the drag started (not per event: no drift). */
	onResize: (deltaX: number) => void;
	/** Arrow keys: a signed step in px (Shift = bigger step). */
	onKeyboardResize: (stepX: number) => void;
	/** Double-click or Enter. */
	onReset?: () => void;
};

/**
 * Vertical drag handle. Place it absolutely over the border it resizes; its parent
 * must be `relative`. Uses pointer capture, so the drag survives leaving the handle.
 */
function ResizeHandle({
	className,
	value,
	min,
	max,
	onResizeStart,
	onResize,
	onKeyboardResize,
	onReset,
	...props
}: ResizeHandleProps) {
	const startX = useRef<number | null>(null);

	function endDrag() {
		if (startX.current === null) return;
		startX.current = null;
		document.documentElement.style.removeProperty("cursor");
		document.documentElement.style.removeProperty("user-select");
	}

	return (
		// biome-ignore lint/a11y/useSemanticElements: <hr> can't be focusable or draggable; role="separator" with a value is the ARIA pattern for splitters.
		<div
			role="separator"
			aria-orientation="vertical"
			aria-valuenow={Math.round(value)}
			aria-valuemin={Math.round(min)}
			aria-valuemax={Math.round(max)}
			tabIndex={0}
			data-slot="resize-handle"
			className={cn(
				"group/resize absolute top-0 bottom-0 z-10 w-1.5 cursor-col-resize touch-none outline-none select-none",
				"after:absolute after:inset-y-0 after:left-1/2 after:w-px after:-translate-x-1/2 after:transition-colors after:delay-150 after:duration-100",
				"hover:after:w-0.5 hover:after:bg-brand focus-visible:after:w-0.5 focus-visible:after:bg-brand data-dragging:after:w-0.5 data-dragging:after:bg-brand data-dragging:after:delay-0",
				className,
			)}
			onPointerDown={(event) => {
				if (event.button !== 0) return;
				event.preventDefault();
				event.currentTarget.setPointerCapture(event.pointerId);
				event.currentTarget.dataset.dragging = "";
				startX.current = event.clientX;
				// Keep the resize cursor and stop text selection while the pointer is elsewhere.
				document.documentElement.style.cursor = "col-resize";
				document.documentElement.style.userSelect = "none";
				onResizeStart?.();
			}}
			onPointerMove={(event) => {
				if (startX.current === null) return;
				onResize(event.clientX - startX.current);
			}}
			onLostPointerCapture={(event) => {
				delete event.currentTarget.dataset.dragging;
				endDrag();
			}}
			onDoubleClick={onReset}
			onKeyDown={(event) => {
				const step = event.shiftKey ? 50 : 10;
				if (event.key === "ArrowLeft") onKeyboardResize(-step);
				else if (event.key === "ArrowRight") onKeyboardResize(step);
				else if (event.key === "Enter" && onReset) onReset();
				else return;
				event.preventDefault();
			}}
			{...props}
		/>
	);
}

export { ResizeHandle };
