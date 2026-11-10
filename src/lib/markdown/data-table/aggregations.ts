import { constructAggregationFn } from "@tanstack/react-table";
import { type Column, toNumber } from "./parse";

/*
 * Totals for `number` columns. Cells hold text as written ("$182,000",
 * "90%"), so these parse it first; TanStack's built-ins expect numbers.
 * Each returns null when no row has a number to work with.
 */

export const AGGREGATIONS = [
	"total",
	"average",
	"median",
	"min",
	"max",
] as const;

export type Aggregation = (typeof AGGREGATIONS)[number];

export type AggregationValues = Record<Aggregation, number | null>;

export const AGGREGATION_LABELS: Record<Aggregation, string> = {
	total: "Sum",
	average: "Average",
	median: "Median",
	min: "Min",
	max: "Max",
};

/** The part of TanStack's aggregation context these use. */
type Context<TRow> = {
	rows: ReadonlyArray<TRow>;
	getValue: (row: TRow) => unknown;
};

function numbersOf<TRow>({ rows, getValue }: Context<TRow>): number[] {
	return rows
		.map((row) => toNumber(String(getValue(row) ?? "")))
		.filter((value) => !Number.isNaN(value));
}

function sum(values: number[]): number {
	return values.reduce((acc, value) => acc + value, 0);
}

export const aggregationFns = {
	total: constructAggregationFn({
		aggregate: (context) => {
			const values = numbersOf(context);
			return values.length > 0 ? sum(values) : null;
		},
	}),
	average: constructAggregationFn({
		aggregate: (context) => {
			const values = numbersOf(context);
			return values.length > 0 ? sum(values) / values.length : null;
		},
	}),
	median: constructAggregationFn({
		aggregate: (context) => {
			const values = numbersOf(context).sort((a, b) => a - b);
			if (values.length === 0) return null;
			const middle = Math.floor(values.length / 2);
			const upper = values[middle] ?? 0;
			return values.length % 2 === 1
				? upper
				: ((values[middle - 1] ?? 0) + upper) / 2;
		},
	}),
	min: constructAggregationFn({
		aggregate: (context) => {
			const values = numbersOf(context);
			return values.length > 0 ? Math.min(...values) : null;
		},
	}),
	max: constructAggregationFn({
		aggregate: (context) => {
			const values = numbersOf(context);
			return values.length > 0 ? Math.max(...values) : null;
		},
	}),
};

/** Units whose values are rates, not amounts. */
const RATE_UNITS = new Set(["%", "pp", "bps", "x"]);

/*
 * Headers of columns whose values don't add up: durations ("Age (h)",
 * "p95 (ms)"), rates, scores and unit prices.
 */
const AVERAGED_HEADER =
	/\((h|hrs?|hours?|mins?|minutes?|s|secs?|seconds?|ms|days?)\)|\b(age|latency|duration|time|rate|ratio|score|rating|avg|average|mean|median|p\d{2}|percentile|price|margin|temperature)\b/i;

/**
 * Amounts add up; rates and durations don't: "90%", "1.2x" or an "Age (h)"
 * column starts at its average, anything else at its sum.
 */
export function defaultAggregation(column: Column): Aggregation {
	const unit = column.format?.unit.toLowerCase() ?? "";
	return RATE_UNITS.has(unit) || AVERAGED_HEADER.test(column.header.text)
		? "average"
		: "total";
}
