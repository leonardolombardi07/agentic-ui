import {
	Children,
	isValidElement,
	type ReactElement,
	type ReactNode,
} from "react";
import { textOf } from "../text-of";

/*
 * Columns with values longer than this wrap (at word breaks, with a sensible
 * minimum width); shorter ones never do, and a wide table scrolls instead.
 */
const WRAP_FROM_CHARS = 32;

/** Up to this many distinct values, a text column filters by picking values. */
const MAX_CATEGORY_OPTIONS = 12;

export type Align = "left" | "center" | "right";

export type Cell = {
	/** For sorting, searching, filtering and copying. */
	text: string;
	/** The rendered markdown: links, bold, inline code. */
	content: ReactNode;
};

export type TableRow = ReadonlyArray<Cell>;

/**
 * How a column filters:
 * - `number`: every value parses as one (a min/max range)
 * - `category`: a few values that repeat, like a status (pick values)
 * - `text`: anything else (contains)
 */
export type ColumnKind = "number" | "category" | "text";

export type Column = {
	header: Cell;
	align: Align | undefined;
	kind: ColumnKind;
	/** Has long values (sentences, notes), which may wrap; the rest stay on one line. */
	wraps: boolean;
	/** A `category` column's distinct values, sorted. */
	options: string[];
	/** A `number` column's smallest and largest values, as written. */
	range: { min: string; max: string } | null;
	/** How a `number` column writes its values, so totals can match. */
	format: NumberFormat | null;
};

/** "$1,189" is `{ prefix: "$", grouped: true }`, "12.5%" `{ unit: "%", decimals: 1 }`. */
export type NumberFormat = {
	/** A currency symbol, or "". */
	prefix: string;
	/** A unit after the number ("%", "pp", "M"...), or "". */
	unit: string;
	/** What the unit multiplies by: 1e6 for "M", else 1. */
	scale: number;
	decimals: number;
	/** Thousands separators. */
	grouped: boolean;
	/**
	 * Values in different units, like an income statement's "$1,064.0",
	 * "61.8%" and "$0.92". Such a column has no meaningful total.
	 */
	mixed: boolean;
};

export type ParsedTable = {
	columns: Column[];
	/** The data rows: sorted, filtered and totalled. */
	rows: TableRow[];
	/**
	 * A totals row the author wrote last ("**Total** | 24 | $3.2M"). Kept out
	 * of the data, so it doesn't sort or count itself, and pinned to the bottom.
	 */
	footer: TableRow | null;
};

/** A first cell like this marks the last row as the author's totals. */
const TOTAL_LABEL = /^(total|totals|grand total|sum|overall|all)\b/i;

/* react-markdown renders `<table><thead><tr><th>` and `<tbody>` as plain elements. */

type ElementWithChildren = ReactElement<{
	children?: ReactNode;
	style?: { textAlign?: string };
}>;

function elementsOf(node: ReactNode): ElementWithChildren[] {
	return Children.toArray(node).filter((child): child is ElementWithChildren =>
		isValidElement(child),
	);
}

function toCell(element: ElementWithChildren): Cell {
	const content = element.props.children;
	return { text: textOf(content).trim(), content };
}

/** Reads the table react-markdown rendered. Null if it isn't table-shaped. */
export function parseTable(children: ReactNode): ParsedTable | null {
	const sections = elementsOf(children);
	const head = sections.find((section) => section.type === "thead");
	const headerRow = head ? elementsOf(head.props.children)[0] : undefined;
	if (!headerRow) return null;

	const body = sections.find((section) => section.type === "tbody");
	const bodyRows: TableRow[] = body
		? elementsOf(body.props.children).map((row) =>
				elementsOf(row.props.children).map(toCell),
			)
		: [];
	const last = bodyRows.at(-1);
	const footer =
		last && bodyRows.length > 2 && TOTAL_LABEL.test(last[0]?.text ?? "")
			? last
			: null;
	const rows = footer ? bodyRows.slice(0, -1) : bodyRows;

	const columns = elementsOf(headerRow.props.children).map(
		(cell, index): Column => {
			const values = rows
				.map((row) => row[index]?.text ?? "")
				.filter((value) => value !== "");
			const kind = kindOf(values);
			return {
				header: toCell(cell),
				align: parseAlign(cell.props.style?.textAlign),
				kind,
				wraps: values.some((value) => value.length > WRAP_FROM_CHARS),
				options:
					kind === "category"
						? [...new Set(values)].sort(collator.compare)
						: [],
				range: kind === "number" ? rangeOf(values) : null,
				format: kind === "number" ? formatOf(values) : null,
			};
		},
	);
	return { columns, rows, footer };
}

