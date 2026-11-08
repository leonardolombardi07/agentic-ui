import { FileCode2 } from "lucide-react";
import { lazy } from "react";
import { LinesSkeleton } from "../../components/lines-skeleton";
import { MB } from "../../lib/format";
import { CODE_EXTENSIONS } from "../../lib/shiki";
import type { FileTypeDef } from "../../types";

export const codeType: FileTypeDef = {
	id: "code",
	label: "Code",
	icon: FileCode2,
	extensions: CODE_EXTENSIONS,
	fileNames: ["dockerfile", "makefile", ".env", ".bashrc", ".zshrc"],
	mimeTypes: [
		"application/json",
		"application/xml",
		"text/javascript",
		"application/javascript",
		"text/x-python",
		"application/x-sh",
		"text/css",
		"text/html",
	],
	// Rendering is virtualized; highlighting switches off above 512 KB (see code-view.tsx).
	maxBytes: 2 * MB,
	Skeleton: LinesSkeleton,
	Preview: lazy(() =>
		import("./code-preview").then((m) => ({ default: m.CodePreview })),
	),
};
