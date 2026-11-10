import {
	columnFilteringFeature,
	createColumnHelper,
	createFilteredRowModel,
	createPaginatedRowModel,
	createSortedRowModel,
	filterFn_includesString,
	globalFilteringFeature,
	type ReactTable,
	type Row,
	rowPaginationFeature,
	rowSortingFeature,
	tableFeatures,
	useTable,
} from "@tanstack/react-table";
import { cn } from "cn";
import {
	ArrowDownIcon,
	ArrowUpDownIcon,
	ArrowUpIcon,
	ChevronLeftIcon,
	ChevronRightIcon,
	CopyIcon,
	DownloadIcon,
	Maximize2Icon,
	SearchIcon,
} from "lucide-react";
import {
	Children,
	isValidElement,
	type ReactElement,
	type ReactNode,
	useMemo,
	useState,
} from "react";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { snackbar } from "@/components/ui/snackbar";
import { ActionButton, useCopy } from "./action-button";
import { textOf } from "./text-of";

/** Rows per page, inline. Shorter tables show no pagination at all. */
const PAGE_SIZE = 10;
/** Rows per page in the expanded view. */
const EXPANDED_PAGE_SIZE = 25;
/** From this many rows, a search box is worth its space. */
const SEARCH_FROM_ROWS = 6;
/*
 * Columns with values longer than this wrap (at word breaks, with a sensible
 * minimum width); shorter ones never do, and a wide table scrolls instead.
 */
const WRAP_FROM_CHARS = 32;

type Align = "left" | "center" | "right";

type Cell = {
	/** For sorting, searching and copying. */
	text: string;
	/** The rendered markdown: links, bold, inline code. */
	content: ReactNode;
};

type TableRow = ReadonlyArray<Cell>;

type Column = {
	header: Cell;
	align: Align | undefined;
	/** Every non-empty value parses as a number, so it sorts and aligns as one. */
	numeric: boolean;
	/** Has long values (sentences, notes), which may wrap; the rest stay on one line. */
	wraps: boolean;
};

type ParsedTable = { columns: Column[]; rows: TableRow[] };

const features = tableFeatures({
	rowSortingFeature,
	columnFilteringFeature,
	globalFilteringFeature,
	rowPaginationFeature,
	filteredRowModel: createFilteredRowModel(),
	sortedRowModel: createSortedRowModel(),
	paginatedRowModel: createPaginatedRowModel(),
	filterFns: { includesString: filterFn_includesString },
});

type Features = typeof features;
type Table = ReactTable<Features, TableRow>;

const columnHelper = createColumnHelper<Features, TableRow>();

/**
 * A GFM table, made interactive: sort by any column, search, page through long
 * ones, copy as Markdown or CSV, download as CSV, and open it larger.
 *
 * It reads the table react-markdown already rendered (`children`), so cells
 * keep their links and formatting.
 */
export function DataTable({ children }: { children?: ReactNode }) {
	const parsed = useMemo(() => parseTable(children), [children]);
	return parsed ? (
		<InteractiveTable parsed={parsed} />
	) : (
		// Not the shape we expect (it should always be): the plain table.
		<div className="overflow-x-auto">
			<table>{children}</table>
		</div>
	);
}

function InteractiveTable({ parsed }: { parsed: ParsedTable }) {
	const [expanded, setExpanded] = useState(false);
	const columns = useMemo(
		() =>
			columnHelper.columns(
				parsed.columns.map((column, index) =>
					columnHelper.accessor((row) => row[index]?.text ?? "", {
						id: String(index),
						header: () => column.header.content,
						cell: ({ row }) => row.original[index]?.content,
						sortFn: column.numeric ? compareNumbers : compareText,
						sortUndefined: "last",
					}),
				),
			),
		[parsed.columns],
	);

	const table = useTable({
		features,
		columns,
		data: parsed.rows,
		globalFilterFn: "includesString",
		initialState: { pagination: { pageIndex: 0, pageSize: PAGE_SIZE } },
		// A streamed table keeps gaining rows: stay on the page the user picked.
		autoResetPageIndex: false,
	});

	const rowCount = parsed.rows.length;
	const showSearch = rowCount >= SEARCH_FROM_ROWS;

	function openExpanded() {
		table.setPageSize(EXPANDED_PAGE_SIZE);
		table.setPageIndex(0);
		setExpanded(true);
	}

	function closeExpanded() {
		table.setPageSize(PAGE_SIZE);
		table.setPageIndex(0);
		setExpanded(false);
	}

	return (
		<div
			className="not-prose my-3 overflow-hidden rounded-lg border border-border"
			data-testid="markdown-table"
		>
			<Toolbar
				table={table}
				parsed={parsed}
				showSearch={showSearch}
				onExpand={openExpanded}
			/>
			<TableGrid table={table} parsed={parsed} />
			<Pagination table={table} />
			<Dialog
				open={expanded}
				onOpenChange={(open) => (open ? openExpanded() : closeExpanded())}
			>
				<DialogContent className="h-[min(85vh,56rem)] w-[min(92vw,80rem)]">
					<div className="flex flex-col gap-0.5 border-b border-border px-5 py-3 pr-12">
						<DialogTitle className="text-sm font-semibold">Table</DialogTitle>
						<DialogDescription className="text-xs text-muted-foreground">
							{rowCount} {rowCount === 1 ? "row" : "rows"},{" "}
							{parsed.columns.length} columns
						</DialogDescription>
					</div>
					<Toolbar table={table} parsed={parsed} showSearch />
					<div className="min-h-0 flex-1 overflow-auto">
						<TableGrid table={table} parsed={parsed} stickyHeader />
					</div>
					<Pagination table={table} />
				</DialogContent>
			</Dialog>
		</div>
	);
}

