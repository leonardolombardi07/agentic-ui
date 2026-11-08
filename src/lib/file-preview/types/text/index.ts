import { FileText } from "lucide-react";
import { lazy } from "react";
import { LinesSkeleton } from "../../components/lines-skeleton";
import { MB } from "../../lib/format";
import type { FileTypeDef } from "../../types";

export const textType: FileTypeDef = {
	id: "text",
	label: "Text",
	icon: FileText,
	extensions: [
		"txt",
		"log",
		"text",
		"out",
		"err",
		"nfo",
		"srt",
		"vtt",
		"rst",
		"adoc",
		"tex",
		"properties",
		"conf",
		"cfg",
		"gitignore",
		"editorconfig",
	],
	fileNames: ["readme", "license", "changelog", "authors", "notice", "copying"],
	mimeTypes: ["text/"],
	// Virtualized, so the cost is the download and one split: 10 MB is ~150k log lines.
	maxBytes: 10 * MB,
	Skeleton: LinesSkeleton,
	Preview: lazy(() =>
		import("./text-preview").then((m) => ({ default: m.TextPreview })),
	),
};
