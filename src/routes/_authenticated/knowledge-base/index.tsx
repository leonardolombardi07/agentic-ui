import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CircleHelpIcon, SearchIcon, XIcon } from "lucide-react";
import { type DragEvent, useEffect, useRef, useState } from "react";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { snackbar } from "@/components/ui/snackbar";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import {
	createFolderMutationOptions,
	deleteNodeMutationOptions,
	folderQueryOptions,
	knowledgeSessionQueryOptions,
	moveNodeMutationOptions,
	renameNodeMutationOptions,
	spacesQueryOptions,
	uploadMutationOptions,
	viewAsMutationOptions,
} from "@/lib/api/knowledge-base/queries";
import type {
	Destination,
	KnowledgeNode,
	UploadEntry,
	VisibleSpace,
} from "@/lib/api/types/knowledge-base";
import { seo } from "@/lib/seo";
import { AccessDialog } from "./-index/access-dialog";
import { Browser } from "./-index/browser";
import { ConfirmDialog } from "./-index/confirm-dialog";
import { CreateGroupDialog } from "./-index/create-group-dialog";
import { FilePanel } from "./-index/file-panel";
import { MoveDialog } from "./-index/move-dialog";
import { NameDialog } from "./-index/name-dialog";
import {
	KnowledgeBaseSearchSchema,
	openFileSearch,
	resolveSpaceId,
} from "./-index/search";
import { SearchResults } from "./-index/search-results";
import { SpaceTree } from "./-index/space-tree";
import { ViewAs } from "./-index/view-as";

export const Route = createFileRoute("/_authenticated/knowledge-base/")({
	validateSearch: KnowledgeBaseSearchSchema,
	loaderDeps: ({ search }) => ({ space: search.space, folder: search.folder }),
	loader: async ({ context: { queryClient }, deps }) => {
		const [spaces] = await Promise.all([
			queryClient.ensureQueryData(spacesQueryOptions()),
			queryClient.ensureQueryData(knowledgeSessionQueryOptions()),
		]);
		// Awaited, so opening a folder swaps the list in one go instead of flashing a fallback.
		await queryClient.ensureQueryData(
			folderQueryOptions(
				resolveSpaceId(spaces, deps.space),
				deps.folder ?? null,
			),
		);
	},
	head: () => ({
		meta: seo({
			title: "Knowledge Base",
			description:
				"The files your company, departments, teams and groups share with people and agents.",
		}),
	}),
	component: KnowledgeBase,
});

/** The one dialog that is open, if any. */
type DialogState =
	/** Tied to a space, not to "the open one": losing access to it closes the dialog. */
	| { type: "access"; spaceId: string }
	| { type: "new-folder" }
	| { type: "new-group" }
	| { type: "rename"; node: KnowledgeNode }
	| { type: "delete"; node: KnowledgeNode }
	| { type: "move"; node: KnowledgeNode }
	/** A move out of a restricted space, waiting for the user to confirm. */
	| {
			type: "confirm-move";
			node: KnowledgeNode;
			destination: Destination;
			from: VisibleSpace;
			to: VisibleSpace;
			targetName: string;
	  };

