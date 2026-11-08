import { File, FileQuestion } from "lucide-react";
import { FileNotice } from "../../components/file-notice";
import type { FileTypeDef, PreviewProps } from "../../types";

function NoPreview({ source }: PreviewProps) {
	return (
		<FileNotice
			source={source}
			icon={FileQuestion}
			title="Preview not available"
			description="This type of file can't be shown here. Download it to open it with the right app."
		/>
	);
}

/** The fallback: always matches, never downloads anything. Keep it last in the registry. */
export const unknownType: FileTypeDef = {
	id: "unknown",
	label: "File",
	icon: File,
	maxBytes: Infinity,
	Skeleton: () => null,
	Preview: NoPreview,
};
