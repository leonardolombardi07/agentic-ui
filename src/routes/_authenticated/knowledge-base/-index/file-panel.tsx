import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { cn } from "cn";
import {
	BotIcon,
	ChevronRightIcon,
	DownloadIcon,
	FileQuestionIcon,
	FolderOpenIcon,
	InfoIcon,
	type LucideIcon,
	Maximize2Icon,
	Minimize2Icon,
	XIcon,
} from "lucide-react";
import { type ReactNode, useRef, useState } from "react";
import { z } from "zod";
import { Button, buttonVariants } from "@/components/ui/button";
import { ResizeHandle } from "@/components/ui/resize-handle";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { openFileQueryOptions } from "@/lib/api/knowledge-base/queries";
import type { OpenFile } from "@/lib/api/types/knowledge-base";
import {
	FilePreview,
	formatBytes,
	type PreviewTarget,
	resolveFileType,
} from "@/lib/file-preview";
import { resizeDrag } from "@/lib/resize-drag";
import { createPersistedStore } from "@/lib/store";
import {
	formatDate,
	RestrictedBadge,
	RoleChip,
	SPACE_KIND_ICONS,
} from "./space-meta";

const MIN_WIDTH = 360;
const MAX_WIDTH = 960;
const DEFAULT_WIDTH = 520;

/** The panel's width is a preference: it stays as the user left it. */
const panelStore = createPersistedStore({
	key: "knowledge-base-file-panel-v1",
	schema: z.object({ width: z.number().min(MIN_WIDTH).max(MAX_WIDTH) }),
	initialState: { width: DEFAULT_WIDTH },
});

function clampWidth(width: number) {
	return Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, width));
}

type FilePanelProps = {
	fileId: string;
	/** Where to land in the file, when it was opened from a matched passage. */
	target: PreviewTarget;
	onClose: () => void;
	/** Opens "who has access" for the file's space. */
	onOpenAccess: (spaceId: string) => void;
};

/**
 * A file, opened beside the list: the user keeps their place in the folder or the search
 * results and can go through files one after another. It widens by dragging its edge and
 * can take the whole page for reading.
 *
 * Its "About" section answers what a preview alone can't: where the file lives, who else
 * can find it, and whether search and agents can see it yet.
 */
