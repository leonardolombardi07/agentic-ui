import { Link } from "@tanstack/react-router";
import { cn } from "cn";
import { PlusIcon } from "lucide-react";
import { type ReactNode, useRef } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { ResizeHandle } from "@/components/ui/resize-handle";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import type { UploadEntry, VisibleSpace } from "@/lib/api/types/knowledge-base";
import { resizeDrag } from "@/lib/resize-drag";
import { createPersistedStore } from "@/lib/store";
import { useDropTarget } from "./drag";
import { RestrictedBadge, SPACE_KIND_ICONS } from "./space-meta";

const MIN_WIDTH = 176;
const MAX_WIDTH = 420;
const DEFAULT_WIDTH = 224;

/** The tree's width is a preference: long space names need more room in some companies. */
const treeStore = createPersistedStore({
	key: "knowledge-base-space-tree-v1",
	schema: z.object({ width: z.number().min(MIN_WIDTH).max(MAX_WIDTH) }),
	initialState: { width: DEFAULT_WIDTH },
});

function setWidth(width: number) {
	treeStore.setState(() => ({
		width: Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, width)),
	}));
}

type SpaceTreeProps = {
	/** Only the spaces the user can see: the tree never hints at the others. */
	spaces: VisibleSpace[];
	activeSpaceId: string;
	canCreateGroups: boolean;
	onCreateGroup: () => void;
	onDropNode: (space: VisibleSpace, nodeId: string) => void;
	onDropFiles: (space: VisibleSpace, entries: UploadEntry[]) => void;
};

/**
 * The organization as a tree: the user's own files, the company, departments with their
 * teams, and groups. Spaces are also drop targets, to move or upload straight into them.
 */
export function SpaceTree({
	spaces,
	activeSpaceId,
	canCreateGroups,
	onCreateGroup,
	onDropNode,
	onDropFiles,
}: SpaceTreeProps) {
	const width = treeStore.useStore((state) => state.width);
	const widthAtDragStart = useRef(width);
	const visibleIds = new Set(spaces.map((space) => space.id));
	const top = spaces.filter(
		(space) => space.kind === "personal" || space.kind === "company",
	);
	/*
	 * A team whose department the user can't see (a restricted department) is listed at
	 * the top level, so it is still reachable.
	 */
	const departments = spaces.filter(
		(space) =>
			space.kind === "department" ||
			(space.kind === "team" &&
				!(space.parentId && visibleIds.has(space.parentId))),
	);
	const groups = spaces.filter((space) => space.kind === "group");

	function renderItem(space: VisibleSpace, depth = 0) {
		return (
			<SpaceItem
				key={space.id}
				space={space}
				depth={depth}
				isActive={space.id === activeSpaceId}
				onDropNode={(nodeId) => onDropNode(space, nodeId)}
				onDropFiles={(entries) => onDropFiles(space, entries)}
			/>
		);
	}

	return (
		// The wrapper holds the handle: inside the scrolling nav it would scroll away.
		<div
			className="relative flex shrink-0 border-r border-border"
			style={{ width }}
		>
			<nav
				aria-label="Spaces"
				className="flex min-w-0 flex-1 flex-col gap-4 overflow-y-auto p-3"
				data-testid="kb-space-tree"
			>
				<ul className="flex flex-col gap-0.5">
					{top.map((space) => renderItem(space))}
				</ul>

				<Section title="Departments">
					{departments.length === 0 ? (
						<Empty>You are not in a department yet.</Empty>
					) : (
						<ul className="flex flex-col gap-0.5">
							{departments.map((department) => (
								<li key={department.id}>
									<ul className="flex flex-col gap-0.5">
										{renderItem(department)}
										{spaces
											.filter((space) => space.parentId === department.id)
											.map((team) => renderItem(team, 1))}
									</ul>
								</li>
							))}
						</ul>
					)}
				</Section>

				<Section
					title="Groups"
					action={
						canCreateGroups ? (
							<Tooltip>
								<TooltipTrigger
									render={
										<Button
											variant="ghost"
											size="icon-xs"
											aria-label="New group"
											onClick={onCreateGroup}
											data-testid="kb-new-group"
										/>
									}
								>
									<PlusIcon />
								</TooltipTrigger>
								<TooltipContent>New group</TooltipContent>
							</Tooltip>
						) : null
					}
				>
					{groups.length === 0 ? (
						<Empty>
							{canCreateGroups
								? "No groups yet. Create one to share files across departments."
								: "You are not in a group. Department managers create them."}
						</Empty>
					) : (
						<ul className="flex flex-col gap-0.5">
							{groups.map((space) => renderItem(space))}
						</ul>
					)}
				</Section>
			</nav>
			<ResizeHandle
				aria-label="Resize spaces"
				className="-right-[3.5px]"
				value={width}
				min={MIN_WIDTH}
				max={MAX_WIDTH}
				onResizeStart={() => {
					widthAtDragStart.current = treeStore.getState().width;
					resizeDrag.start();
				}}
				onResizeEnd={resizeDrag.end}
				onResize={(deltaX) => setWidth(widthAtDragStart.current + deltaX)}
				onKeyboardResize={(step) => setWidth(treeStore.getState().width + step)}
				onReset={() => setWidth(DEFAULT_WIDTH)}
				data-testid="kb-space-tree-resize"
			/>
		</div>
	);
}

function Section({
	title,
	action,
	children,
}: {
	title: string;
	action?: ReactNode;
	children: ReactNode;
}) {
	return (
		<section className="flex flex-col gap-1">
			<div className="flex h-6 items-center justify-between pr-1 pl-2">
				<h2 className="text-[11px] font-semibold tracking-[0.08em] text-text-dim uppercase">
					{title}
				</h2>
				{action}
			</div>
			{children}
		</section>
	);
}

function Empty({ children }: { children: ReactNode }) {
	return <p className="px-2 text-xs text-muted-foreground">{children}</p>;
}

function SpaceItem({
	space,
	depth,
	isActive,
	onDropNode,
	onDropFiles,
}: {
	space: VisibleSpace;
	depth: number;
	isActive: boolean;
	onDropNode: (nodeId: string) => void;
	onDropFiles: (entries: UploadEntry[]) => void;
}) {
	// Viewers can't add content, so their spaces don't react to a drag at all.
	const { isOver, dropProps } = useDropTarget({
		disabled: space.role !== "manager",
		onDropNode,
		onDropFiles,
	});
	const Icon = SPACE_KIND_ICONS[space.kind];

	return (
		<li {...dropProps}>
			<Link
				to="/knowledge-base"
				search={{ space: space.id }}
				aria-current={isActive ? "page" : undefined}
				className={cn(
					"flex h-8 items-center gap-2 rounded-md pr-2 text-sm text-text-secondary outline-none transition-colors duration-120 hover:bg-accent hover:text-foreground focus-visible:ring-1 focus-visible:ring-ring",
					isActive && "bg-accent font-medium text-foreground",
					isOver && "bg-brand-soft text-foreground ring-1 ring-brand",
				)}
				style={{ paddingLeft: `${0.5 + depth * 1.25}rem` }}
				data-testid="kb-space-item"
				data-space-id={space.id}
			>
				<Icon className="size-4 shrink-0 text-muted-foreground" />
				<span className="min-w-0 flex-1 truncate">{space.name}</span>
				{space.isRestricted ? <RestrictedBadge /> : null}
			</Link>
		</li>
	);
}