function Toolbar({
	table,
	parsed,
	showSearch,
	onExpand,
}: {
	table: Table;
	parsed: ParsedTable;
	showSearch: boolean;
	/** Omitted inside the expanded view itself. */
	onExpand?: () => void;
}) {
	const { copy } = useCopy();
	const query = String(table.state.globalFilter ?? "");
	const matching = table.getFilteredRowModel().rows.length;
	const total = parsed.rows.length;

	/** What the user sees: filtered and sorted, every page. */
	function visibleRows(): TableRow[] {
		return table.getPrePaginatedRowModel().rows.map((row) => row.original);
	}

	async function copyAs(format: "markdown" | "csv" | "tsv") {
		const rows = visibleRows();
		const text =
			format === "markdown"
				? toMarkdown(parsed.columns, rows)
				: toDelimited(parsed.columns, rows, format === "csv" ? "," : "\t");
		await copy(text);
		snackbar.show(
			format === "tsv"
				? "Copied: paste it into a spreadsheet"
				: `Copied as ${format === "csv" ? "CSV" : "Markdown"}`,
		);
	}

	function download() {
		const csv = toDelimited(parsed.columns, visibleRows(), ",");
		// The BOM makes Excel read the file as UTF-8.
		const blob = new Blob(["﻿", csv], { type: "text/csv;charset=utf-8" });
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.download = "table.csv";
		link.click();
		URL.revokeObjectURL(url);
	}

	return (
		<div className="flex h-9 items-center gap-1 border-b border-border bg-muted/40 pr-1.5 pl-3 text-xs text-muted-foreground">
			{showSearch ? (
				<label className="flex min-w-0 flex-1 items-center gap-1.5">
					<SearchIcon aria-hidden className="size-3.5 shrink-0" />
					<input
						type="search"
						value={query}
						onChange={(event) => {
							table.setGlobalFilter(event.target.value);
							table.setPageIndex(0);
						}}
						placeholder={`Search ${total} rows`}
						aria-label="Search the table"
						className="h-7 w-full min-w-0 bg-transparent text-foreground outline-none placeholder:text-muted-foreground"
						data-testid="markdown-table-search"
					/>
				</label>
			) : (
				<span className="flex-1">
					{total} {total === 1 ? "row" : "rows"}
				</span>
			)}
			{query ? (
				<span className="shrink-0 tabular-nums" aria-live="polite">
					{matching} of {total}
				</span>
			) : null}
			<DropdownMenu>
				<DropdownMenuTrigger
					render={
						<ActionButton
							label="Copy table"
							data-testid="markdown-table-copy"
						/>
					}
				>
					<CopyIcon />
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end">
					<DropdownMenuItem onClick={() => void copyAs("tsv")}>
						Copy for spreadsheets
					</DropdownMenuItem>
					<DropdownMenuItem onClick={() => void copyAs("markdown")}>
						Copy as Markdown
					</DropdownMenuItem>
					<DropdownMenuItem onClick={() => void copyAs("csv")}>
						Copy as CSV
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
			<ActionButton
				label="Download CSV"
				onClick={download}
				data-testid="markdown-table-download"
			>
				<DownloadIcon />
			</ActionButton>
			{onExpand ? (
				<ActionButton
					label="Expand table"
					onClick={onExpand}
					data-testid="markdown-table-expand"
				>
					<Maximize2Icon />
				</ActionButton>
			) : null}
		</div>
	);
}