export function FilePanel({
	fileId,
	target,
	onClose,
	onOpenAccess,
}: FilePanelProps) {
	const { data: file } = useQuery(openFileQueryOptions(fileId));
	const width = panelStore.useStore((state) => state.width);
	const [isFullscreen, setIsFullscreen] = useState(false);
	/* Undefined until the user chooses: About shows by default only where there is room for it. */
	const [aboutChoice, setAboutChoice] = useState<boolean>();
	const showAbout = aboutChoice ?? isFullscreen;
	const widthAtDragStart = useRef(width);

	function setWidth(next: number) {
		panelStore.setState(() => ({ width: clampWidth(next) }));
	}

	return (
		<aside
			aria-label="File preview"
			className={cn(
				"@container flex flex-col bg-background",
				isFullscreen
					? "absolute inset-0 z-20"
					: "relative max-w-[75%] shrink-0 border-l border-border",
			)}
			style={isFullscreen ? undefined : { width }}
			onKeyDown={(event) => {
				// Escape steps back one level: out of fullscreen first, then closed.
				if (event.key !== "Escape" || event.defaultPrevented) return;
				if (isFullscreen) {
					setIsFullscreen(false);
					setAboutChoice(undefined);
				} else onClose();
			}}
			data-testid="kb-file-panel"
			data-fullscreen={isFullscreen ? "" : undefined}
		>
			{isFullscreen ? null : (
				<ResizeHandle
					aria-label="Resize file preview"
					className="-left-0.5"
					value={width}
					min={MIN_WIDTH}
					max={MAX_WIDTH}
					onResizeStart={() => {
						widthAtDragStart.current = width;
						resizeDrag.start();
					}}
					onResizeEnd={resizeDrag.end}
					// The handle is on the left edge: dragging left makes the panel wider.
					onResize={(deltaX) => setWidth(widthAtDragStart.current - deltaX)}
					onKeyboardResize={(stepX) => setWidth(width - stepX)}
					onReset={() => setWidth(DEFAULT_WIDTH)}
					data-testid="kb-file-panel-resize"
				/>
			)}

			<header className="flex h-12 shrink-0 items-center gap-1 border-b border-border pr-2 pl-4">
				<Heading file={file} />
				{file ? (
					<>
						<HeaderAction
							label={showAbout ? "Hide details" : "About this file"}
							icon={InfoIcon}
							isPressed={showAbout}
							onClick={() => setAboutChoice(!showAbout)}
							testId="kb-file-about-toggle"
						/>
						<Tooltip>
							<TooltipTrigger
								render={
									<Link
										to="/knowledge-base"
										search={{
											space: file.space.id,
											folder: file.node.parentId ?? undefined,
										}}
										aria-label="Open its folder"
										className={buttonVariants({
											variant: "ghost",
											size: "icon-sm",
										})}
										data-testid="kb-file-open-location"
									/>
								}
							>
								<FolderOpenIcon />
							</TooltipTrigger>
							<TooltipContent>Open its folder</TooltipContent>
						</Tooltip>
						<Tooltip>
							<TooltipTrigger
								render={
									<a
										href={file.url}
										download={file.node.name}
										aria-label={`Download ${file.node.name}`}
										className={buttonVariants({
											variant: "ghost",
											size: "icon-sm",
										})}
										data-testid="kb-file-download"
									>
										<DownloadIcon />
									</a>
								}
							/>
							<TooltipContent>Download</TooltipContent>
						</Tooltip>
					</>
				) : null}
				<HeaderAction
					label={isFullscreen ? "Exit full screen (Esc)" : "Full screen"}
					icon={isFullscreen ? Minimize2Icon : Maximize2Icon}
					onClick={() => {
						setIsFullscreen(!isFullscreen);
						// Back to the default for the new size: shown full screen, hidden in the panel.
						setAboutChoice(undefined);
					}}
					testId="kb-file-fullscreen"
				/>
				<HeaderAction
					label="Close"
					icon={XIcon}
					onClick={onClose}
					testId="kb-file-close"
				/>
			</header>

			{file === undefined ? (
				<div className="flex flex-col gap-3 p-5">
					<Skeleton className="h-6 w-2/3" />
					<Skeleton className="h-64 w-full" />
				</div>
			) : file === null ? (
				<div
					className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center"
					data-testid="kb-file-unavailable"
				>
					<FileQuestionIcon className="size-8 text-text-dim" />
					<p className="text-sm font-medium">File not available</p>
					<p className="max-w-sm text-sm text-muted-foreground">
						It was deleted, or it lives in a space you don't have access to.
					</p>
					<Button variant="secondary" className="mt-2" onClick={onClose}>
						Close
					</Button>
				</div>
			) : (
				/*
				 * Wide (full screen, or dragged wide): About sits beside the preview. Narrow:
				 * it takes the preview's place, since neither is readable at half the width.
				 */
				<div className="flex min-h-0 flex-1">
					<div
						className={cn(
							"min-w-0 flex-1 overflow-auto bg-muted",
							showAbout && "hidden @3xl:block",
						)}
						data-testid="kb-file-preview"
					>
						<FilePreview
							// A preview applies its target once, so another passage of the same file remounts it.
							key={`${target.page}:${target.sheet}:${target.cell}`}
							target={target}
							source={{
								id: file.node.id,
								name: file.node.name,
								mimeType: file.mimeType || undefined,
								sizeBytes: file.node.size,
								url: file.url,
							}}
						/>
					</div>
					{showAbout ? <About file={file} onOpenAccess={onOpenAccess} /> : null}
				</div>
			)}
		</aside>
	);
}

