import { decodeText } from "../../lib/fetch-bytes";
import { languageForFile } from "../../lib/shiki";
import { usePreviewData } from "../../lib/use-preview-data";
import type { PreviewProps } from "../../types";
import { CodeView, useCodeDocument } from "./code-view";

export function CodePreview({ source, maxBytes }: PreviewProps) {
	const text = usePreviewData(source, {
		key: "text-content",
		maxBytes,
		parse: decodeText,
	});
	const lang = languageForFile(source.name);
	const doc = useCodeDocument(source.id, text, lang);
	return (
		<CodeView
			doc={doc}
			language={lang.toUpperCase()}
			label={`${source.name} source code`}
		/>
	);
}
