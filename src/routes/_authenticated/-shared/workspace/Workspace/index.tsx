import { Link } from "@tanstack/react-router";
import { MessageSquarePlusIcon } from "lucide-react";
import { useRef } from "react";
import { buttonVariants } from "@/components/ui/button";
import { ResizeHandle } from "@/components/ui/resize-handle";
import { SPLIT_RATIO } from "../model";
import { useWorkspace, workspace } from "../store";
import { EditorGroup } from "./EditorGroup";

export function Workspace() {
	const groups = useWorkspace((ws) => ws.groups);
	const splitRatio = useWorkspace((ws) => ws.splitRatio);
	const containerRef = useRef<HTMLDivElement>(null);
	const ratioAtDragStart = useRef(splitRatio);
	const isEmpty = groups.length === 1 && groups[0].tabs.length === 0;

	if (isEmpty) return <EmptyState />;

	function pxToRatio(px: number) {
		const width = containerRef.current?.clientWidth ?? 0;
		return width > 0 ? px / width : 0;
	}

	return (
		<div
			ref={containerRef}
			className="flex h-full min-w-0"
			data-testid="workspace"
		>
			{groups.map((group, index) => {
				const share =
					groups.length === 1 ? 1 : index === 0 ? splitRatio : 1 - splitRatio;
				return (
					<div
						key={group.id}
						className={
							index > 0
								? "relative flex min-w-0 border-l border-border"
								: "relative flex min-w-0"
						}
						// flex-grow by share with a 0 basis: the two groups always fill the row exactly.
						style={{ flex: `${share} 1 0px` }}
					>
						<EditorGroup group={group} />
						{index > 0 ? (
							<ResizeHandle
								aria-label="Resize editor groups"
								className="-left-[3.5px]"
								value={splitRatio * 100}
								min={SPLIT_RATIO.min * 100}
								max={SPLIT_RATIO.max * 100}
								onResizeStart={() => {
									ratioAtDragStart.current = workspace.getState().splitRatio;
								}}
								onResize={(deltaX) =>
									workspace.setSplitRatio(
										ratioAtDragStart.current + pxToRatio(deltaX),
									)
								}
								onKeyboardResize={(step) =>
									workspace.setSplitRatio(
										workspace.getState().splitRatio + pxToRatio(step),
									)
								}
								onReset={() => workspace.setSplitRatio(SPLIT_RATIO.default)}
								data-testid="editor-groups-resize"
							/>
						) : null}
					</div>
				);
			})}
		</div>
	);
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