/** The file's name and where it lives. A placeholder keeps the header's buttons in place while loading. */
function Heading({ file }: { file: OpenFile | null | undefined }) {
	if (!file) {
		return (
			<h2 className="min-w-0 flex-1 truncate text-sm font-medium">
				{file === null ? "File not available" : "Opening..."}
			</h2>
		);
	}
	const { node, space, path } = file;
	const Icon = resolveFileType(node).icon;
	const SpaceIcon = SPACE_KIND_ICONS[space.kind];
	return (
		<div className="flex min-w-0 flex-1 items-center gap-2.5">
			<Icon aria-hidden className="size-4.5 shrink-0 text-muted-foreground" />
			<div className="flex min-w-0 flex-col">
				<h2 className="truncate text-sm font-medium" title={node.name}>
					{node.name}
				</h2>
				<p className="flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
					<SpaceIcon aria-hidden className="size-3 shrink-0" />
					<span className="truncate">{space.name}</span>
					{space.isRestricted ? <RestrictedBadge /> : null}
					{path.map((name, index) => (
						<span
							// biome-ignore lint/suspicious/noArrayIndexKey: a path never reorders
							key={index}
							className="flex min-w-0 items-center gap-1"
						>
							<ChevronRightIcon
								aria-hidden
								className="size-3 shrink-0 text-text-dim"
							/>
							<span className="truncate">{name}</span>
						</span>
					))}
				</p>
			</div>
		</div>
	);
}

function HeaderAction({
	label,
	icon: Icon,
	isPressed,
	onClick,
	testId,
}: {
	label: string;
	icon: LucideIcon;
	/** Set for toggles only. */
	isPressed?: boolean;
	onClick: () => void;
	testId: string;
}) {
	return (
		<Tooltip>
			<TooltipTrigger
				render={
					<Button
						variant="ghost"
						size="icon-sm"
						aria-label={label}
						aria-pressed={isPressed}
						className={cn(isPressed && "bg-accent text-foreground")}
						onClick={onClick}
						data-testid={testId}
					/>
				}
			>
				<Icon />
			</TooltipTrigger>
			<TooltipContent>{label}</TooltipContent>
		</Tooltip>
	);
}

/** What the Knowledge Base knows about the file. */
function About({
	file,
	onOpenAccess,
}: {
	file: OpenFile;
	onOpenAccess: (spaceId: string) => void;
}) {
	const { node, space } = file;
	const isIndexed = node.indexStatus === "indexed";
	return (
		<section
			aria-label="About this file"
			className="flex min-w-0 flex-1 flex-col gap-5 overflow-y-auto p-5 @3xl:w-72 @3xl:flex-none @3xl:border-l @3xl:border-border"
			data-testid="kb-file-details"
		>
			<Detail title="Summary">
				{node.summary ||
					(isIndexed
						? "No summary for this file."
						: "A summary appears once the file is indexed.")}
			</Detail>

			<Detail title="Who can find it">
				<span className="flex flex-wrap items-center gap-1.5">
					Everyone with access to {space.name}
					{space.isRestricted ? <RestrictedBadge /> : null}
					<RoleChip space={space} />
				</span>
				{space.kind === "personal" ? null : (
					<button
						type="button"
						onClick={() => onOpenAccess(space.id)}
						className="mt-1 text-left text-brand-text underline-offset-4 outline-none hover:underline focus-visible:underline"
						data-testid="kb-file-open-access"
					>
						See who has access
					</button>
				)}
			</Detail>

			<Detail title="Search and agents">
				<span data-testid="kb-file-index-status">
					{isIndexed
						? "Indexed. Search finds it by name and by content."
						: "Being indexed. Search will find it in a few seconds."}
				</span>
				<span className="mt-2 flex gap-2 text-muted-foreground">
					<BotIcon className="mt-0.5 size-4 shrink-0" />
					Agents can quote it, but only when working for someone who can open
					it.
				</span>
			</Detail>

			<Detail title="Details">
				<dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
					<dt className="text-muted-foreground">Type</dt>
					<dd>{resolveFileType(node).label}</dd>
					<dt className="text-muted-foreground">Size</dt>
					<dd>{formatBytes(node.size)}</dd>
					<dt className="text-muted-foreground">Changed</dt>
					<dd>{formatDate(node.updatedAt)}</dd>
					<dt className="text-muted-foreground">By</dt>
					<dd>{node.updatedBy}</dd>
				</dl>
			</Detail>
		</section>
	);
}

function Detail({ title, children }: { title: string; children: ReactNode }) {
	return (
		<div className="flex flex-col gap-1.5 text-sm">
			<h3 className="text-xs font-semibold text-muted-foreground">{title}</h3>
			<div className="flex flex-col">{children}</div>
		</div>
	);
}
