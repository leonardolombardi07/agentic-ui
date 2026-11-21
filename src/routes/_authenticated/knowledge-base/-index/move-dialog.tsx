import { useQuery } from "@tanstack/react-query";
import { cn } from "cn";
import { FolderIcon, type LucideIcon } from "lucide-react";
import { type ReactNode, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { moveTargetsQueryOptions } from "@/lib/api/knowledge-base/queries";
import type {
	Destination,
	KnowledgeNode,
	MoveTarget,
} from "@/lib/api/types/knowledge-base";
import { RestrictedBadge, SPACE_KIND_ICONS } from "./space-meta";

type MoveDialogProps = {
	node: KnowledgeNode;
	isPending: boolean;
	onMove: (destination: Destination) => void;
	onClose: () => void;
};

/**
 * Picks where a file or folder goes: the keyboard and touch equivalent of dragging it.
 * It lists only the spaces the user manages, since moving in needs the manager role there.
 */
export function MoveDialog({
	node,
	isPending,
	onMove,
	onClose,
}: MoveDialogProps) {
	const { data: targets } = useQuery(moveTargetsQueryOptions());
	const [selected, setSelected] = useState<Destination>();

	return (
		<Dialog
			open
			onOpenChange={(open) => {
				if (!open) onClose();
			}}
		>
			<DialogContent
				className="max-h-[min(640px,calc(100dvh-2rem))] w-[min(520px,calc(100vw-2rem))]"
				data-testid="kb-move-dialog"
			>
				<div className="flex flex-col gap-1 p-6 pb-3">
					<DialogTitle className="truncate pr-8">
						Move "{node.name}"
					</DialogTitle>
					<DialogDescription>
						Choose a destination in a space you manage. It will be visible to
						everyone with access to that space.
					</DialogDescription>
				</div>

				<div className="min-h-0 flex-1 overflow-y-auto px-4">
					{targets === undefined ? (
						<div className="flex flex-col gap-2 px-2">
							<Skeleton className="h-8 w-full" />
							<Skeleton className="h-8 w-full" />
							<Skeleton className="h-8 w-full" />
						</div>
					) : (
						<ul className="flex flex-col gap-3">
							{targets.map((target) => (
								<TargetTree
									key={target.space.id}
									target={target}
									node={node}
									selected={selected}
									onSelect={setSelected}
								/>
							))}
						</ul>
					)}
				</div>

				<div className="flex justify-end gap-2 p-6 pt-4">
					<Button variant="ghost" onClick={onClose}>
						Cancel
					</Button>
					<Button
						disabled={!selected || isPending}
						onClick={() => {
							if (selected) onMove(selected);
						}}
						data-testid="kb-move-submit"
					>
						Move here
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}

/** One space and its folders, indented by depth. */
function TargetTree({
	target,
	node,
	selected,
	onSelect,
}: {
	target: MoveTarget;
	node: KnowledgeNode;
	selected: Destination | undefined;
	onSelect: (destination: Destination) => void;
}) {
	const { space, folders } = target;

	function renderOption(
		parentId: string | null,
		label: string,
		icon: LucideIcon,
		depth: number,
		badge?: ReactNode,
	) {
		const isCurrent = node.spaceId === space.id && node.parentId === parentId;
		return (
			<Option
				label={label}
				icon={icon}
				depth={depth}
				badge={badge}
				note={isCurrent ? "Current location" : undefined}
				isDisabled={isCurrent}
				isSelected={
					selected?.spaceId === space.id && selected.parentId === parentId
				}
				onSelect={() => onSelect({ spaceId: space.id, parentId })}
			/>
		);
	}

	function renderFolders(parentId: string | null, depth: number): ReactNode {
		return folders
			.filter(
				// A folder can't go into itself, so it and what is inside it are not offered.
				(folder) => folder.parentId === parentId && folder.id !== node.id,
			)
			.map((folder) => (
				<li key={folder.id}>
					<ul className="flex flex-col gap-0.5">
						<li>{renderOption(folder.id, folder.name, FolderIcon, depth)}</li>
						{renderFolders(folder.id, depth + 1)}
					</ul>
				</li>
			));
	}

	return (
		<li>
			<ul className="flex flex-col gap-0.5">
				<li>
					{renderOption(
						null,
						space.name,
						SPACE_KIND_ICONS[space.kind],
						0,
						space.isRestricted ? <RestrictedBadge /> : null,
					)}
				</li>
				{renderFolders(null, 1)}
			</ul>
		</li>
	);
}

function Option({
	label,
	icon: Icon,
	depth,
	badge,
	note,
	isDisabled,
	isSelected,
	onSelect,
}: {
	label: string;
	icon: LucideIcon;
	depth: number;
	badge?: ReactNode;
	note?: string;
	isDisabled: boolean;
	isSelected: boolean;
	onSelect: () => void;
}) {
	return (
		<button
			type="button"
			disabled={isDisabled}
			aria-pressed={isSelected}
			onClick={onSelect}
			className={cn(
				"flex h-8 w-full items-center gap-2 rounded-md pr-2 text-left text-sm outline-none transition-colors duration-120 hover:bg-accent focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:text-muted-foreground",
				depth === 0 && "font-medium",
				isSelected && "bg-brand-soft text-foreground hover:bg-brand-soft",
			)}
			style={{ paddingLeft: `${0.5 + depth * 1.25}rem` }}
			data-testid="kb-move-option"
		>
			<Icon className="size-4 shrink-0 text-muted-foreground" />
			<span className="min-w-0 truncate">{label}</span>
			{badge}
			{note ? (
				<span className="ml-auto shrink-0 text-xs text-muted-foreground">
					{note}
				</span>
			) : null}
		</button>
	);
}
