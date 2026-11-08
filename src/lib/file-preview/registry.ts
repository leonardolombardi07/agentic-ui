import { extensionOf } from "./lib/format";
import type { FileTypeDef, FileTypeInput } from "./types";
import { codeType } from "./types/code";
import { docxType } from "./types/docx";
import { imageType } from "./types/image";
import { markdownType } from "./types/markdown";
import { pdfType } from "./types/pdf";
import { spreadsheetType } from "./types/spreadsheet";
import { textType } from "./types/text";
import { unknownType } from "./types/unknown";

/**
 * THE EXTENSION POINT. To support a new kind of file, add a folder under `types/` exporting a
 * FileTypeDef and list it here. Order matters where rules overlap: the first match wins
 * (Markdown and CSV before the generic `text/*`; the fallback last).
 *
 * Importing this file is cheap: each type's preview component is lazy-loaded with its libraries.
 */
export const FILE_TYPES: readonly FileTypeDef[] = [
	markdownType,
	spreadsheetType,
	docxType,
	pdfType,
	imageType,
	codeType,
	textType,
];

/** Picks the file type: by extension first (the most reliable signal), then file name, then MIME type. */
export function resolveFileType(file: FileTypeInput): FileTypeDef {
	const ext = extensionOf(file.name);
	const lowerName = file.name.toLowerCase();
	const mime = file.mimeType?.toLowerCase().split(";")[0].trim();
	return (
		(ext && FILE_TYPES.find((t) => t.extensions?.includes(ext))) ||
		FILE_TYPES.find((t) => t.fileNames?.includes(lowerName)) ||
		(mime &&
			FILE_TYPES.find((t) =>
				t.mimeTypes?.some((m) =>
					m.endsWith("/") ? mime.startsWith(m) : mime === m,
				),
			)) ||
		unknownType
	);
}
