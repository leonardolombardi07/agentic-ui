import { FileText } from "lucide-react";
import { lazy } from "react";
import { PageSkeleton } from "../../components/page-skeleton";
import { MB } from "../../lib/format";
import type { FileTypeDef } from "../../types";

const DocxSkeleton = () => <PageSkeleton aspect={false} />;

export const docxType: FileTypeDef = {
	id: "docx",
	label: "Document",
	icon: FileText,
	extensions: ["docx", "docm", "dotx"],
	mimeTypes: [
		"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
	],
	// Converted to one HTML document in memory, embedded images inlined as base64 (+33%).
	maxBytes: 15 * MB,
	Skeleton: DocxSkeleton,
	Preview: lazy(() =>
		import("./docx-preview").then((m) => ({ default: m.DocxPreview })),
	),
};