function KnowledgeBase() {
	const search = Route.useSearch();
	const navigate = Route.useNavigate();
	const { data: session } = useSuspenseQuery(knowledgeSessionQueryOptions());
	const { data: spaces } = useSuspenseQuery(spacesQueryOptions());
	const spaceId = resolveSpaceId(spaces, search.space);
	const { data: contents } = useSuspenseQuery(
		folderQueryOptions(spaceId, search.folder ?? null),
	);
	const [dialog, setDialog] = useState<DialogState>();

	const viewAs = useMutation(viewAsMutationOptions());
	const upload = useMutation(uploadMutationOptions());
	const move = useMutation(moveNodeMutationOptions());
	const createFolder = useMutation(createFolderMutationOptions());
	const rename = useMutation(renameNodeMutationOptions());
	const remove = useMutation(deleteNodeMutationOptions());

	const q = search.q?.trim() ?? "";
	const activeSpace = spaces.find((space) => space.id === spaceId);
	const folderId = contents?.path[contents.path.length - 1]?.id ?? null;

	function closeDialog() {
		setDialog(undefined);
	}

	function showError(error: Error) {
		snackbar.show(error.message);
	}

	function handleUpload(
		space: VisibleSpace,
		parentId: string | null,
		entries: UploadEntry[],
	) {
		// The backend refuses it too; this just says why, in the user's terms.
		if (space.role !== "manager") {
			snackbar.show(`Only managers can add files to ${space.name}.`);
			return;
		}
		upload.mutate(
			{ spaceId: space.id, parentId, entries },
			{
				onSuccess: (count) =>
					snackbar.show(
						`${count} ${count === 1 ? "file" : "files"} uploaded to ${space.name}. Searchable once indexed.`,
					),
				onError: showError,
			},
		);
	}

	function runMove(
		node: KnowledgeNode,
		destination: Destination,
		/** Where it lands, in the user's words: the folder if one was named, else the space. */
		targetName: string,
	) {
		move.mutate(
			{ nodeId: node.id, ...destination },
			{
				onSuccess: () => {
					closeDialog();
					snackbar.show(`"${node.name}" moved to ${targetName}.`);
				},
				onError: showError,
			},
		);
	}

	/** Every move goes through here, dragged or picked, so the restricted check can't be skipped. */
	function requestMove(
		node: KnowledgeNode,
		destination: Destination,
		folderName?: string,
	) {
		const from = spaces.find((space) => space.id === node.spaceId);
		const to = spaces.find((space) => space.id === destination.spaceId);
		if (!from || !to) return;
		const isSamePlace =
			node.spaceId === destination.spaceId &&
			node.parentId === destination.parentId;
		// Dropped on itself or where it already is: nothing to do.
		if (isSamePlace || node.id === destination.parentId) return;
		// Leaving a restricted space always changes who can read it, even into another restricted one.
		if (from.isRestricted && from.id !== to.id) {
			setDialog({
				type: "confirm-move",
				node,
				destination,
				from,
				to,
				targetName: folderName ?? to.name,
			});
			return;
		}
		runMove(node, destination, folderName ?? to.name);
	}

	return (
		// biome-ignore lint/a11y/noStaticElementInteractions: guards against stray drops, it is not a control
		<div
			className="relative flex h-full flex-col"
			/*
			 * Files dropped where nothing takes them (the header, search results, a space the
			 * user only reads) are ignored, instead of the browser opening them over the app.
			 */
			onDragOver={ignoreStrayFiles}
			onDrop={ignoreStrayFiles}
			data-testid="knowledge-base"
		>
			<header className="flex shrink-0 items-center gap-4 border-b border-border px-6 py-3">
				<h1 className="shrink-0 text-lg font-medium tracking-tight">
					Knowledge Base
				</h1>
				<SearchBox
					value={search.q ?? ""}
					onChange={(value) =>
						void navigate({
							search: (prev) => ({ ...prev, q: value || undefined }),
							replace: true,
						})
					}
				/>
				<Link
					to="/knowledge-base/how-to-use"
					className={buttonVariants({ variant: "ghost" })}
					data-testid="kb-how-to-use-link"
				>
					<CircleHelpIcon />
					How to use
				</Link>
				<ViewAs
					session={session}
					isPending={viewAs.isPending}
					onChange={(userId) => {
						closeDialog();
						viewAs.mutate(userId, {
							/*
							 * Back to the default space: the one that was open may not exist for
							 * this person.
							 */
							onSuccess: () => void navigate({ search: {} }),
							onError: showError,
						});
					}}
				/>
			</header>

			<div className="flex min-h-0 flex-1">
				<SpaceTree
					spaces={spaces}
					activeSpaceId={q ? "" : spaceId}
					canCreateGroups={session.canCreateGroups}
					onCreateGroup={() => setDialog({ type: "new-group" })}
					onDropNode={(space, nodeId) => {
						const node = contents?.nodes.find((n) => n.id === nodeId);
						if (node) requestMove(node, { spaceId: space.id, parentId: null });
					}}
					onDropFiles={(space, entries) => handleUpload(space, null, entries)}
				/>

				{/* A container: the list drops columns by its own width, since the side panel takes a varying share. */}
				<div className="@container min-w-0 flex-1 overflow-y-auto">
					{q ? (
						<SearchResults
							q={q}
							scope={search.scope ?? "all"}
							space={activeSpace}
							onScopeChange={(scope) =>
								void navigate({
									search: (prev) => ({
										...prev,
										scope: scope === "all" ? undefined : scope,
									}),
									replace: true,
								})
							}
						/>
					) : contents ? (
						<Browser
							contents={contents}
							openFileId={search.file}
							onUpload={(parentId, entries) =>
								handleUpload(contents.space, parentId, entries)
							}
							onMove={requestMove}
							onNewFolder={() => setDialog({ type: "new-folder" })}
							onRename={(node) => setDialog({ type: "rename", node })}
							onDelete={(node) => setDialog({ type: "delete", node })}
							onPickDestination={(node) => setDialog({ type: "move", node })}
							onOpenAccess={() => setDialog({ type: "access", spaceId })}
						/>
					) : null}
				</div>

				{/* In the URL, so a file can be linked to and Back closes it. */}
				{search.file ? (
					<FilePanel
						fileId={search.file}
						target={{
							page: search.page,
							sheet: search.sheet,
							cell: search.cell,
						}}
						onClose={() =>
							void navigate({
								search: (prev) => ({ ...prev, ...openFileSearch(undefined) }),
							})
						}
						onOpenAccess={(id) => setDialog({ type: "access", spaceId: id })}
					/>
				) : null}
			</div>

			{dialog?.type === "access" ? (
				<AccessDialog spaceId={dialog.spaceId} onClose={closeDialog} />
			) : null}

			{dialog?.type === "new-group" ? (
				<CreateGroupDialog
					onClose={closeDialog}
					onCreated={(newSpaceId) => {
						// Straight to its access: a new group is empty until people are added.
						setDialog({ type: "access", spaceId: newSpaceId });
						void navigate({ search: { space: newSpaceId } });
					}}
				/>
			) : null}

			{dialog?.type === "new-folder" ? (
				<NameDialog
					title="New folder"
					description={`In ${contents?.path[contents.path.length - 1]?.name ?? activeSpace?.name ?? "this space"}. Folders organize a space; access is always the space's.`}
					submitLabel="Create folder"
					isPending={createFolder.isPending}
					onClose={closeDialog}
					onSubmit={(name) =>
						createFolder.mutate(
							{ spaceId, parentId: folderId, name },
							{ onSuccess: closeDialog, onError: showError },
						)
					}
				/>
			) : null}

			{dialog?.type === "rename" ? (
				<NameDialog
					title="Rename"
					description={`Give "${dialog.node.name}" a new name.`}
					submitLabel="Rename"
					initialName={dialog.node.name}
					isPending={rename.isPending}
					onClose={closeDialog}
					onSubmit={(name) =>
						rename.mutate(
							{ nodeId: dialog.node.id, name },
							{ onSuccess: closeDialog, onError: showError },
						)
					}
				/>
			) : null}

			{dialog?.type === "delete" ? (
				<ConfirmDialog
					title={`Delete "${dialog.node.name}"?`}
					description={
						dialog.node.kind === "folder"
							? "The folder and everything in it will be deleted for everyone, and removed from search and from what agents can read. This can't be undone."
							: "The file will be deleted for everyone, and removed from search and from what agents can read. This can't be undone."
					}
					confirmLabel="Delete"
					isDestructive
					isPending={remove.isPending}
					onClose={closeDialog}
					onConfirm={() =>
						remove.mutate(dialog.node.id, {
							onSuccess: () => {
								closeDialog();
								snackbar.show(`"${dialog.node.name}" deleted.`);
							},
							onError: showError,
						})
					}
				/>
			) : null}

			{dialog?.type === "move" ? (
				<MoveDialog
					node={dialog.node}
					isPending={move.isPending}
					onClose={closeDialog}
					onMove={(destination) => requestMove(dialog.node, destination)}
				/>
			) : null}

			{dialog?.type === "confirm-move" ? (
				<ConfirmDialog
					title="Move out of a restricted space?"
					description={`"${dialog.node.name}" will leave ${dialog.from.name}, which is restricted, and be readable by everyone with access to ${dialog.to.name} instead, including the agents working for them.`}
					confirmLabel="Move anyway"
					isPending={move.isPending}
					onClose={closeDialog}
					onConfirm={() =>
						runMove(dialog.node, dialog.destination, dialog.targetName)
					}
				/>
			) : null}
		</div>
	);
}

