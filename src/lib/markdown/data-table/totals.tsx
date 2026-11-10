import { cn } from "cn";
import { CheckIcon } from "lucide-react";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	AGGREGATION_LABELS,
	AGGREGATIONS,
	type Aggregation,
	type AggregationValues,
	defaultAggregation,
} from "./aggregations";
import type { Table } from "./model";
import {
	alignClass,
	alignOf,
	type Column,
	formatNumber,
	type ParsedTable,
} from "./parse";

/** The calculation the user picked per column id; unpicked ones use the default. */
export type AggregationChoices = Partial<Record<string, Aggregation>>;

export function aggregationFor(
	choices: AggregationChoices,
	id: string,
	column: Column,
): Aggregation {
	return choices[id] ?? defaultAggregation(column);
}

type TotalsProps = {
	table: Table;
	parsed: ParsedTable;
	choices: AggregationChoices;
	onChoose: (columnId: string, aggregation: Aggregation) => void;
	/** Pinned to the bottom of a scrolling container (the expanded view). */
	sticky?: boolean;
};

/**
 * The table's last row: totals of the rows that match the search and filters,
 * across all pages. The author's own totals row, when there is one, shows
 * instead until the table is filtered, when it would no longer add up.
 */
export function Totals({
	table,
	parsed,
	choices,
	onChoose,
	sticky = false,
}: TotalsProps) {
	const rows = table.getFilteredRowModel().rows;
	const isFiltered = rows.length !== parsed.rows.length;
	const hasNumbers = parsed.columns.some(isTotalled);
	const footClass = cn(
		"border-t-2 border-border bg-muted/40",
		sticky && "sticky bottom-0 z-10 bg-muted",
	);

	if (parsed.footer && !isFiltered) {
		return (
			<tfoot className={footClass} data-testid="markdown-table-footer">
				<tr>
					{parsed.columns.map((column, index) => (
						<td
							// biome-ignore lint/suspicious/noArrayIndexKey: columns are positional and never reorder
							key={index}
							className={cn(
								"px-3 py-1.5 font-semibold whitespace-nowrap",
								column.kind === "number" && "tabular-nums",
								alignClass(alignOf(column)),
							)}
						>
							{parsed.footer?.[index]?.content}
						</td>
					))}
				</tr>
			</tfoot>
		);
	}

	if (!hasNumbers || parsed.rows.length < 2) return null;

	const scope = { rows };
	return (
		<tfoot className={footClass} data-testid="markdown-table-totals">
			<tr>
				{table.getAllLeafColumns().map((tableColumn, index) => {
					const column = parsed.columns[Number(tableColumn.id)];
					if (column && isTotalled(column) && column.format) {
						return (
							<td key={tableColumn.id} className="p-0">
								<TotalCell
									column={column}
									values={tableColumn.getAggregationValue<AggregationValues>(
										scope,
									)}
									aggregation={aggregationFor(choices, tableColumn.id, column)}
									onChoose={(aggregation) =>
										onChoose(tableColumn.id, aggregation)
									}
								/>
							</td>
						);
					}
					return (
						<td
							key={tableColumn.id}
							className="px-3 py-1.5 font-semibold whitespace-nowrap"
						>
							{index === 0 ? (
								<>
									Total{" "}
									<span className="font-normal text-muted-foreground">
										({rows.length} {isFiltered ? "matching" : "rows"})
									</span>
								</>
							) : null}
						</td>
					);
				})}
			</tr>
		</tfoot>
	);
}

/** Number columns in one unit; a mix of $ and % doesn't add up to anything. */
function isTotalled(column: Column): boolean {
	return column.kind === "number" && column.format?.mixed === false;
}

/** A column's total; click to switch to its average, median, min or max. */
function TotalCell({
	column,
	values,
	aggregation,
	onChoose,
}: {
	column: Column;
	values: AggregationValues;
	aggregation: Aggregation;
	onChoose: (aggregation: Aggregation) => void;
}) {
	const name = column.header.text || "column";
	const align = alignOf(column);

	function format(kind: Aggregation): string {
		const value = values[kind];
		if (value === null || !column.format) return "-";
		// An average of whole percentages reads better with a decimal: 56.9%.
		const extra =
			(kind === "average" || kind === "median") &&
			column.format.unit !== "" &&
			column.format.scale === 1 &&
			column.format.decimals === 0
				? 1
				: 0;
		return formatNumber(value, column.format, extra);
	}

	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				render={
					<button
						type="button"
						aria-label={`${name}: ${AGGREGATION_LABELS[aggregation]} ${format(aggregation)}. Change the calculation`}
						className={cn(
							"flex w-full items-baseline gap-1.5 px-3 py-1.5 whitespace-nowrap outline-none hover:bg-accent focus-visible:bg-accent data-popup-open:bg-accent",
							align === "right" && "justify-end",
							align === "center" && "justify-center",
						)}
						data-testid="markdown-table-total"
					/>
				}
			>
				<span className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
					{AGGREGATION_LABELS[aggregation]}
				</span>
				<span className="font-semibold tabular-nums">
					{format(aggregation)}
				</span>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="min-w-52">
				<DropdownMenuGroup>
					<DropdownMenuLabel>{name}</DropdownMenuLabel>
					{AGGREGATIONS.map((kind) => (
						<DropdownMenuItem
							key={kind}
							onClick={() => onChoose(kind)}
							data-testid="markdown-table-total-option"
						>
							<CheckIcon
								aria-hidden
								className={cn(kind !== aggregation && "invisible")}
							/>
							{AGGREGATION_LABELS[kind]}
							<span className="ml-auto pl-4 text-muted-foreground tabular-nums">
								{format(kind)}
							</span>
						</DropdownMenuItem>
					))}
				</DropdownMenuGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
