import { useVirtualizer } from "@tanstack/react-virtual";
import * as React from "react";
import type { CellObject, Range } from "xlsx";
import type { SheetModel } from "./parse-workbook";
import type { BorderEdge, CellStyle } from "./xlsx-styles";
import { COL_STRIDE } from "./xlsx-styles";

export type CellRef = { r: number; c: number };

const HEADER_H = 22;
const GRIDLINE = "1px solid #e1e1e1";
const HEADER_LINE = "#d4d4d8";
const SELECT = "#217346"; // Excel green
const MAX_OVERFLOW_COLS = 30;

export const columnName = (c: number) => {
	let s = "";
	for (let n = c + 1; n > 0; n = Math.floor((n - 1) / 26))
		s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
	return s;
};

/**
 * A virtualized, 2-D sheet: only the cells in view (plus a small overscan) are in the DOM.
 *
 * Layout: one scroll container whose content is sized to the whole sheet. Four layers share it:
 *   body   absolute, scrolls both ways
 *   left   sticky left: row headers + frozen columns
 *   top    sticky top: column headers + frozen rows
 *   corner sticky both: the top-left box + frozen×frozen cells
 * Positions come from prefix sums of the sheet's own row heights and column widths, so merges
 * and frozen panes are placed exactly, regardless of what is virtualized.
 */
