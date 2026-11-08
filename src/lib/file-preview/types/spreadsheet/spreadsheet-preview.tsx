import { AlertTriangle, Minus, Plus } from "lucide-react";
import * as React from "react";
import type { CellObject } from "xlsx";
import { cn } from "@/lib/utils";
import { ToolbarButton } from "../../components/preview-toolbar";
import { usePreviewData } from "../../lib/use-preview-data";
import type { PreviewProps } from "../../types";
import {
	MAX_COLS,
	MAX_ROWS,
	parseWorkbook,
	type SheetModel,
} from "./parse-workbook";
import { type CellRef, columnName, SheetGrid } from "./sheet-grid";

const ZOOMS = [0.5, 0.75, 0.9, 1, 1.1, 1.25, 1.5, 2];

/**
 * Workbook chrome around <SheetGrid>: name box + formula bar, sheet tabs (with tab colours),
 * zoom (starting at the sheet's saved zoom) and a notice when rows were cut.
 */
export function SpreadsheetPreview({ source, maxBytes, target }: PreviewProps) {
	const wb = usePreviewData(source, {
		key: "spreadsheet",
		maxBytes,
		parse: (bytes) => parseWorkbook(bytes, source.name),
	});
	const [active, setActive] = React.useState(() => {
		const i = target?.sheet
			? wb.sheets.findIndex((s) => s.name === target.sheet)
			: -1;
		return i >= 0 ? i : wb.activeSheet;
	});
	const sheet = wb.sheets[active] ?? wb.sheets[0];

	return (
		<div className="flex h-full flex-col bg-background">
			{/* key: selection and zoom belong to one sheet */}
			<SheetView
				key={active}
				sheet={sheet}
				wb={wb}
				cell={
					sheet.name === target?.sheet || !target?.sheet
						? target?.cell
						: undefined
				}
			/>
			<SheetTabs sheets={wb.sheets} active={active} onChange={setActive} />
		</div>
	);
}

function SheetView({
	sheet,
	wb,
	cell: targetCell,
}: {
	sheet: SheetModel;
	wb: Awaited<ReturnType<typeof parseWorkbook>>;
	cell?: string;
}) {
	const targetRef = React.useMemo(
		() => parseCellRef(targetCell, sheet),
		[targetCell, sheet],
	);
	const [selected, setSelected] = React.useState<CellRef>(
		targetRef ?? { r: sheet.frozen.rows, c: sheet.frozen.cols },
	);
	const [zoom, setZoom] = React.useState(sheet.zoom);
	const cell = sheet.data[selected.r]?.[selected.c];
	const stepZoom = (dir: 1 | -1) =>
		setZoom((z) =>
			dir > 0
				? (ZOOMS.find((v) => v > z + 0.001) ?? z)
				: ([...ZOOMS].reverse().find((v) => v < z - 0.001) ?? z),
		);

	return (
		<>
			<div className="flex h-8 shrink-0 items-center border-b text-xs">
				<output
					className="flex h-full w-20 shrink-0 items-center border-r px-2 font-mono text-[11px] text-muted-foreground"
					aria-label="Selected cell"
				>
					{columnName(selected.c)}
					{selected.r + 1}
				</output>
				<span
					className="px-2 font-serif text-sm text-muted-foreground italic"
					aria-hidden="true"
				>
					fx
				</span>
				<output
					className="min-w-0 flex-1 truncate pr-2 font-mono text-[11px]"
					aria-label="Cell contents"
					title={formulaBarText(cell)}
				>
					{formulaBarText(cell)}
				</output>
				<div className="flex h-full shrink-0 items-center gap-0.5 border-l px-1 text-muted-foreground">
					<ToolbarButton
						aria-label="Zoom out"
						onClick={() => stepZoom(-1)}
						disabled={zoom <= ZOOMS[0]}
					>
						<Minus />
					</ToolbarButton>
					<button
						type="button"
						className="w-10 cursor-pointer text-center tabular-nums hover:text-foreground"
						onClick={() => setZoom(1)}
						title="Reset zoom"
					>
						{Math.round(zoom * 100)}%
					</button>
					<ToolbarButton
						aria-label="Zoom in"
						onClick={() => stepZoom(1)}
						disabled={zoom >= ZOOMS[ZOOMS.length - 1]}
					>
						<Plus />
					</ToolbarButton>
				</div>
			</div>

			{(sheet.truncated || !wb.hasFormatting) && (
				<div className="flex shrink-0 items-center gap-1.5 border-b bg-warning-soft px-3 py-1 text-xs text-warning">
					<AlertTriangle className="size-3.5 shrink-0" aria-hidden="true" />
					<span className="truncate">
						{sheet.truncated
							? `Showing the first ${MAX_ROWS.toLocaleString()} rows and ${MAX_COLS.toLocaleString()} columns. Download the file to see everything.`
							: "This format has no cell formatting, so values are shown with the default look."}
					</span>
				</div>
			)}

			<div className="min-h-0 flex-1">
				<SheetGrid
					sheet={sheet}
					styles={wb.styles}
					defaultStyle={wb.defaultStyle}
					zoom={zoom}
					selected={selected}
					onSelect={setSelected}
					revealOnMount={!!targetRef}
				/>
			</div>
		</>
	);
}

