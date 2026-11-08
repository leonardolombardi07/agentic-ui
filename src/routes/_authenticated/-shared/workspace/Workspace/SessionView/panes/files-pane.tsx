import { FolderIcon } from "lucide-react";
import type { PaneProps } from "./registry";

/** Placeholder until sessions have files: the API doesn't return any yet. */
export function FilesPane(_props: PaneProps) {
	return (
		<div
			className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center"
			data-testid="pane-files-empty"
		>
			<FolderIcon aria-hidden className="size-6 text-muted-foreground" />
			<p className="text-sm font-medium">No files yet</p>
			<p className="max-w-56 text-xs text-muted-foreground">
				Files the agent creates and the ones you attach will show up here.
			</p>
		</div>
	);
}