export function SheetGrid({
	sheet,
	styles,
	defaultStyle,
	zoom,
	selected,
	onSelect,
	revealOnMount = false,
}: {
	sheet: SheetModel;
	styles: CellStyle[];
	defaultStyle: CellStyle;
	zoom: number;
	selected: CellRef;
	onSelect: (ref: CellRef) => void;
	/** Scroll the selected cell into view once, when the grid first shows (e.g. opened from a citation). */
	revealOnMount?: boolean;
}) {
	const scrollRef = React.useRef<HTMLDivElement>(null);
	const L = React.useMemo(() => buildLayout(sheet, zoom), [sheet, zoom]);

	const rowV = useVirtualizer({
		count: sheet.rows,
		getScrollElement: () => scrollRef.current,
		estimateSize: (i) => L.rowH(i),
		paddingStart: HEADER_H,
		overscan: 8,
	});
	const colV = useVirtualizer({
		horizontal: true,
		count: sheet.cols,
		getScrollElement: () => scrollRef.current,
		estimateSize: (i) => L.colW(i),
		paddingStart: L.rowHeaderW,
		overscan: 4,
	});
	React.useLayoutEffect(() => {
		rowV.measure();
		colV.measure();
	}, [L, rowV, colV]);

	const vRows = rowV.getVirtualItems().map((i) => i.index);
	const vCols = colV.getVirtualItems().map((i) => i.index);
	const { rows: fr, cols: fc } = sheet.frozen;
	const frozenRows = range(fr).filter((r) => L.rowH(r) > 0);
	const frozenCols = range(fc).filter((c) => L.colW(c) > 0);
	const bodyRows = vRows.filter((r) => r >= fr && L.rowH(r) > 0);
	const bodyCols = vCols.filter((c) => c >= fc && L.colW(c) > 0);
	const topH = L.rowTop[fr];
	const leftW = L.colLeft[fc];

	const ctx: RenderCtx = { sheet, styles, defaultStyle, zoom, L, selected };

	/* ---------------------------------------------------- keyboard + mouse */

	const scrollIntoView = ({ r, c }: CellRef) => {
		const el = scrollRef.current;
		if (!el) return;
		if (r >= fr) {
			if (L.rowTop[r] - topH < el.scrollTop) el.scrollTop = L.rowTop[r] - topH;
			else if (L.rowTop[r + 1] > el.scrollTop + el.clientHeight)
				el.scrollTop = L.rowTop[r + 1] - el.clientHeight;
		}
		if (c >= fc) {
			if (L.colLeft[c] - leftW < el.scrollLeft)
				el.scrollLeft = L.colLeft[c] - leftW;
			else if (L.colLeft[c + 1] > el.scrollLeft + el.clientWidth)
				el.scrollLeft = L.colLeft[c + 1] - el.clientWidth;
		}
	};
	React.useEffect(() => {
		if (!revealOnMount) return;
		const el = scrollRef.current;
		if (!el) return;
		// Centre the cell (rather than leave it at an edge) so its surroundings give context.
		const { r, c } = selected;
		if (r >= fr)
			el.scrollTop = Math.max(0, L.rowTop[r] - topH - el.clientHeight / 3);
		if (c >= fc)
			el.scrollLeft = Math.max(0, L.colLeft[c] - leftW - el.clientWidth / 4);
		// Once, on mount: later selection changes scroll through the keyboard handlers.
	}, []);
	const move = (dr: number, dc: number) => {
		let { r, c } = selected;
		const step = (
			v: number,
			d: number,
			max: number,
			size: (i: number) => number,
		) => {
			let n = v;
			for (let k = 0; k < Math.abs(d); k++) {
				let next = n + Math.sign(d);
				while (next >= 0 && next < max && size(next) === 0)
					next += Math.sign(d); // skip hidden
				if (next < 0 || next >= max) break;
				n = next;
			}
			return n;
		};
		r = step(r, dr, sheet.rows, L.rowH);
		c = step(c, dc, sheet.cols, L.colW);
		onSelect({ r, c });
		scrollIntoView({ r, c });
	};
	const onKeyDown = (e: React.KeyboardEvent) => {
		const page = Math.max(
			1,
			Math.floor((scrollRef.current?.clientHeight ?? 400) / (20 * zoom)) - 2,
		);
		const keys: Record<string, () => void> = {
			ArrowUp: () => move(-1, 0),
			ArrowDown: () => move(1, 0),
			ArrowLeft: () => move(0, -1),
			ArrowRight: () => move(0, 1),
			Enter: () => move(e.shiftKey ? -1 : 1, 0),
			Tab: () => move(0, e.shiftKey ? -1 : 1),
			PageDown: () => move(page, 0),
			PageUp: () => move(-page, 0),
			Home: () => {
				if (!(e.ctrlKey || e.metaKey)) return move(0, -selected.c);
				onSelect({ r: 0, c: 0 });
				scrollIntoView({ r: 0, c: 0 });
				scrollRef.current?.scrollTo(0, 0);
			},
		};
		const run = keys[e.key];
		if (run) {
			e.preventDefault();
			run();
		}
	};
	const onMouseDown = (e: React.MouseEvent) => {
		const el = (e.target as HTMLElement).closest<HTMLElement>("[data-cell]");
		if (!el) return;
		const [r, c] = (el.dataset.cell ?? "").split(":").map(Number);
		if (!Number.isFinite(r) || !Number.isFinite(c)) return;
		onSelect({ r, c });
	};

	/* ------------------------------------------------------------- render */

	return (
		<div
			ref={scrollRef}
			tabIndex={0}
			role="region"
			aria-label={`${sheet.name} sheet. Use the arrow keys to move between cells.`}
			onKeyDown={onKeyDown}
			onMouseDown={onMouseDown}
			className="paper relative h-full overflow-auto bg-white text-black outline-none select-none"
			style={{ overscrollBehavior: "contain" }}
		>
			<div className="relative" style={{ width: L.totalW, height: L.totalH }}>
				{/* top: column headers + frozen rows */}
				<div
					className="sticky top-0 z-30 bg-white"
					style={{ width: L.totalW, height: topH }}
				>
					{bodyCols.map((c) => (
						<ColHeader key={c} c={c} L={L} active={selected.c === c} />
					))}
					{renderCells(ctx, frozenRows, bodyCols, 0)}
					{/* corner: frozen × frozen */}
					<div
						className="sticky left-0 z-10 bg-white"
						style={{ width: leftW, height: topH }}
					>
						<div
							className="absolute top-0 left-0"
							style={{
								width: L.rowHeaderW,
								height: HEADER_H,
								background: "#f3f3f3",
								borderRight: `1px solid ${HEADER_LINE}`,
								borderBottom: `1px solid ${HEADER_LINE}`,
							}}
						/>
						{frozenCols.map((c) => (
							<ColHeader key={c} c={c} L={L} active={selected.c === c} />
						))}
						{frozenRows.map((r) => (
							<RowHeader
								key={r}
								r={r}
								L={L}
								offsetY={0}
								active={selected.r === r}
							/>
						))}
						{renderCells(ctx, frozenRows, frozenCols, 0)}
						{fr > 0 && (
							<div
								className="absolute left-0 h-px w-full bg-[#9ca3af]"
								style={{ top: topH - 1 }}
							/>
						)}
						{fc > 0 && (
							<div
								className="absolute top-0 h-full w-px bg-[#9ca3af]"
								style={{ left: leftW - 1 }}
							/>
						)}
					</div>
					{fr > 0 && (
						<div
							className="absolute left-0 h-px bg-[#9ca3af]"
							style={{ top: topH - 1, width: L.totalW }}
						/>
					)}
				</div>

				{/* left: row headers + frozen columns */}
				<div
					className="sticky left-0 z-20 bg-white"
					style={{ width: leftW, height: L.totalH - topH }}
				>
					{bodyRows.map((r) => (
						<RowHeader
							key={r}
							r={r}
							L={L}
							offsetY={topH}
							active={selected.r === r}
						/>
					))}
					{renderCells(ctx, bodyRows, frozenCols, topH)}
					{fc > 0 && (
						<div
							className="absolute top-0 h-full w-px bg-[#9ca3af]"
							style={{ left: leftW - 1 }}
						/>
					)}
				</div>

				{/* body */}
				<div className="absolute top-0 left-0 z-0">
					{renderCells(ctx, bodyRows, bodyCols, 0)}
				</div>
			</div>
		</div>
	);
}

