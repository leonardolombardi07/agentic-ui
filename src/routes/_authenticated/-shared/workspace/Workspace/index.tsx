import { Link } from "@tanstack/react-router";
import { MessageSquarePlusIcon } from "lucide-react";
import { useEffect, useRef } from "react";
import { buttonVariants } from "@/components/ui/button";
import { ResizeHandle } from "@/components/ui/resize-handle";
import { resizeDrag } from "@/lib/resize-drag";
import { useWorkspaceCommands } from "../commands";
import { groupSizes, MIN_GROUP_SIZE } from "../model";
import { useWorkspace, workspace } from "../store";
import { EditorGroup } from "./EditorGroup";

export function Workspace() {
	const groups = useWorkspace((ws) => ws.groups);
	const sizesKey = useWorkspace((ws) => groupSizes(ws).join(","));
	const sizes = sizesKey.split(",").map(Number);
	const maximizedGroupId = useWorkspace((ws) => ws.maximizedGroupId);
	useFocusModeShortcut();
	const containerRef = useRef<HTMLDivElement>(null);
	const sizeAtDragStart = useRef(0);
	const isEmpty = groups.length === 1 && groups[0].tabs.length === 0;

	if (isEmpty) return <EmptyState />;

	function pxToShare(px: number) {
		const width = containerRef.current?.clientWidth ?? 0;
		return width > 0 ? px / width : 0;
	}

	const isAlone = groups.length === 1 || maximizedGroupId !== null;
	return (
		<div
			ref={containerRef}
			className="flex h-full min-w-0"
			data-testid="workspace"
		>
			{groups.map((group, index) => {
				/*
				 * Focus mode hides the other groups with CSS rather than unmounting them, so
				 * their scroll positions and composer state are there when focus mode ends.
				 */
				const isHidden =
					maximizedGroupId !== null && group.id !== maximizedGroupId;
				// The divider on a group's left edge resizes it against the group before it.
				const boundary = index - 1;
				return (
					<div
						key={group.id}
						className={
							isHidden
								? "hidden"
								: index > 0 && !isAlone
									? "relative flex min-w-0 border-l border-border"
									: "relative flex min-w-0"
						}
						// flex-grow by share with a 0 basis: the groups always fill the row exactly.
						style={{ flex: `${isAlone ? 1 : sizes[index]} 1 0px` }}
						data-testid="editor-group-column"
					>
						<EditorGroup group={group} />
						{index > 0 && !isAlone ? (
							<ResizeHandle
								aria-label="Resize editor groups"
								className="-left-[3.5px]"
								value={sizes[boundary] * 100}
								min={MIN_GROUP_SIZE * 100}
								max={(sizes[boundary] + sizes[index] - MIN_GROUP_SIZE) * 100}
								onResizeStart={() => {
									sizeAtDragStart.current = groupSizes(workspace.getState())[
										boundary
									];
									resizeDrag.start();
								}}
								onResizeEnd={resizeDrag.end}
								onResize={(deltaX) =>
									workspace.resizeGroups(
										boundary,
										sizeAtDragStart.current + pxToShare(deltaX),
									)
								}
								onKeyboardResize={(step) =>
									workspace.resizeGroups(
										boundary,
										groupSizes(workspace.getState())[boundary] +
											pxToShare(step),
									)
								}
								onReset={() => workspace.resetGroupSize(boundary)}
								data-testid="editor-groups-resize"
							/>
						) : null}
					</div>
				);
			})}
		</div>
	);
}

/** Ctrl/Cmd+. toggles focus mode on the active group, from anywhere in the workspace. */
function useFocusModeShortcut() {
	const commands = useWorkspaceCommands();
	const toggle = useRef(commands.toggleMaximized);
	toggle.current = commands.toggleMaximized;
	useEffect(() => {
		function handleKeyDown(event: KeyboardEvent) {
			if (
				event.key === "." &&
				(event.ctrlKey || event.metaKey) &&
				!event.altKey &&
				!event.shiftKey
			) {
				event.preventDefault();
				toggle.current(workspace.getState().activeGroupId);
			}
		}
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, []);
}

function EmptyState() {
	return (
		<div
			className="flex h-full flex-col items-center justify-center gap-4 text-center"
			data-testid="workspace-empty"
		>
			<h1 className="text-xl font-medium text-foreground">No session open</h1>
			<p className="max-w-sm text-sm text-muted-foreground">
				Pick a session from the side panel or start a new one.
			</p>
			<Link
				to="/sessions/new"
				className={buttonVariants()}
				data-testid="workspace-empty-new-session"
			>
				<MessageSquarePlusIcon />
				New session
			</Link>
		</div>
	);
}