function SheetTabs({
	sheets,
	active,
	onChange,
}: {
	sheets: SheetModel[];
	active: number;
	onChange: (i: number) => void;
}) {
	return (
		<div
			className="flex shrink-0 gap-0.5 overflow-x-auto border-t bg-muted px-1.5 py-1"
			role="tablist"
			aria-label="Sheets"
		>
			{sheets.map((s, i) => (
				<button
					key={s.name}
					type="button"
					role="tab"
					aria-selected={i === active}
					onClick={() => onChange(i)}
					className={cn(
						"relative cursor-pointer rounded-sm px-3 py-1 text-xs whitespace-nowrap",
						i === active
							? "bg-background font-medium text-[#217346] shadow-sm dark:text-[#5fbf8a]"
							: "text-muted-foreground hover:bg-background/60 hover:text-foreground",
					)}
				>
					{s.name}
					{s.tabColor && (
						<span
							className="absolute inset-x-1.5 bottom-0 h-[3px] rounded-full"
							style={{ background: s.tabColor }}
							aria-hidden="true"
						/>
					)}
				</button>
			))}
		</div>
	);
}

/** "E5" → { r: 4, c: 4 }; undefined when it isn't a cell of this sheet. */
function parseCellRef(
	a1: string | undefined,
	sheet: SheetModel,
): CellRef | undefined {
	const m = a1?.trim().match(/^([A-Za-z]{1,3})(\d{1,7})$/);
	if (!m) return undefined;
	const c =
		[...m[1].toUpperCase()].reduce(
			(n, ch) => n * 26 + ch.charCodeAt(0) - 64,
			0,
		) - 1;
	const r = Number(m[2]) - 1;
	return r >= 0 && r < sheet.rows && c >= 0 && c < sheet.cols
		? { r, c }
		: undefined;
}

/** What Excel's formula bar shows: the formula, else the underlying value (dates and text as displayed). */
function formulaBarText(cell: CellObject | undefined) {
	if (!cell) return "";
	if (cell.f) return `=${cell.f}`;
	if (cell.t === "n" && typeof cell.v === "number" && !looksLikeDate(cell.z))
		return String(cell.v);
	if (cell.t === "b") return cell.v ? "TRUE" : "FALSE";
	return cell.w ?? (cell.v != null ? String(cell.v) : "");
}

const looksLikeDate = (fmt: CellObject["z"]) =>
	typeof fmt === "string" &&
	/[dmyhs]/i.test(fmt.replace(/"[^"]*"|\[[^\]]*\]|\\./g, ""));