/* ------------------------------------------------------------------ layout */

type Layout = ReturnType<typeof buildLayout>;

function buildLayout(sheet: SheetModel, zoom: number) {
	const rowHeaderW = Math.max(36, String(sheet.rows).length * 7 + 16);
	const rowTop = new Float64Array(sheet.rows + 1);
	rowTop[0] = HEADER_H;
	for (let r = 0; r < sheet.rows; r++)
		rowTop[r + 1] = rowTop[r] + Math.round(sheet.rowPx[r] * zoom);
	const colLeft = new Float64Array(sheet.cols + 1);
	colLeft[0] = rowHeaderW;
	for (let c = 0; c < sheet.cols; c++)
		colLeft[c + 1] = colLeft[c] + Math.round(sheet.colPx[c] * zoom);
	return {
		rowHeaderW,
		rowTop,
		colLeft,
		rowH: (r: number) => rowTop[r + 1] - rowTop[r],
		colW: (c: number) => colLeft[c + 1] - colLeft[c],
		totalW: colLeft[sheet.cols],
		totalH: rowTop[sheet.rows],
	};
}

const range = (n: number) => Array.from({ length: n }, (_, i) => i);

/* ----------------------------------------------------------------- headers */

function ColHeader({
	c,
	L,
	active,
}: {
	c: number;
	L: Layout;
	active: boolean;
}) {
	return (
		<div
			className="absolute top-0 flex items-center justify-center overflow-hidden text-[11px]"
			style={{
				left: L.colLeft[c],
				width: L.colW(c),
				height: HEADER_H,
				background: active ? "#d3e3d9" : "#f3f3f3",
				color: active ? SELECT : "#555",
				fontWeight: active ? 600 : 400,
				borderRight: `1px solid ${HEADER_LINE}`,
				borderBottom: active
					? `2px solid ${SELECT}`
					: `1px solid ${HEADER_LINE}`,
			}}
		>
			{columnName(c)}
		</div>
	);
}

function RowHeader({
	r,
	L,
	offsetY,
	active,
}: {
	r: number;
	L: Layout;
	offsetY: number;
	active: boolean;
}) {
	return (
		<div
			className="absolute left-0 flex items-center justify-center overflow-hidden text-[11px] tabular-nums"
			style={{
				top: L.rowTop[r] - offsetY,
				width: L.rowHeaderW,
				height: L.rowH(r),
				background: active ? "#d3e3d9" : "#f3f3f3",
				color: active ? SELECT : "#555",
				fontWeight: active ? 600 : 400,
				borderRight: active
					? `2px solid ${SELECT}`
					: `1px solid ${HEADER_LINE}`,
				borderBottom: `1px solid ${HEADER_LINE}`,
			}}
		>
			{r + 1}
		</div>
	);
}

/* ------------------------------------------------------------------- cells */

type RenderCtx = {
	sheet: SheetModel;
	styles: CellStyle[];
	defaultStyle: CellStyle;
	zoom: number;
	L: Layout;
	selected: CellRef;
};

const key = (r: number, c: number) => r * COL_STRIDE + c;
const edgeCss = (e: BorderEdge | undefined) =>
	e ? `${e.width}px ${e.style} ${e.color}` : undefined;
const isBlank = (cell: CellObject | undefined) =>
	!cell ||
	cell.t === "z" ||
	cell.w === "" ||
	(cell.w == null && cell.v == null);

