import { FileSpreadsheet } from "lucide-react";
import { lazy } from "react";
import { MB } from "../../lib/format";
import type { FileTypeDef } from "../../types";
import { SpreadsheetSkeleton } from "./spreadsheet-skeleton";

export const spreadsheetType: FileTypeDef = {
	id: "spreadsheet",
	label: "Spreadsheet",
	icon: FileSpreadsheet,
	extensions: ["xlsx", "xlsm", "xltx", "xls", "ods", "csv", "tsv"],
	mimeTypes: [
		"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
		"application/vnd.ms-excel",
		"application/vnd.oasis.opendocument.spreadsheet",
		"text/csv",
		"text/tab-separated-values",
	],
	// Parsed on the main thread into memory: ~10 MB of xlsx is a few hundred thousand cells.
	// Rows are also capped at MAX_ROWS (parse-workbook.ts); the grid itself is virtualized.
	maxBytes: 10 * MB,
	Skeleton: SpreadsheetSkeleton,
	Preview: lazy(() =>
		import("./spreadsheet-preview").then((m) => ({
			default: m.SpreadsheetPreview,
		})),
	),
};
