import { FileWarning } from "lucide-react";
import { FileNotice } from "./components/file-notice";
import { PreviewBoundary } from "./components/preview-boundary";
import { formatBytes } from "./lib/format";
import { resolveFileType } from "./registry";
import type { PreviewSource, PreviewTarget } from "./types";

/**
 * Shows any file. Fills its parent (give it a sized box); each previewer scrolls itself.
 *
 *   type      resolveFileType: extension → name → MIME, else "Preview not available"
 *   size      over the type's limit → a download card, before any byte is fetched
 *   loading   the type's own skeleton (Suspense), while its code and the file load
 *   errors    PreviewBoundary: plain-language message + technical details + retry/download
 */
export function FilePreview({
	source,
	target,
}: {
	source: PreviewSource;
	target?: PreviewTarget;
}) {
	const type = resolveFileType(source);
	const { Preview, Skeleton } = type;

	if (source.sizeBytes > type.maxBytes) {
		return (
			<FileNotice
				source={source}
				icon={FileWarning}
				title="Too large to preview"
				description={`This ${type.label.toLowerCase()} is ${formatBytes(source.sizeBytes)}. Files up to ${formatBytes(type.maxBytes)} can be previewed here.`}
			/>
		);
	}

	return (
		<PreviewBoundary
			key={`${source.id}:${source.url}`}
			typeLabel={type.label}
			fallback={<Skeleton />}
			downloadUrl={source.url}
			fileName={source.name}
		>
			<Preview source={source} maxBytes={type.maxBytes} target={target} />
		</PreviewBoundary>
	);
}

/** The loading placeholder for a file whose metadata is known but whose preview hasn't mounted yet. */
export function FilePreviewSkeleton({
	file,
}: {
	file: Pick<PreviewSource, "name" | "mimeType">;
}) {
	const { Skeleton } = resolveFileType(file);
	return <Skeleton />;
}
