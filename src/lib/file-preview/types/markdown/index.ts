import { FileType } from "lucide-react";
import { lazy } from "react";
import { MB } from "../../lib/format";
import type { FileTypeDef } from "../../types";
import { MarkdownSkeleton } from "./markdown-skeleton";

export const markdownType: FileTypeDef = {
	id: "markdown",
	label: "Markdown",
	icon: FileType,
	extensions: ["md", "markdown", "mdown", "mkd", "mdx"],
	mimeTypes: ["text/markdown", "text/x-markdown"],
	// The whole document is rendered (not virtualized): 2 MB is already a very long document.
	maxBytes: 2 * MB,
	Skeleton: MarkdownSkeleton,
	Preview: lazy(() =>
		import("./markdown-preview").then((m) => ({ default: m.MarkdownPreview })),
	),
};