function TableGrid({
	table,
	parsed,
	stickyHeader = false,
}: {
	table: Table;
	parsed: ParsedTable;
	stickyHeader?: boolean;
}) {
	const rows = table.getRowModel().rows;
	return (
		<div className={cn(!stickyHeader && "overflow-x-auto")}>
			<table className="w-full border-collapse text-sm [overflow-wrap:normal]">
				<thead
					className={cn(
						"bg-muted/40",
						stickyHeader && "sticky top-0 z-10 bg-muted",
					)}
				>
					{table.getHeaderGroups().map((group) => (
						<tr key={group.id} className="border-b border-border">
							{group.headers.map((header) => {
								const column = parsed.columns[Number(header.column.id)];
								const sorted = header.column.getIsSorted();
								const align = alignOf(column);
								return (
									<th
										key={header.id}
										aria-sort={
											sorted === "asc"
												? "ascending"
												: sorted === "desc"
													? "descending"
													: "none"
										}
										className="p-0 text-left font-semibold whitespace-nowrap text-foreground"
									>
										<button
											type="button"
											onClick={header.column.getToggleSortingHandler()}
											className={cn(
												"group/sort flex w-full items-center gap-1 px-3 py-2 outline-none hover:bg-accent focus-visible:bg-accent",
												align === "right" && "flex-row-reverse",
												align === "center" && "justify-center",
											)}
											data-testid="markdown-table-sort"
										>
											<table.FlexRender header={header} />
											<SortIcon direction={sorted} />
										</button>
									</th>
								);
							})}
						</tr>
					))}
				</thead>
				<tbody>
					{rows.length === 0 ? (
						<tr>
							<td
								colSpan={parsed.columns.length}
								className="px-3 py-6 text-center text-muted-foreground"
							>
								No rows match your search.
							</td>
						</tr>
					) : (
						rows.map((row) => (
							<tr
								key={row.id}
								className="border-b border-border last:border-b-0 hover:bg-muted/30"
							>
								{row.getAllCells().map((cell) => {
									const column = parsed.columns[Number(cell.column.id)];
									return (
										<td
											key={cell.id}
											className={cn(
												"px-3 py-1.5 align-top [&_a]:text-brand-text [&_a]:hover:underline [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:font-mono [&_code]:text-[0.86em]",
												column?.numeric && "tabular-nums",
												column?.wraps ? "min-w-48" : "whitespace-nowrap",
												alignClass(alignOf(column)),
											)}
										>
											<table.FlexRender cell={cell} />
										</td>
									);
								})}
							</tr>
						))
					)}
				</tbody>
			</table>
		</div>
	);
}

function SortIcon({ direction }: { direction: false | "asc" | "desc" }) {
	if (direction === "asc") {
		return <ArrowUpIcon aria-hidden className="size-3 shrink-0" />;
	}
	if (direction === "desc") {
		return <ArrowDownIcon aria-hidden className="size-3 shrink-0" />;
	}
	return (
		<ArrowUpDownIcon
			aria-hidden
			className="size-3 shrink-0 opacity-0 transition-opacity group-hover/sort:opacity-50 group-focus-visible/sort:opacity-50"
		/>
	);
}

function Pagination({ table }: { table: Table }) {
	const pageCount = table.getPageCount();
	if (pageCount <= 1) return null;
	const { pageIndex, pageSize } = table.state.pagination;
	const total = table.getFilteredRowModel().rows.length;
	const first = pageIndex * pageSize + 1;
	const last = Math.min(total, first + pageSize - 1);
	return (
		<div className="flex h-9 items-center justify-end gap-1 border-t border-border pr-1.5 pl-3 text-xs text-muted-foreground">
			<span className="mr-auto tabular-nums">
				{first}-{last} of {total}
			</span>
			<ActionButton
				label="Previous page"
				onClick={() => table.previousPage()}
				disabled={!table.getCanPreviousPage()}
				data-testid="markdown-table-previous"
			>
				<ChevronLeftIcon />
			</ActionButton>
			<span className="tabular-nums">
				{pageIndex + 1} / {pageCount}
			</span>
			<ActionButton
				label="Next page"
				onClick={() => table.nextPage()}
				disabled={!table.getCanNextPage()}
				data-testid="markdown-table-next"
			>
				<ChevronRightIcon />
			</ActionButton>
		</div>
	);
}

function alignOf(column: Column | undefined): Align | undefined {
	if (!column) return undefined;
	return column.align ?? (column.numeric ? "right" : undefined);
}

