import { useMutation, useQuery } from "@tanstack/react-query";
import { cn } from "cn";
import {
	ArrowLeftIcon,
	DownloadIcon,
	FolderIcon,
	SparklesIcon,
	UploadIcon,
} from "lucide-react";
import { useRef } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import {
	sessionFilesQueryOptions,
	uploadFilesMutationOptions,
} from "@/lib/api/files/queries";
import {
	type FileOrigin,
	fileDownloadUrl,
	type SessionFile,
} from "@/lib/api/types/file";
import { FilePreview, fileIcon, formatBytes } from "@/lib/file-preview";
import { workspace } from "../../../store";
import type { PaneProps } from "./registry";

const GROUPS: { origin: FileOrigin; label: string }[] = [
	{ origin: "generated", label: "Outputs" },
	{ origin: "uploaded", label: "Uploaded" },
];

/**
 * The session's files: a list grouped by where they came from, and a preview of the
 * selected one in the same pane. The selection lives on the tab, so it survives the
 * pane moving between docked and sheet, and message chips can open a file directly.
 */
export function FilesPane({ session, tabRef, selectedFileId }: PaneProps) {
	const { data: files = [], isPending } = useQuery({
		...sessionFilesQueryOptions(session.id),
		// A draft isn't on the server yet, so it can't have files.
		enabled: !session.isDraft,
	});
	const selected = files.find((f) => f.id === selectedFileId);

	if (selected) {
		return (
			<FileDetail
				file={selected}
				onBack={() => workspace.selectFile(tabRef, null)}
			/>
		);
	}

	return (
		<div className="flex h-full flex-col" data-testid="pane-files">
			<div className="flex-1">
				{isPending && !session.isDraft ? (
					<p className="p-4 text-sm text-muted-foreground">Loading...</p>
				) : files.length === 0 ? (
					<EmptyState />
				) : (
					GROUPS.map(({ origin, label }) => {
						const group = files.filter((f) => f.origin === origin);
						if (group.length === 0) return null;
						return (
							<section key={origin} className="py-2">
								<h3 className="flex items-center gap-1.5 px-3 pb-1 text-xs font-medium text-muted-foreground">
									{origin === "generated" ? (
										<SparklesIcon aria-hidden className="size-3.5" />
									) : (
										<UploadIcon aria-hidden className="size-3.5" />
									)}
									{label}
									<span className="tabular-nums">{group.length}</span>
								</h3>
								<ul className="px-1">
									{group.map((file) => (
										<li key={file.id}>
											<FileRow
												file={file}
												onOpen={() => workspace.selectFile(tabRef, file.id)}
											/>
										</li>
									))}
								</ul>
							</section>
						);
					})
				)}
			</div>
			<UploadButton sessionId={session.id} disabled={session.isDraft} />
		</div>
	);
}

function FileRow({ file, onOpen }: { file: SessionFile; onOpen: () => void }) {
	const Icon = fileIcon(file);
	return (
		<button
			type="button"
			onClick={onOpen}
			className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm outline-none hover:bg-accent focus-visible:ring-1 focus-visible:ring-ring"
			data-testid="file-row"
		>
			<Icon aria-hidden className="size-4 shrink-0 text-muted-foreground" />
			<span className="min-w-0 flex-1 truncate" title={file.name}>
				{file.name}
			</span>
			<span className="shrink-0 text-xs text-muted-foreground tabular-nums">
				{formatBytes(file.size)}
			</span>
		</button>
	);
}

function FileDetail({
	file,
	onBack,
}: {
	file: SessionFile;
	onBack: () => void;
}) {
	return (
		<div className="flex h-full flex-col" data-testid="file-detail">
			<div className="flex h-9 shrink-0 items-center gap-1 border-b border-border px-1">
				<Tooltip>
					<TooltipTrigger
						render={
							<Button
								variant="ghost"
								size="icon-sm"
								aria-label="All files"
								onClick={onBack}
								data-testid="file-detail-back"
							/>
						}
					>
						<ArrowLeftIcon />
					</TooltipTrigger>
					<TooltipContent>All files</TooltipContent>
				</Tooltip>
				<p className="min-w-0 flex-1 truncate text-sm" title={file.name}>
					{file.name}
				</p>
				<span className="shrink-0 text-xs text-muted-foreground tabular-nums">
					{formatBytes(file.size)}
				</span>
				<Tooltip>
					<TooltipTrigger
						render={
							<a
								href={fileDownloadUrl(file.id)}
								aria-label={`Download ${file.name}`}
								className={buttonVariants({
									variant: "ghost",
									size: "icon-sm",
								})}
							>
								<DownloadIcon />
							</a>
						}
					/>
					<TooltipContent>Download</TooltipContent>
				</Tooltip>
			</div>
			<div className="min-h-0 flex-1 overflow-auto">
				<FilePreview file={file} />
			</div>
		</div>
	);
}

function EmptyState() {
	return (
		<div
			className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center"
			data-testid="pane-files-empty"
		>
			<FolderIcon aria-hidden className="size-6 text-muted-foreground" />
			<p className="text-sm font-medium">No files yet</p>
			<p className="max-w-56 text-xs text-muted-foreground">
				Files you attach to a message, or upload here, show up in this pane.
			</p>
		</div>
	);
}

function UploadButton({
	sessionId,
	disabled,
}: {
	sessionId: string;
	disabled: boolean;
}) {
	const inputRef = useRef<HTMLInputElement>(null);
	const upload = useMutation(uploadFilesMutationOptions());
	return (
		<div className="shrink-0 border-t border-border p-2">
			<input
				ref={inputRef}
				type="file"
				multiple
				hidden
				onChange={(event) => {
					const files = [...(event.target.files ?? [])];
					event.target.value = "";
					if (files.length > 0)
						upload.mutate({ sessionId, messageId: null, files });
				}}
			/>
			<Button
				variant="ghost"
				size="sm"
				className={cn("w-full justify-start")}
				disabled={disabled || upload.isPending}
				onClick={() => inputRef.current?.click()}
				data-testid="files-upload"
			>
				<UploadIcon />
				{upload.isPending ? "Uploading..." : "Upload files"}
			</Button>
			{disabled ? (
				<p className="px-2 pt-1 text-xs text-muted-foreground">
					Send a message first: the session starts then.
				</p>
			) : null}
			{upload.error ? (
				<p
					role="alert"
					className="px-2 pt-1 text-xs text-destructive-foreground"
				>
					{upload.error.message}
				</p>
			) : null}
		</div>
	);
}