/** Renders the cells of one layer: `rows × cols` plus any merge that overlaps them. */
function renderCells(
	ctx: RenderCtx,
	rows: number[],
	cols: number[],
	offsetY: number,
) {
	if (rows.length === 0 || cols.length === 0) return null;
	const { sheet, L, selected } = ctx;
	const r0 = rows[0],
		r1 = rows[rows.length - 1],
		c0 = cols[0],
		c1 = cols[cols.length - 1];

	// Merges overlapping this window. They are drawn once, at their top-left, spanning their full size.
	const merges = sheet.merges.filter(
		(m) =>
			m.s.r <= r1 &&
			m.e.r >= r0 &&
			m.s.c <= c1 &&
			m.e.c >= c0 &&
			sameLayer(m, sheet, rows[0], cols[0]),
	);
	const covered = new Set<number>();
	for (const m of merges)
		for (let r = Math.max(m.s.r, r0); r <= Math.min(m.e.r, r1); r++)
			for (let c = Math.max(m.s.c, c0); c <= Math.min(m.e.c, c1); c++)
				covered.add(key(r, c));

	const out: React.ReactNode[] = [];
	for (const r of rows) {
		let overflowUntil = -1; // text from a cell on the left runs over these columns: no gridline under it
		for (const c of cols) {
			if (covered.has(key(r, c))) continue;
			const cell = cellView(ctx, r, c, r, c, offsetY, overflowUntil);
			overflowUntil = Math.max(overflowUntil, cell.overflowUntil);
			out.push(cell.node);
		}
	}
	for (const m of merges)
		out.push(cellView(ctx, m.s.r, m.s.c, m.e.r, m.e.c, offsetY, -1).node);

	// Selection outline (merge-aware), in whichever layer owns the selected cell.
	const selMerge = sheet.merges.find(
		(m) =>
			selected.r >= m.s.r &&
			selected.r <= m.e.r &&
			selected.c >= m.s.c &&
			selected.c <= m.e.c,
	);
	const sel = selMerge
		? { r: selMerge.s.r, c: selMerge.s.c, er: selMerge.e.r, ec: selMerge.e.c }
		: { ...selected, er: selected.r, ec: selected.c };
	if (
		rows.includes(sel.r) ||
		(sel.r < r0 && sel.er >= r0 && sameLayerRow(sheet, sel.r, rows[0]))
	) {
		if (
			cols.includes(sel.c) ||
			(sel.c < c0 && sel.ec >= c0 && sameLayerCol(sheet, sel.c, cols[0]))
		) {
			out.push(
				<div
					key="selection"
					className="pointer-events-none absolute z-10"
					style={{
						left: L.colLeft[sel.c] - 1,
						top: L.rowTop[sel.r] - offsetY - 1,
						width: L.colLeft[sel.ec + 1] - L.colLeft[sel.c] + 1,
						height: L.rowTop[sel.er + 1] - L.rowTop[sel.r] + 1,
						border: `2px solid ${SELECT}`,
					}}
				/>,
			);
		}
	}
	return out;
}

const sameLayerRow = (sheet: SheetModel, r: number, layerRow: number) =>
	r < sheet.frozen.rows === layerRow < sheet.frozen.rows;
const sameLayerCol = (sheet: SheetModel, c: number, layerCol: number) =>
	c < sheet.frozen.cols === layerCol < sheet.frozen.cols;
const sameLayer = (
	m: Range,
	sheet: SheetModel,
	layerRow: number,
	layerCol: number,
) =>
	sameLayerRow(sheet, m.s.r, layerRow) && sameLayerCol(sheet, m.s.c, layerCol);

