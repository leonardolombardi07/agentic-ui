import { useQuery } from "@tanstack/react-query";
import { isNotFound, Link } from "@tanstack/react-router";
import { ChevronRightIcon, DownloadIcon } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { fileQueryOptions } from "@/lib/api/files/queries";
import { sessionQueryOptions } from "@/lib/api/sessions/queries";
import { fileDownloadUrl } from "@/lib/api/types/file";
import { FilePreview, fileIcon, formatBytes } from "@/lib/file-preview";
import { useWorkspaceCommands } from "../commands";
import type { FileTab } from "../model";

/**
 * A session file as an editor tab: the same preview as the Files pane, with the
 * whole group to itself. The breadcrumb leads back to the session it belongs to.
 */
export function FileView({ tab, groupId }: { tab: FileTab; groupId: string }) {
	const commands = useWorkspaceCommands();
	const {
		data: file,
		error,
		isPending,
	} = useQuery(fileQueryOptions(tab.fileId));

	if (isNotFound(error)) {
		/* Persisted tabs can point at files deleted with their session. */
		return (
			<div
				className="flex flex-col items-start gap-3 p-6"
				data-testid="file-not-found"
			>
				<h1 className="text-xl font-medium">File not found</h1>
				<Button
					variant="secondary"
					onClick={() => commands.closeTab({ groupId, tabId: tab.id })}
				>
					Close tab
				</Button>
			</div>
		);
	}
	if (isPending)
		return <p className="p-6 text-sm text-muted-foreground">Loading...</p>;
	if (!file) return null;

	const Icon = fileIcon(file);
	return (
		<div className="flex h-full flex-col" data-testid="file-view">
			<header className="flex h-10 shrink-0 items-center gap-2 border-b border-border pr-1 pl-4">
				<nav
					aria-label="Breadcrumb"
					className="flex min-w-0 flex-1 items-center gap-1 text-sm text-muted-foreground"
				>
					<SessionCrumb sessionId={file.sessionId} />
					<ChevronRightIcon aria-hidden className="size-3.5 shrink-0" />
					<Icon aria-hidden className="size-4 shrink-0" />
					<h1 className="truncate text-foreground" title={file.name}>
						{file.name}
					</h1>
				</nav>
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
			</header>
			<div className="min-h-0 flex-1 overflow-auto">
				<FilePreview file={file} />
			</div>
		</div>
	);
}

function SessionCrumb({ sessionId }: { sessionId: string }) {
	const { data: session } = useQuery(sessionQueryOptions(sessionId));
	return (
		<Link
			to="/sessions/$sessionId"
			params={{ sessionId }}
			className="max-w-48 shrink-0 truncate hover:text-foreground hover:underline"
			data-testid="file-view-session"
		>
			{session?.title ?? "Session"}
		</Link>
	);
}
