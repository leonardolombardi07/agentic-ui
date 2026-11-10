import {
	columnFacetingFeature,
	columnFilteringFeature,
	createColumnHelper,
	createFacetedRowModel,
	createFacetedUniqueValues,
	createFilteredRowModel,
	createPaginatedRowModel,
	createSortedRowModel,
	filterFn_includesString,
	globalFilteringFeature,
	type ReactTable,
	type Row,
	rowAggregationFeature,
	rowPaginationFeature,
	rowSortingFeature,
	tableFeatures,
} from "@tanstack/react-table";
import { aggregationFns } from "./aggregations";
import { collator, type TableRow, toNumber } from "./parse";

/*
 * The table's TanStack setup. Each feature and row model is registered
 * explicitly (v9 tree-shakes the rest); prerequisites come first.
 */
export const features = tableFeatures({
	rowSortingFeature,
	columnFilteringFeature,
	globalFilteringFeature,
	columnFacetingFeature,
	rowPaginationFeature,
	// Totals of the filtered rows, for the footer (see aggregations.ts).
	rowAggregationFeature,
	aggregationFns,
	filteredRowModel: createFilteredRowModel(),
	// Value counts for the filter popovers, given the other active filters.
	facetedRowModel: createFacetedRowModel(),
	facetedUniqueValues: createFacetedUniqueValues(),
	sortedRowModel: createSortedRowModel(),
	paginatedRowModel: createPaginatedRowModel(),
	filterFns: { includesString: filterFn_includesString },
});

export type Features = typeof features;
export type Table = ReactTable<Features, TableRow>;
export type TableRowModel = Row<Features, TableRow>;
export type TableColumn = NonNullable<ReturnType<Table["getColumn"]>>;

export const columnHelper = createColumnHelper<Features, TableRow>();

export function compareNumbers(
	a: TableRowModel,
	b: TableRowModel,
	columnId: string,
): number {
	return (
		toNumber(a.getValue<string>(columnId)) -
		toNumber(b.getValue<string>(columnId))
	);
}

export function compareText(
	a: TableRowModel,
	b: TableRowModel,
	columnId: string,
): number {
	return collator.compare(
		a.getValue<string>(columnId),
		b.getValue<string>(columnId),
	);
}
