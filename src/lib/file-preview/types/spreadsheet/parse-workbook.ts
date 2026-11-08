import type { CellObject, Range, WorkBook } from "xlsx";
import { PreviewError } from "../../lib/errors";
import {
	decodeText,
	OLE_MAGIC,
	startsWith,
	ZIP_MAGIC,
} from "../../lib/fetch-bytes";
import { extensionOf } from "../../lib/format";
import { assertSafeZip, readZipEntries } from "../../lib/zip-guard";
import {
	type CellStyle,
	COL_STRIDE,
	parseStyles,
	type SheetXmlInfo,
	scanSheetXml,
} from "./xlsx-styles";

/** Beyond these the grid still scrolls smoothly, but parsing and memory stop being reasonable. */
export const MAX_ROWS = 100_000;
export const MAX_COLS = 1_000;
const DEFAULT_COL_PX = 64;
const DEFAULT_ROW_PX = 20;

export type SheetModel = {
	name: string;
	tabColor?: string;
	/** SheetJS dense rows, kept as-is (no copy): `data[r][c]`. */
	data: (CellObject | undefined)[][];
	/** Style index (into WorkbookModel.styles) for a cell; 0 = default. */
	styleOf: (r: number, c: number) => number;
	/** Extent of the grid as drawn (used range plus some empty margin, like a real sheet). */
	rows: number;
	cols: number;
	colPx: Float32Array;
	rowPx: Float32Array;
	merges: Range[];
	frozen: { rows: number; cols: number };
	showGridLines: boolean;
	zoom: number;
	/** Rows were cut at MAX_ROWS (or columns at MAX_COLS). */
	truncated: boolean;
};

export type WorkbookModel = {
	sheets: SheetModel[];
	styles: CellStyle[];
	defaultStyle: CellStyle;
	activeSheet: number;
	/** False for CSV/ODS/XLS: values only, default look. */
	hasFormatting: boolean;
};

export async function parseWorkbook(
	bytes: Uint8Array,
	fileName: string,
): Promise<WorkbookModel> {
	const XLSX = await import("xlsx");
	const ext = extensionOf(fileName);
	const isZip = startsWith(bytes, ZIP_MAGIC);
	const isText = ext === "csv" || ext === "tsv";

	if (isZip) assertSafeZip(bytes);
	if (!isZip && !isText && !startsWith(bytes, OLE_MAGIC) && ext !== "xml") {
		throw new PreviewError(
			"corrupt",
			"Not a zip (xlsx/ods) or OLE (xls) container.",
		);
	}

	let wb: WorkBook;
	try {
		const opts = {
			dense: true,
			cellFormula: true,
			cellNF: true,
			cellHTML: false,
			sheetRows: MAX_ROWS + 1,
		} as const;
		// CSV goes through TextDecoder: SheetJS would read a byte array as Latin-1 and garble accents.
		wb = isText
			? XLSX.read(decodeText(bytes), {
					...opts,
					type: "string",
					FS: ext === "tsv" ? "\t" : undefined,
				})
			: XLSX.read(bytes, { ...opts, type: "array" });
	} catch (e) {
		const msg = e instanceof Error ? e.message : String(e);
		if (/password|encrypt/i.test(msg))
			throw new PreviewError("protected", `SheetJS: ${msg}`, { cause: e });
		throw new PreviewError(
			"corrupt",
			`SheetJS could not read the workbook: ${msg}`,
			{ cause: e },
		);
	}

	const parts = isZip ? readParts(bytes) : undefined;
	const { styles, defaultStyle } = parseStyles(parts?.styles, parts?.theme);

	const sheets: SheetModel[] = [];
	wb.SheetNames.forEach((name, i) => {
		if (wb.Workbook?.Sheets?.[i]?.Hidden) return; // hidden and "very hidden" sheets stay hidden
		const ws = wb.Sheets[name];
		const xml = parts?.sheetXml(i);
		const info = xml ? scanSheetXml(xml, MAX_ROWS, parts?.theme) : undefined;
		sheets.push(
			buildSheet(
				name,
				ws as unknown as SheetLike,
				info,
				XLSX.utils.decode_range,
				isText,
			),
		);
	});
	if (sheets.length === 0)
		throw new PreviewError(
			"unsupported",
			"This workbook has no visible sheets.",
		);

	const activeTab = Number(
		/<workbookView\s[^>]*activeTab="(\d+)"/.exec(parts?.workbook ?? "")?.[1] ??
			0,
	);
	const activeName = wb.SheetNames[activeTab];
	return {
		sheets,
		styles,
		defaultStyle,
		activeSheet: Math.max(
			0,
			sheets.findIndex((s) => s.name === activeName),
		),
		hasFormatting: !!parts?.styles,
	};
}

type SheetLike = {
	"!data"?: (CellObject | undefined)[][];
	"!ref"?: string;
	"!merges"?: Range[];
};

