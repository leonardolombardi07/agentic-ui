import type { LucideIcon } from "lucide-react";
import { fileUrl, type SessionFile } from "@/lib/api/types/file";
import { FilePreview } from "./file-preview";
import { resolveFileType } from "./registry";
import type { PreviewSource, PreviewTarget } from "./types";

/*
 * Previews for any file, by type (see registry.ts, the extension point). The module itself
 * knows nothing about sessions; the helpers at the bottom adapt a SessionFile to it.
 */
export { PreviewBoundary } from "./components/preview-boundary";
export { FilePreview, FilePreviewSkeleton } from "./file-preview";
export { formatBytes } from "./lib/format";
export { FILE_TYPES, resolveFileType } from "./registry";
export type {
	FileTypeDef,
	FileTypeId,
	FileTypeInput,
	PreviewSource,
	PreviewTarget,
} from "./types";

/** A session file as the previewer sees it. */
export function previewSource(file: SessionFile): PreviewSource {
	return {
		id: file.id,
		name: file.name,
		mimeType: file.mediaType,
		sizeBytes: file.size,
		url: fileUrl(file.id),
	};
}

export function fileIcon(file: SessionFile): LucideIcon {
	return resolveFileType({ name: file.name, mimeType: file.mediaType }).icon;
}

/** Fills its parent (give it a sized box); each previewer scrolls itself. */
export function SessionFilePreview({
	file,
	target,
}: {
	file: SessionFile;
	target?: PreviewTarget;
}) {
	return <FilePreview source={previewSource(file)} target={target} />;
}
