import { Link } from "@tanstack/react-router";
import { cn } from "cn";
import {
	CheckCircle2Icon,
	ChevronRightIcon,
	EllipsisIcon,
	FileUpIcon,
	FolderIcon,
	FolderInputIcon,
	FolderPlusIcon,
	FolderUpIcon,
	LoaderIcon,
	PencilIcon,
	Trash2Icon,
	UploadIcon,
	UsersIcon,
} from "lucide-react";
import { type ChangeEvent, type ReactNode, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import type {
	Destination,
	FolderContents,
	KnowledgeNode,
	UploadEntry,
} from "@/lib/api/types/knowledge-base";
import { formatBytes, resolveFileType } from "@/lib/file-preview";
import { entriesOfFiles, NODE_DRAG_TYPE, useDropTarget } from "./drag";
import { openFileSearch } from "./search";
import {
	describeRole,
	formatDate,
	RestrictedBadge,
	RoleChip,
	SPACE_KIND_ICONS,
	SPACE_KIND_LABELS,
} from "./space-meta";

type BrowserProps = {
	contents: FolderContents;
	/** The file open in the preview panel, to mark its row. */
	openFileId: string | undefined;
	onUpload: (parentId: string | null, entries: UploadEntry[]) => void;
	/** `folderName` is the folder it lands in, when it is not the root of the space. */
	onMove: (
		node: KnowledgeNode,
		destination: Destination,
		folderName?: string,
	) => void;
	onNewFolder: () => void;
	onRename: (node: KnowledgeNode) => void;
	onDelete: (node: KnowledgeNode) => void;
	/** Opens the "Move to" dialog: the way to move without dragging. */
	onPickDestination: (node: KnowledgeNode) => void;
	onOpenAccess: () => void;
};

/**
 * One folder of a space: where the user is, what they may do there, and its content.
 * Everything a drag does has a button or menu item too.
 */
export function Browser({
	contents,
	openFileId,
	onUpload,
	onMove,
	onNewFolder,
	onRename,
	onDelete,
	onPickDestination,
	onOpenAccess,
}: BrowserProps) {
	const { space, path, nodes } = contents;
	const canManage = space.role === "manager";
	const folderId = path[path.length - 1]?.id ?? null;

	/*
	 * Viewers get the drop target too, so a file dropped by mistake is explained instead
	 * of being opened by the browser in place of the app.
	 */
	const { isOver, dropProps } = useDropTarget({
		onDropFiles: (entries) => onUpload(folderId, entries),
	});

	function moveById(
		nodeId: string,
		parentId: string | null,
		folderName?: string,
	) {
		const node = nodes.find((n) => n.id === nodeId);
		if (node) onMove(node, { spaceId: space.id, parentId }, folderName);
	}

	return (
		<section
			{...dropProps}
			aria-label={`${space.name} files`}
			className="relative flex min-h-full flex-col gap-4 px-6 py-5"
			data-testid="kb-browser"
		>
			<div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
				<div className="flex min-w-0 flex-col gap-1">
					<Breadcrumb
						contents={contents}
						onDropNode={moveById}
						onDropFiles={onUpload}
					/>
					<p
						className="text-sm text-muted-foreground"
						data-testid="kb-role-hint"
					>
						{SPACE_KIND_LABELS[space.kind]}
						{" - "}
						{describeRole(space)}
					</p>
				</div>

				<div className="flex flex-wrap items-center gap-2">
					{space.kind === "personal" ? null : (
						<Button
							variant="outline"
							onClick={onOpenAccess}
							data-testid="kb-open-access"
						>
							<UsersIcon />
							{canManage ? "Manage access" : "Who has access"}
						</Button>
					)}
					{canManage ? (
						<>
							<Button
								variant="outline"
								onClick={onNewFolder}
								data-testid="kb-new-folder"
							>
								<FolderPlusIcon />
								New folder
							</Button>
							<UploadMenu onPick={(entries) => onUpload(folderId, entries)} />
						</>
					) : null}
				</div>
			</div>

			{nodes.length === 0 ? (
				<div
					className="flex flex-1 flex-col items-center justify-center gap-2 rounded-card border border-dashed border-border py-20 text-center"
					data-testid="kb-empty"
				>
					<FolderIcon className="size-8 text-text-dim" />
					<p className="text-sm font-medium">This folder is empty</p>
					<p className="max-w-sm text-sm text-muted-foreground">
						{canManage
							? "Drop files or folders here, or use Upload. They become searchable, for people and agents with access, once indexed."
							: "Managers of this space haven't added anything here yet."}
					</p>
				</div>
			) : (
				<table
					className="w-full table-fixed text-sm"
					data-testid="kb-node-list"
				>
					<thead>
						<tr className="border-b border-border text-left text-xs text-muted-foreground">
							<th className="py-2 pr-3 font-medium">Name</th>
							<th className="hidden w-28 py-2 pr-3 font-medium @lg:table-cell">
								Search
							</th>
							<th className="hidden w-52 py-2 pr-3 font-medium @3xl:table-cell">
								Last change
							</th>
							<th className="hidden w-20 py-2 pr-3 text-right font-medium @md:table-cell">
								Size
							</th>
							<th className="w-10 py-2">
								<span className="sr-only">Actions</span>
							</th>
						</tr>
					</thead>
					<tbody>
						{nodes.map((node) => (
							<NodeRow
								key={node.id}
								node={node}
								canManage={canManage}
								isOpen={node.id === openFileId}
								onDropNode={(nodeId) => moveById(nodeId, node.id, node.name)}
								onDropFiles={(entries) => onUpload(node.id, entries)}
								onRename={() => onRename(node)}
								onDelete={() => onDelete(node)}
								onPickDestination={() => onPickDestination(node)}
							/>
						))}
					</tbody>
				</table>
			)}

			{isOver ? (
				<div
					className="pointer-events-none absolute inset-2 z-10 flex items-center justify-center rounded-card border-2 border-dashed border-brand bg-brand-soft backdrop-blur-[1px]"
					data-testid="kb-drop-overlay"
				>
					<p className="rounded-full bg-background px-4 py-2 text-sm font-medium shadow-md">
						{canManage
							? `Drop to upload to ${path[path.length - 1]?.name ?? space.name}`
							: `Only managers can add files to ${space.name}`}
					</p>
				</div>
			) : null}
		</section>
	);
}

const crumbClassName =
	"flex min-w-0 items-center gap-1.5 rounded-md px-1.5 py-0.5 outline-none transition-colors duration-120 hover:bg-accent focus-visible:ring-1 focus-visible:ring-ring";

/** Space > folder > folder. Each step is a link and, for managers, a drop target. */
function Breadcrumb({
	contents,
	onDropNode,
	onDropFiles,
}: {
	contents: FolderContents;
	onDropNode: (
		nodeId: string,
		parentId: string | null,
		folderName?: string,
	) => void;
	onDropFiles: (parentId: string | null, entries: UploadEntry[]) => void;
}) {
	const { space, path } = contents;
	const canManage = space.role === "manager";
	const Icon = SPACE_KIND_ICONS[space.kind];

	return (
		<nav aria-label="Breadcrumb" data-testid="kb-breadcrumb">
			<ol className="-ml-1.5 flex flex-wrap items-center gap-0.5 text-lg font-medium">
				<Crumb
					isCurrent={path.length === 0}
					canDrop={canManage && path.length > 0}
					onDropNode={(nodeId) => onDropNode(nodeId, null)}
					onDropFiles={(entries) => onDropFiles(null, entries)}
				>
					<Link
						to="/knowledge-base"
						search={{ space: space.id }}
						className={crumbClassName}
					>
						<Icon className="size-4.5 shrink-0 text-muted-foreground" />
						<span className="truncate">{space.name}</span>
					</Link>
				</Crumb>
				{path.map((folder, index) => {
					const isCurrent = index === path.length - 1;
					return (
						<Crumb
							key={folder.id}
							isCurrent={isCurrent}
							canDrop={canManage && !isCurrent}
							onDropNode={(nodeId) =>
								onDropNode(nodeId, folder.id, folder.name)
							}
							onDropFiles={(entries) => onDropFiles(folder.id, entries)}
						>
							<ChevronRightIcon
								aria-hidden
								className="size-4 shrink-0 text-text-dim"
							/>
							<Link
								to="/knowledge-base"
								search={{ space: space.id, folder: folder.id }}
								className={crumbClassName}
							>
								<span className="truncate">{folder.name}</span>
							</Link>
						</Crumb>
					);
				})}
				<li className="ml-1.5 flex items-center gap-2">
					{space.isRestricted ? <RestrictedBadge variant="pill" /> : null}
					<RoleChip space={space} />
				</li>
			</ol>
		</nav>
	);
}

function Crumb({
	isCurrent,
	canDrop,
	onDropNode,
	onDropFiles,
	children,
}: {
	isCurrent: boolean;
	canDrop: boolean;
	onDropNode: (nodeId: string) => void;
	onDropFiles: (entries: UploadEntry[]) => void;
	children: ReactNode;
}) {
	const { isOver, dropProps } = useDropTarget({
		disabled: !canDrop,
		onDropNode,
		onDropFiles,
	});
	return (
		<li
			{...dropProps}
			aria-current={isCurrent ? "page" : undefined}
			className={cn(
				"flex min-w-0 items-center gap-0.5 rounded-md",
				!isCurrent && "text-muted-foreground",
				isOver && "bg-brand-soft text-foreground ring-1 ring-brand",
			)}
		>
			{children}
		</li>
	);
}

/** Upload files or a whole folder: the same as dropping them on the page. */
function UploadMenu({ onPick }: { onPick: (entries: UploadEntry[]) => void }) {
	const filesInput = useRef<HTMLInputElement>(null);
	const folderInput = useRef<HTMLInputElement>(null);

	function handleChange(event: ChangeEvent<HTMLInputElement>) {
		const entries = entriesOfFiles(event.target.files);
		// Reset, so picking the same file again still fires a change.
		event.target.value = "";
		if (entries.length > 0) onPick(entries);
	}

	return (
		<>
			<input
				ref={filesInput}
				type="file"
				multiple
				hidden
				tabIndex={-1}
				onChange={handleChange}
				data-testid="kb-upload-files-input"
			/>
			<input
				ref={(element) => {
					folderInput.current = element;
					// Not a React prop: the attribute is what makes the picker choose a folder.
					element?.setAttribute("webkitdirectory", "");
				}}
				type="file"
				hidden
				tabIndex={-1}
				onChange={handleChange}
				data-testid="kb-upload-folder-input"
			/>
			<DropdownMenu>
				<DropdownMenuTrigger render={<Button data-testid="kb-upload" />}>
					<UploadIcon />
					Upload
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end">
					<DropdownMenuItem
						onClick={() => filesInput.current?.click()}
						data-testid="kb-upload-files"
					>
						<FileUpIcon />
						Files
					</DropdownMenuItem>
					<DropdownMenuItem
						onClick={() => folderInput.current?.click()}
						data-testid="kb-upload-folder"
					>
						<FolderUpIcon />
						Folder
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		</>
	);
}

function NodeRow({
	node,
	canManage,
	isOpen,
	onDropNode,
	onDropFiles,
	onRename,
	onDelete,
	onPickDestination,
}: {
	node: KnowledgeNode;
	canManage: boolean;
	/** Its preview is showing. */
	isOpen: boolean;
	onDropNode: (nodeId: string) => void;
	onDropFiles: (entries: UploadEntry[]) => void;
	onRename: () => void;
	onDelete: () => void;
	onPickDestination: () => void;
}) {
	// Only folders take drops; a file row lets the drag through to the folder area.
	const { isOver, dropProps } = useDropTarget({
		disabled: !canManage || node.kind !== "folder",
		onDropNode,
		onDropFiles,
	});
	const Icon = node.kind === "folder" ? FolderIcon : resolveFileType(node).icon;

	return (
		<tr
			{...dropProps}
			draggable={canManage}
			onDragStart={(event) => {
				event.dataTransfer.setData(NODE_DRAG_TYPE, node.id);
				event.dataTransfer.effectAllowed = "move";
			}}
			className={cn(
				"group border-b border-border transition-colors duration-120 hover:bg-accent",
				canManage && "cursor-grab active:cursor-grabbing",
				isOpen && "bg-accent",
				isOver && "bg-brand-soft outline-1 -outline-offset-1 outline-brand",
			)}
			data-testid="kb-node-row"
			data-node-id={node.id}
			data-node-kind={node.kind}
			data-open={isOpen ? "" : undefined}
		>
			<td className="py-2 pr-3">
				<div className="flex min-w-0 items-center gap-2.5">
					<Icon
						className={cn(
							"size-4.5 shrink-0",
							node.kind === "folder"
								? "fill-brand-soft text-brand-text"
								: "text-muted-foreground",
						)}
					/>
					{node.kind === "folder" ? (
						<Link
							to="/knowledge-base"
							search={{ space: node.spaceId, folder: node.id }}
							draggable={false}
							className="min-w-0 truncate rounded-sm font-medium outline-none hover:underline focus-visible:ring-1 focus-visible:ring-ring"
							data-testid="kb-folder-link"
						>
							{node.name}
						</Link>
					) : (
						<Link
							to="."
							search={(prev) => ({ ...prev, ...openFileSearch(node.id) })}
							// The row is what gets dragged, not the link.
							draggable={false}
							className="min-w-0 truncate rounded-sm text-foreground outline-none hover:underline focus-visible:ring-1 focus-visible:ring-ring"
							title={node.name}
							data-testid="kb-file-link"
						>
							{node.name}
						</Link>
					)}
				</div>
			</td>
			<td className="hidden py-2 pr-3 @lg:table-cell">
				{node.kind === "file" ? (
					<IndexStatus status={node.indexStatus} />
				) : null}
			</td>
			<td className="hidden truncate py-2 pr-3 text-muted-foreground @3xl:table-cell">
				{formatDate(node.updatedAt)}
				{" - "}
				{node.updatedBy}
			</td>
			<td className="hidden py-2 pr-3 text-right text-muted-foreground tabular-nums @md:table-cell">
				{node.kind === "file" ? formatBytes(node.size) : null}
			</td>
			<td className="py-1">
				{canManage ? (
					<DropdownMenu>
						<Tooltip>
							<TooltipTrigger
								render={
									<DropdownMenuTrigger
										render={
											<Button
												variant="ghost"
												size="icon-sm"
												aria-label={`Actions for ${node.name}`}
												data-testid="kb-node-actions"
											/>
										}
									/>
								}
							>
								<EllipsisIcon />
							</TooltipTrigger>
							<TooltipContent>Actions</TooltipContent>
						</Tooltip>
						<DropdownMenuContent align="end">
							<DropdownMenuItem
								onClick={onPickDestination}
								data-testid="kb-node-move"
							>
								<FolderInputIcon />
								Move to...
							</DropdownMenuItem>
							<DropdownMenuItem onClick={onRename} data-testid="kb-node-rename">
								<PencilIcon />
								Rename
							</DropdownMenuItem>
							<DropdownMenuSeparator />
							<DropdownMenuItem
								variant="destructive"
								onClick={onDelete}
								data-testid="kb-node-delete"
							>
								<Trash2Icon className="text-destructive-foreground" />
								Delete
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				) : null}
			</td>
		</tr>
	);
}

/** Whether search and agents can find the file yet. */
function IndexStatus({ status }: { status: "indexing" | "indexed" }) {
	const isIndexed = status === "indexed";
	return (
		<Tooltip>
			<TooltipTrigger
				render={
					<span
						className="inline-flex cursor-default items-center gap-1.5 text-xs text-muted-foreground"
						data-testid="kb-index-status"
						data-status={status}
					/>
				}
			>
				{isIndexed ? (
					<CheckCircle2Icon className="size-3.5 text-success" />
				) : (
					<LoaderIcon className="size-3.5 animate-spin" />
				)}
				{isIndexed ? "Indexed" : "Indexing..."}
			</TooltipTrigger>
			<TooltipContent className="max-w-64">
				{isIndexed
					? "Search and agents can find it, for people with access to this space."
					: "Being read and indexed. It shows up in search in a few seconds."}
			</TooltipContent>
		</Tooltip>
	);
}