function alignClass(align: Align | undefined): string | undefined {
	if (align === "right") return "text-right";
	if (align === "center") return "text-center";
	return undefined;
}

/* Parsing: react-markdown renders `<table><thead><tr><th>` and `<tbody>` as plain elements. */

type ElementWithChildren = ReactElement<{
	children?: ReactNode;
	style?: { textAlign?: string };
}>;

function elementsOf(node: ReactNode): ElementWithChildren[] {
	return Children.toArray(node).filter((child): child is ElementWithChildren =>
		isValidElement(child),
	);
}

function cellsOf(row: ElementWithChildren): ElementWithChildren[] {
	return elementsOf(row.props.children);
}

function toCell(element: ElementWithChildren): Cell {
	const content = element.props.children;
	return { text: textOf(content).trim(), content };
}

function parseTable(children: ReactNode): ParsedTable | null {
	const sections = elementsOf(children);
	const head = sections.find((section) => section.type === "thead");
	const headerRow = head ? elementsOf(head.props.children)[0] : undefined;
	if (!headerRow) return null;
	const headerCells = cellsOf(headerRow);

	const body = sections.find((section) => section.type === "tbody");
	const rows: TableRow[] = body
		? elementsOf(body.props.children).map((row) => cellsOf(row).map(toCell))
		: [];

	const columns = headerCells.map((cell, index): Column => {
		const values = rows
			.map((row) => row[index]?.text ?? "")
			.filter((value) => value !== "");
		return {
			header: toCell(cell),
			align: parseAlign(cell.props.style?.textAlign),
			numeric:
				values.length > 0 &&
				values.every((value) => !Number.isNaN(toNumber(value))),
			wraps: values.some((value) => value.length > WRAP_FROM_CHARS),
		};
	});
	return { columns, rows };
}

function parseAlign(value: string | undefined): Align | undefined {
	return value === "left" || value === "center" || value === "right"
		? value
		: undefined;
}

/*
 * Numbers as people write them in reports: "$1,189", "+20.9%", "-0.7pp", "(12)",
 * "1.2M", "3x". NaN for anything else, which makes the column text.
 */
const NUMBER_PATTERN =
	/^(?<open>\()?(?<sign>[+\-−])?[$€£]?\s?(?<digits>\d[\d,]*(?:\.\d+)?|\.\d+)\s?(?<unit>%|pp|bps|[kmbx])?\)?$/i;

const UNIT_SCALE: Record<string, number> = { k: 1e3, m: 1e6, b: 1e9 };

function toNumber(text: string): number {
	const match = NUMBER_PATTERN.exec(text.trim());
	if (!match?.groups?.digits) return Number.NaN;
	const { open, sign, digits, unit } = match.groups;
	const scale = UNIT_SCALE[unit?.toLowerCase() ?? ""] ?? 1;
	const value = Number(digits.replaceAll(",", "")) * scale;
	const negative = Boolean(open) || sign === "-" || sign === "−";
	return negative ? -value : value;
}

function compareNumbers(
	a: Row<Features, TableRow>,
	b: Row<Features, TableRow>,
	columnId: string,
) {
	return (
		toNumber(a.getValue<string>(columnId)) -
		toNumber(b.getValue<string>(columnId))
	);
}

const collator = new Intl.Collator(undefined, {
	numeric: true,
	sensitivity: "base",
});

function compareText(
	a: Row<Features, TableRow>,
	b: Row<Features, TableRow>,
	columnId: string,
) {
	return collator.compare(
		a.getValue<string>(columnId),
		b.getValue<string>(columnId),
	);
}

/* Export */

function toMarkdown(columns: Column[], rows: TableRow[]): string {
	const escapePipes = (text: string) => text.replaceAll("|", "\\|");
	const line = (cells: string[]) => `| ${cells.join(" | ")} |`;
	const divider = columns.map((column) => {
		const align = alignOf(column);
		if (align === "right") return "---:";
		if (align === "center") return ":---:";
		return "---";
	});
	return [
		line(columns.map((column) => escapePipes(column.header.text))),
		line(divider),
		...rows.map((row) =>
			line(columns.map((_, index) => escapePipes(row[index]?.text ?? ""))),
		),
	].join("\n");
}

function toDelimited(
	columns: Column[],
	rows: TableRow[],
	separator: "," | "\t",
): string {
	const quote = (text: string) =>
		/[",\t\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
	return [
		columns.map((column) => quote(column.header.text)),
		...rows.map((row) =>
			columns.map((_, index) => quote(row[index]?.text ?? "")),
		),
	]
		.map((cells) => cells.join(separator))
		.join("\n");
}
