import { useTable } from "@tanstack/react-table";
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
import { type ReactNode, useMemo, useState } from "react";
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
import { ActionButton, useCopy } from "../action-button";
import { AGGREGATIONS, type Aggregation } from "./aggregations";
import { downloadCsv, toDelimited, toMarkdown } from "./export";
import { ActiveFilters, ColumnFilter, filterFnFor } from "./filters";
import {
	columnHelper,
	compareNumbers,
	compareText,
	features,
	type Table,
} from "./model";
import {
	alignClass,
	alignOf,
	type ParsedTable,
	parseTable,
	type TableRow,
} from "./parse";
import { PlainTable, TableBoundary } from "./table-boundary";
import { type AggregationChoices, Totals } from "./totals";

/** Rows per page, inline. Shorter tables show no pagination at all. */
const PAGE_SIZE = 10;
/** Rows per page in the expanded view. */
const EXPANDED_PAGE_SIZE = 25;
/**
 * From this many rows, the search box is worth its space. Column filters have
 * no such threshold: they only appear when a header is hovered or focused.
 */
const SEARCH_FROM_ROWS = 6;
/** A single row has nothing to filter or sort. */
const FILTER_FROM_ROWS = 2;

/**
 * Dev only: a column with this header makes the table throw, so the fallback
 * (`table-boundary.tsx`) can be seen. The seed data has one.
 */
const CRASH_DEMO_HEADER = "[simulate error]";

function isCrashDemo(column: ParsedTable["columns"][number]): boolean {
	return column.header.text === CRASH_DEMO_HEADER;
}

/**
 * A GFM table, made interactive: sort by any column, search, filter by
 * column, page through long ones, copy as Markdown or CSV, download as CSV,
 * and open it larger.
 *
 * It reads the table react-markdown already rendered (`children`), so cells
 * keep their links and formatting.
 */
export function DataTable({ children }: { children?: ReactNode }) {
	return (
		<TableBoundary plain={children}>
			<ParsedDataTable>{children}</ParsedDataTable>
		</TableBoundary>
	);
}

function ParsedDataTable({ children }: { children?: ReactNode }) {
	const parsed = useMemo(() => parseTable(children), [children]);
	// Not the shape we expect (it should always be): the plain table.
	if (!parsed) return <PlainTable>{children}</PlainTable>;
	return <InteractiveTable parsed={parsed} />;
}

function InteractiveTable({ parsed }: { parsed: ParsedTable }) {
	if (import.meta.env.DEV && parsed.columns.some(isCrashDemo)) {
		throw new Error("Simulated table error (demo column in the seed data)");
	}
	const [expanded, setExpanded] = useState(false);
	const [aggregations, setAggregations] = useState<AggregationChoices>({});
	const totals = {
		choices: aggregations,
		onChoose: (columnId: string, aggregation: Aggregation) =>
			setAggregations((current) => ({ ...current, [columnId]: aggregation })),
	};
	const columns = useMemo(
		() =>
			columnHelper.columns(
				parsed.columns.map((column, index) =>
					columnHelper.accessor((row) => row[index]?.text ?? "", {
						id: String(index),
						header: () => column.header.content,
						cell: ({ row }) => row.original[index]?.content,
						sortFn: column.kind === "number" ? compareNumbers : compareText,
						sortUndefined: "last",
						filterFn: filterFnFor(column.kind),
						// Every calculation, so the totals menu can preview them all.
						aggregationFn:
							column.kind === "number" ? [...AGGREGATIONS] : undefined,
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
	const showFilters = rowCount >= FILTER_FROM_ROWS;

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
			<ActiveFilters table={table} parsed={parsed} />
			<TableGrid
				table={table}
				parsed={parsed}
				showFilters={showFilters}
				totals={totals}
			/>
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
					<ActiveFilters table={table} parsed={parsed} />
					<div className="min-h-0 flex-1 overflow-auto">
						<TableGrid
							table={table}
							parsed={parsed}
							showFilters
							totals={totals}
							sticky
						/>
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
	const isFiltered = query !== "" || table.state.columnFilters.length > 0;
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
			{isFiltered ? (
				<span
					className="shrink-0 tabular-nums"
					aria-live="polite"
					data-testid="markdown-table-count"
				>
					{matching} of {total}
				</span>
			) : null}
			<DropdownMenu>
				<DropdownMenuTrigger
					render={
						<ActionButton
							label={isFiltered ? "Copy matching rows" : "Copy table"}
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
				label={isFiltered ? "Download matching rows (CSV)" : "Download CSV"}
				onClick={() => downloadCsv(parsed.columns, visibleRows())}
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
	showFilters,
	totals,
	sticky = false,
}: {
	table: Table;
	parsed: ParsedTable;
	showFilters: boolean;
	totals: Pick<React.ComponentProps<typeof Totals>, "choices" | "onChoose">;
	/** Header and totals stay put while the rows scroll (the expanded view). */
	sticky?: boolean;
}) {
	const rows = table.getRowModel().rows;
	const isFiltered =
		table.state.columnFilters.length > 0 ||
		String(table.state.globalFilter ?? "") !== "";
	return (
		<div className={cn(!sticky && "overflow-x-auto")}>
			<table className="w-full border-collapse text-sm [overflow-wrap:normal]">
				<thead
					className={cn("bg-muted/40", sticky && "sticky top-0 z-10 bg-muted")}
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
										className="group/th p-0 text-left font-semibold whitespace-nowrap text-foreground"
									>
										<div className="flex items-center">
											<button
												type="button"
												onClick={header.column.getToggleSortingHandler()}
												className={cn(
													"group/sort flex min-w-0 flex-1 items-center gap-1 px-3 py-2 outline-none hover:bg-accent focus-visible:bg-accent",
													align === "right" && "flex-row-reverse",
													align === "center" && "justify-center",
												)}
												data-testid="markdown-table-sort"
											>
												<table.FlexRender header={header} />
												<SortIcon direction={sorted} />
											</button>
											{showFilters && column ? (
												<ColumnFilter
													table={table}
													column={header.column}
													def={column}
												/>
											) : null}
										</div>
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
								{isFiltered ? "No rows match the filters." : "No rows."}
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
												column?.kind === "number" && "tabular-nums",
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
				<Totals table={table} parsed={parsed} sticky={sticky} {...totals} />
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
