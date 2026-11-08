import { PreviewError } from "../../lib/errors";
import { useObjectUrl } from "../../lib/use-object-url";
import { usePreviewData } from "../../lib/use-preview-data";
import type { PreviewProps } from "../../types";

/**
 * The browser's own PDF viewer in an iframe: search, zoom, page navigation and printing for free.
 *
 * Safety: the bytes are re-wrapped as `application/pdf` before getting a blob: URL. A blob: URL
 * runs with this page's origin, so a file served as HTML must never be framed this way. Checking
 * the `%PDF-` signature first also stops a renamed file from reaching the viewer at all.
 */
export function PdfPreview({ source, maxBytes, target }: PreviewProps) {
	const blob = usePreviewData(source, {
		key: "pdf",
		maxBytes,
		parse: toPdfBlob,
	});
	const url = useObjectUrl(blob);
	if (!url) return null;
	return (
		<iframe
			src={`${url}#${target?.page ? `page=${Math.max(1, Math.floor(target.page))}&` : ""}view=FitH`}
			title={`${source.name} (PDF)`}
			className="block h-full w-full border-0 bg-muted"
			referrerPolicy="no-referrer"
		/>
	);
}

function toPdfBlob(bytes: Uint8Array) {
	// The spec allows junk before the header; viewers accept it within the first 1 KB.
	const head = new TextDecoder("latin1").decode(bytes.subarray(0, 1024));
	if (!head.includes("%PDF-"))
		throw new PreviewError(
			"corrupt",
			"Missing %PDF- header in the first 1024 bytes.",
		);
	return new Blob([bytes as BlobPart], { type: "application/pdf" });
}