/** One cell (or merged block from r,c to er,ec). Each cell owns its right and bottom edges. */
function cellView(
	ctx: RenderCtx,
	r: number,
	c: number,
	er: number,
	ec: number,
	offsetY: number,
	overflowFrom: number,
) {
	const { sheet, styles, defaultStyle, zoom, L } = ctx;
	const styleAt = (rr: number, cc: number) =>
		styles[sheet.styleOf(rr, cc)] ?? defaultStyle;
	const cell = sheet.data[r]?.[c];
	const st = styleAt(r, c);
	const x = L.colLeft[c];
	const y = L.rowTop[r] - offsetY;
	const w = L.colLeft[ec + 1] - x;
	const h = L.rowTop[er + 1] - L.rowTop[r];

	const text = cell?.w ?? (cell?.v != null ? String(cell.v) : "");
	const type = cell?.t;
	const h_ =
		st.h ??
		(type === "n" || type === "d"
			? "right"
			: type === "b" || type === "e"
				? "center"
				: "left");

	// Text overflow into empty neighbours (left-aligned, unwrapped text only, as in Excel).
	let spanW = w;
	let overflowUntil = -1;
	if (
		text &&
		type === "s" &&
		h_ === "left" &&
		!st.wrap &&
		er === r &&
		ec === c
	) {
		const estimate =
			text.length * st.fontSize * zoom * 1.333 * 0.55 +
			6 +
			st.indent * 9 * zoom;
		if (estimate > w) {
			let k = c + 1;
			while (
				k < sheet.cols &&
				k <= c + MAX_OVERFLOW_COLS &&
				isBlank(sheet.data[r]?.[k]) &&
				!inMerge(sheet, r, k) &&
				L.colLeft[k] - x < estimate
			)
				k++;
			if (k > c + 1) {
				spanW = L.colLeft[k] - x;
				overflowUntil = k - 1;
			}
		}
	}

	// Edges: explicit border, else the neighbour's facing border, else a gridline unless fills meet.
	const rightNb = styleAt(r, ec + 1);
	const belowNb = styleAt(er + 1, c);
	const gridRight =
		sheet.showGridLines &&
		!st.fill &&
		!rightNb.fill &&
		overflowUntil <= c &&
		overflowFrom <= c;
	const gridBottom = sheet.showGridLines && !st.fill && !belowNb.fill;
	const right =
		edgeCss(st.border.right ?? rightNb.border.left) ??
		(gridRight ? GRIDLINE : undefined);
	const bottom =
		edgeCss(st.border.bottom ?? belowNb.border.top) ??
		(gridBottom ? GRIDLINE : undefined);
	const left = c === 0 ? edgeCss(st.border.left) : undefined;
	const top = r === 0 ? edgeCss(st.border.top) : undefined;

	const pad = 3 * zoom;
	const indent = st.indent * 9 * zoom;
	const link = safeHref(cell?.l?.Target);
	const note = cell?.c?.map((n) => (n.a ? `${n.a}: ${n.t}` : n.t)).join("\n");

	const content = text && (
		<span
			className="block overflow-hidden"
			style={{
				...(spanW > w
					? {
							position: "absolute",
							left: 0,
							top: 0,
							bottom: 0,
							width: spanW,
							display: "flex",
							alignItems: "inherit",
							paddingLeft: pad + indent,
							zIndex: 1,
						}
					: {}),
				whiteSpace: st.wrap ? "pre-wrap" : "pre",
				overflowWrap: st.wrap ? "break-word" : undefined,
				textOverflow: "clip",
				textAlign: h_,
				width: spanW > w ? undefined : "100%",
				verticalAlign: st.vertAlign,
			}}
		>
			{link ? (
				<a
					href={link}
					target="_blank"
					rel="noopener noreferrer nofollow"
					className="hover:underline"
					onMouseDown={(e) => e.stopPropagation()}
				>
					{text}
				</a>
			) : (
				text
			)}
		</span>
	);

	return {
		overflowUntil,
		node: (
			<div
				key={`${r}:${c}`}
				data-cell={`${r}:${c}`}
				title={note || undefined}
				className="absolute flex"
				style={{
					left: x,
					top: y,
					width: w,
					height: h,
					boxSizing: "border-box",
					overflow: spanW > w ? "visible" : "hidden",
					background: st.fill,
					borderRight: right,
					borderBottom: bottom,
					borderLeft: left,
					borderTop: top,
					alignItems:
						st.v === "top"
							? "flex-start"
							: st.v === "center"
								? "center"
								: "flex-end",
					padding: `0 ${pad + (h_ === "right" ? indent : 0)}px 0 ${pad + (h_ === "left" ? indent : 0)}px`,
					fontFamily: st.fontFamily,
					fontSize: `${st.fontSize * zoom}pt`,
					lineHeight: 1.25,
					fontWeight: st.bold ? 700 : 400,
					fontStyle: st.italic ? "italic" : undefined,
					textDecoration:
						[st.underline && "underline", st.strike && "line-through"]
							.filter(Boolean)
							.join(" ") || undefined,
					color: st.color ?? (link ? "#0563c1" : "#000"),
				}}
			>
				{content}
				{note && (
					<span
						aria-hidden="true"
						className="absolute top-0 right-0"
						style={{
							borderTop: "6px solid #c00000",
							borderLeft: "6px solid transparent",
						}}
					/>
				)}
			</div>
		),
	};
}

const inMerge = (sheet: SheetModel, r: number, c: number) =>
	sheet.merges.some(
		(m) => r >= m.s.r && r <= m.e.r && c >= m.s.c && c <= m.e.c,
	);

/** Only web and mail links; internal ("#Sheet2!A1") and file: links are not followed. */
function safeHref(target: string | undefined) {
	if (!target) return undefined;
	try {
		const u = new URL(target);
		return u.protocol === "https:" ||
			u.protocol === "http:" ||
			u.protocol === "mailto:"
			? u.href
			: undefined;
	} catch {
		return undefined;
	}
}
