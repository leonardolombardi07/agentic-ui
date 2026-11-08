import { FileType2 } from "lucide-react";
import { lazy } from "react";
import { PageSkeleton } from "../../components/page-skeleton";
import { MB } from "../../lib/format";
import type { FileTypeDef } from "../../types";

export const pdfType: FileTypeDef = {
	id: "pdf",
	label: "PDF",
	icon: FileType2,
	extensions: ["pdf"],
	mimeTypes: ["application/pdf"],
	// The native viewer streams pages, so the limit is about the download, not rendering.
	maxBytes: 50 * MB,
	Skeleton: PageSkeleton,
	Preview: lazy(() =>
		import("./pdf-preview").then((m) => ({ default: m.PdfPreview })),
	),
};