function ignoreStrayFiles(event: DragEvent) {
	if (event.dataTransfer.types.includes("Files")) event.preventDefault();
}

/**
 * Search across everything the user has access to. The query lives in the URL, but the
 * box keeps its own copy of the text: the URL updates a moment after each keystroke, and
 * a controlled input fed from it would move the caret to the end mid-word.
 */
function SearchBox({
	value,
	onChange,
}: {
	value: string;
	onChange: (value: string) => void;
}) {
	const inputRef = useRef<HTMLInputElement>(null);
	const [draft, setDraft] = useState(value);

	// Follow the URL when it changes from elsewhere (a link, Back), not while typing.
	useEffect(() => {
		if (document.activeElement !== inputRef.current) setDraft(value);
	}, [value]);

	function change(next: string) {
		setDraft(next);
		onChange(next);
	}

	return (
		<search className="relative mx-auto w-full max-w-xl">
			<SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
			<Input
				ref={inputRef}
				type="search"
				value={draft}
				onChange={(event) => change(event.target.value)}
				onKeyDown={(event) => {
					if (event.key === "Escape" && draft) change("");
				}}
				placeholder="Search files and their content"
				aria-label="Search the Knowledge Base"
				className="h-9 rounded-full px-9 [&::-webkit-search-cancel-button]:hidden"
				autoComplete="off"
				data-testid="kb-search-input"
			/>
			{draft ? (
				<Tooltip>
					<TooltipTrigger
						render={
							<button
								type="button"
								aria-label="Clear search"
								onClick={() => {
									change("");
									inputRef.current?.focus();
								}}
								className="absolute top-1/2 right-2 flex size-6 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground outline-none hover:bg-accent hover:text-foreground focus-visible:ring-1 focus-visible:ring-ring"
								data-testid="kb-search-clear"
							/>
						}
					>
						<XIcon className="size-4" />
					</TooltipTrigger>
					<TooltipContent>Clear search (Esc)</TooltipContent>
				</Tooltip>
			) : null}
		</search>
	);
}