function kindOf(values: string[]): ColumnKind {
	if (values.length === 0) return "text";
	if (values.every((value) => !Number.isNaN(toNumber(value)))) return "number";
	const distinct = new Set(values).size;
	// Values must repeat: a column of unique names is better searched than picked.
	return distinct <= MAX_CATEGORY_OPTIONS && distinct < values.length
		? "category"
		: "text";
}

function rangeOf(values: string[]): { min: string; max: string } | null {
	const [first, ...rest] = values;
	if (first === undefined) return null;
	let min = first;
	let max = first;
	for (const value of rest) {
		if (toNumber(value) < toNumber(min)) min = value;
		if (toNumber(value) > toNumber(max)) max = value;
	}
	return { min, max };
}

function formatOf(values: string[]): NumberFormat {
	let prefix = "";
	let unit = "";
	let decimals = 0;
	let hasSeparators = false;
	// "2026" or "1500" written without a comma: the author doesn't group digits.
	let ungroupedLarge = false;
	const units = new Set<string>();
	for (const value of values) {
		const groups = NUMBER_PATTERN.exec(value.trim())?.groups;
		if (!groups?.digits) continue;
		prefix ||= groups.currency ?? "";
		unit ||= groups.unit ?? "";
		decimals = Math.max(decimals, groups.digits.split(".")[1]?.length ?? 0);
		hasSeparators ||= groups.digits.includes(",");
		ungroupedLarge ||= /^\d{4,}/.test(groups.digits);
		units.add(`${groups.currency ?? ""}|${(groups.unit ?? "").toLowerCase()}`);
	}
	return {
		prefix,
		unit,
		scale: UNIT_SCALE[unit.toLowerCase()] ?? 1,
		decimals,
		// Values under 1,000 give no hint; group a total that grows past it.
		grouped: hasSeparators || !ungroupedLarge,
		mixed: units.size > 1,
	};
}

/** `value` written the way the column writes its own: "-$1,278,700", "56.9%". */
export function formatNumber(
	value: number,
	format: NumberFormat,
	extraDecimals = 0,
): string {
	const scaled = value / format.scale;
	const decimals = format.decimals + extraDecimals;
	const digits = Math.abs(scaled).toLocaleString("en-US", {
		minimumFractionDigits: decimals,
		maximumFractionDigits: decimals,
		useGrouping: format.grouped,
	});
	return `${scaled < 0 ? "-" : ""}${format.prefix}${digits}${format.unit}`;
}

function parseAlign(value: string | undefined): Align | undefined {
	return value === "left" || value === "center" || value === "right"
		? value
		: undefined;
}

/** Explicit alignment from the markdown, else numbers right-aligned. */
export function alignOf(column: Column | undefined): Align | undefined {
	if (!column) return undefined;
	return column.align ?? (column.kind === "number" ? "right" : undefined);
}

export function alignClass(align: Align | undefined): string | undefined {
	if (align === "right") return "text-right";
	if (align === "center") return "text-center";
	return undefined;
}

/*
 * Numbers as people write them in reports: "$1,189", "+20.9%", "-0.7pp", "(12)",
 * "1.2M", "3x". NaN for anything else, which makes the column text.
 */
const NUMBER_PATTERN =
	/^(?<open>\()?(?<sign>[+\-−])?(?<currency>[$€£])?\s?(?<digits>\d[\d,]*(?:\.\d+)?|\.\d+)\s?(?<unit>%|pp|bps|[kmbx])?\)?$/i;

const UNIT_SCALE: Record<string, number> = { k: 1e3, m: 1e6, b: 1e9 };

export function toNumber(text: string): number {
	const match = NUMBER_PATTERN.exec(text.trim());
	if (!match?.groups?.digits) return Number.NaN;
	const { open, sign, digits, unit } = match.groups;
	const scale = UNIT_SCALE[unit?.toLowerCase() ?? ""] ?? 1;
	const value = Number(digits.replaceAll(",", "")) * scale;
	const negative = Boolean(open) || sign === "-" || sign === "−";
	return negative ? -value : value;
}

export const collator = new Intl.Collator(undefined, {
	numeric: true,
	sensitivity: "base",
});