function buildSheet(
	name: string,
	ws: SheetLike,
	info: SheetXmlInfo | undefined,
	decodeRange: (r: string) => Range,
	isText: boolean,
): SheetModel {
	// SheetJS >=0.20 keeps dense rows in "!data"; 0.18.x makes the worksheet itself the row array.
	const data =
		ws["!data"] ??
		(Array.isArray(ws) ? (ws as unknown as (CellObject | undefined)[][]) : []);
	const range = ws["!ref"]
		? decodeRange(ws["!ref"])
		: { s: { r: 0, c: 0 }, e: { r: -1, c: -1 } };
	const usedRows = Math.min(range.e.r + 1, MAX_ROWS);
	const usedCols = Math.min(range.e.c + 1, MAX_COLS);
	const truncated = range.e.r + 1 > MAX_ROWS || range.e.c + 1 > MAX_COLS;
	if (data.length > MAX_ROWS) data.length = MAX_ROWS;

	// Styled-but-empty cells (a filled header row past the data) also count towards the extent.
	let styledRows = 0;
	let styledCols = 0;
	info?.cellStyles.forEach((_, key) => {
		styledRows = Math.max(styledRows, Math.floor(key / COL_STRIDE) + 1);
		styledCols = Math.max(styledCols, (key % COL_STRIDE) + 1);
	});

	const rows = Math.min(
		MAX_ROWS,
		Math.max(Math.max(usedRows, styledRows) + 30, 60),
	);
	const cols = Math.min(
		MAX_COLS,
		Math.max(Math.max(usedCols, styledCols) + 6, 20),
	);

	const colPx = new Float32Array(cols).fill(
		info?.defaultColPx ?? DEFAULT_COL_PX,
	);
	for (const col of info?.cols ?? []) {
		for (let c = Math.max(0, col.min); c <= Math.min(cols - 1, col.max); c++)
			colPx[c] = col.hidden ? 0 : col.px;
	}
	if (isText) autosizeColumns(colPx, data, usedRows, usedCols);

	const rowPx = new Float32Array(rows).fill(
		info?.defaultRowPx ?? DEFAULT_ROW_PX,
	);
	info?.rowHeights.forEach((h, r) => {
		if (r < rows) rowPx[r] = h.hidden ? 0 : h.px;
	});

	const cellStyles = info?.cellStyles;
	return {
		name,
		tabColor: info?.tabColor,
		data,
		styleOf: cellStyles
			? (r, c) => cellStyles.get(r * COL_STRIDE + c) ?? 0
			: () => 0,
		rows,
		cols,
		colPx,
		rowPx,
		merges: (ws["!merges"] ?? []).filter((m) => m.s.r < rows && m.s.c < cols),
		frozen: {
			rows: Math.min(info?.frozen.rows ?? 0, rows),
			cols: Math.min(info?.frozen.cols ?? 0, cols),
		},
		showGridLines: info?.showGridLines ?? true,
		zoom: info?.zoom ?? 1,
		truncated,
	};
}

/** CSV has no widths: size columns to their content, like opening the file in a spreadsheet app and auto-fitting. */
function autosizeColumns(
	colPx: Float32Array,
	data: (CellObject | undefined)[][],
	usedRows: number,
	usedCols: number,
) {
	const sample = Math.min(usedRows, 2_000);
	for (let c = 0; c < usedCols; c++) {
		let longest = 0;
		for (let r = 0; r < sample; r++)
			longest = Math.max(longest, (data[r]?.[c]?.w ?? "").length);
		colPx[c] = Math.min(360, Math.max(DEFAULT_COL_PX, longest * 7.5 + 12));
	}
}

/** The XML parts SheetJS CE doesn't interpret for us, inflated once. */
function readParts(bytes: Uint8Array) {
	const files = readZipEntries(
		bytes,
		(n) =>
			n === "xl/styles.xml" ||
			n === "xl/workbook.xml" ||
			n === "xl/_rels/workbook.xml.rels" ||
			n.startsWith("xl/theme/") ||
			n.startsWith("xl/worksheets/sheet"),
	);
	const td = new TextDecoder();
	const text = (n: string) => (files[n] ? td.decode(files[n]) : undefined);
	const workbook = text("xl/workbook.xml");
	const rels = text("xl/_rels/workbook.xml.rels") ?? "";
	const theme = Object.keys(files).find((n) =>
		/^xl\/theme\/theme\d*\.xml$/.test(n),
	);

	// Sheet order in workbook.xml matches SheetJS's SheetNames; resolve each r:id to its part.
	const targets = [
		...(workbook ?? "").matchAll(/<sheet\s[^>]*?r:id="([^"]+)"/g),
	].map((m) => {
		const target =
			new RegExp(`<Relationship\\s[^>]*Id="${m[1]}"[^>]*Target="([^"]+)"`).exec(
				rels,
			)?.[1] ??
			new RegExp(`<Relationship\\s[^>]*Target="([^"]+)"[^>]*Id="${m[1]}"`).exec(
				rels,
			)?.[1];
		return target
			? target.startsWith("/")
				? target.slice(1)
				: `xl/${target}`
			: undefined;
	});

	return {
		workbook,
		styles: text("xl/styles.xml"),
		theme: theme ? text(theme) : undefined,
		sheetXml: (i: number) => {
			const target = targets[i];
			return target ? text(target) : undefined;
		},
	};
}
