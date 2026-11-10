import { alignOf, type Column, type TableRow } from "./parse";

/** The rows as a GFM table, keeping the columns' alignment. */
export function toMarkdown(columns: Column[], rows: TableRow[]): string {
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

/** CSV (`,`) or TSV (`\t`, what spreadsheets paste), quoted where needed. */
export function toDelimited(
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

/** Saves the rows as `table.csv`. */
export function downloadCsv(columns: Column[], rows: TableRow[]): void {
	const csv = toDelimited(columns, rows, ",");
	// The byte order mark makes Excel read the file as UTF-8.
	const blob = new Blob(["﻿", csv], { type: "text/csv;charset=utf-8" });
	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = url;
	link.download = "table.csv";
	link.click();
	URL.revokeObjectURL(url);
}
