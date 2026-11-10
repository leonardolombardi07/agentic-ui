import { cn } from "cn";
import { FunnelIcon, XIcon } from "lucide-react";
import { useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Popover,
	PopoverContent,
	PopoverTitle,
	PopoverTrigger,
} from "@/components/ui/popover";
import { ActionButton } from "../action-button";
import type { Table, TableColumn, TableRowModel } from "./model";
import {
	type Column,
	type ColumnKind,
	type ParsedTable,
	toNumber,
} from "./parse";

/*
 * Per-column filters. The value a column's filter holds depends on its kind
 * (see `ColumnKind`); the schemas below are the only shapes it can take.
 */

/** `category`: the values to keep. */
const CategoryValueSchema = z.array(z.string());
/** `number`: bounds as typed ("100K", "$1,200", "15%"); either may be empty. */
const RangeValueSchema = z.object({ min: z.string(), max: z.string() });
/** `text`: what the value must contain. */
const TextValueSchema = z.string();

type RangeValue = z.infer<typeof RangeValueSchema>;

function filterCategory(
	row: TableRowModel,
	columnId: string,
	value: unknown,
): boolean {
	const parsed = CategoryValueSchema.safeParse(value);
	return !parsed.success || parsed.data.includes(row.getValue(columnId));
}
filterCategory.autoRemove = (value: unknown) => {
	const parsed = CategoryValueSchema.safeParse(value);
	return !parsed.success || parsed.data.length === 0;
};

function filterRange(
	row: TableRowModel,
	columnId: string,
	value: unknown,
): boolean {
	const parsed = RangeValueSchema.safeParse(value);
	if (!parsed.success) return true;
	const cell = toNumber(row.getValue(columnId));
	if (Number.isNaN(cell)) return false;
	const min = toNumber(parsed.data.min);
	const max = toNumber(parsed.data.max);
	return (
		(Number.isNaN(min) || cell >= min) && (Number.isNaN(max) || cell <= max)
	);
}
filterRange.autoRemove = (value: unknown) => {
	const parsed = RangeValueSchema.safeParse(value);
	return (
		!parsed.success ||
		(Number.isNaN(toNumber(parsed.data.min)) &&
			Number.isNaN(toNumber(parsed.data.max)))
	);
};

function filterText(
	row: TableRowModel,
	columnId: string,
	value: unknown,
): boolean {
	const parsed = TextValueSchema.safeParse(value);
	if (!parsed.success) return true;
	return row
		.getValue<string>(columnId)
		.toLocaleLowerCase()
		.includes(parsed.data.trim().toLocaleLowerCase());
}
filterText.autoRemove = (value: unknown) => {
	const parsed = TextValueSchema.safeParse(value);
	return !parsed.success || parsed.data.trim() === "";
};

/** The filter function for a column of this kind. */
export function filterFnFor(kind: ColumnKind) {
	if (kind === "category") return filterCategory;
	if (kind === "number") return filterRange;
	return filterText;
}

/** A filter in words, for its chip: "Stage: Commit, Proposal". */
function describeFilter(column: Column, value: unknown): string | null {
	const name = column.header.text;
	if (column.kind === "category") {
		const parsed = CategoryValueSchema.safeParse(value);
		if (!parsed.success) return null;
		const [first, second, ...rest] = parsed.data;
		if (rest.length > 0) return `${name}: ${first} +${rest.length + 1}`;
		return `${name}: ${[first, second].filter(Boolean).join(", ")}`;
	}
	if (column.kind === "number") {
		const parsed = RangeValueSchema.safeParse(value);
		if (!parsed.success) return null;
		const min = parsed.data.min.trim();
		const max = parsed.data.max.trim();
		const hasMin = !Number.isNaN(toNumber(min));
		const hasMax = !Number.isNaN(toNumber(max));
		if (hasMin && hasMax) return `${name}: ${min} to ${max}`;
		if (hasMin) return `${name} ≥ ${min}`;
		if (hasMax) return `${name} ≤ ${max}`;
		return null;
	}
	const parsed = TextValueSchema.safeParse(value);
	return parsed.success ? `${name} contains "${parsed.data.trim()}"` : null;
}

type ColumnFilterProps = {
	table: Table;
	column: TableColumn;
	def: Column;
};

/**
 * The funnel in a column's header. Hidden until the header is hovered or
 * focused, so the table stays calm; always shown while the column is filtered.
 */
export function ColumnFilter({ table, column, def }: ColumnFilterProps) {
	const active = column.getIsFiltered();
	const name = def.header.text || "column";

	function setValue(value: unknown) {
		column.setFilterValue(value);
		// Pages don't reset on their own (streamed tables keep growing).
		table.setPageIndex(0);
	}

	return (
		<Popover>
			<PopoverTrigger
				render={
					<ActionButton
						label={active ? `Edit filter on ${name}` : `Filter by ${name}`}
						className={cn(
							"mr-1 shrink-0 data-popup-open:bg-accent data-popup-open:opacity-100",
							active
								? "text-brand-text"
								: "opacity-0 group-focus-within/th:opacity-100 group-hover/th:opacity-100 focus-visible:opacity-100",
						)}
						data-testid="markdown-table-filter"
					/>
				}
			>
				<FunnelIcon className={cn(active && "fill-current")} />
			</PopoverTrigger>
			<PopoverContent
				align="end"
				className="flex flex-col gap-2"
				data-testid="markdown-table-filter-popover"
			>
				<PopoverTitle>Filter by {name}</PopoverTitle>
				{def.kind === "category" ? (
					<CategoryFilter column={column} def={def} onChange={setValue} />
				) : def.kind === "number" ? (
					<RangeFilter column={column} def={def} onChange={setValue} />
				) : (
					<TextFilter column={column} name={name} onChange={setValue} />
				)}
				{active ? (
					<Button
						variant="ghost"
						size="xs"
						className="self-start"
						onClick={() => setValue(undefined)}
						data-testid="markdown-table-filter-clear"
					>
						Clear filter
					</Button>
				) : null}
			</PopoverContent>
		</Popover>
	);
}

/** Checkboxes with counts; a count is how many rows the other filters leave. */
function CategoryFilter({
	column,
	def,
	onChange,
}: {
	column: TableColumn;
	def: Column;
	onChange: (value: string[]) => void;
}) {
	const parsed = CategoryValueSchema.safeParse(column.getFilterValue());
	const selected = parsed.success ? parsed.data : [];
	const counts = column.getFacetedUniqueValues();

	function toggle(option: string) {
		onChange(
			selected.includes(option)
				? selected.filter((value) => value !== option)
				: [...selected, option],
		);
	}

	return (
		<ul className="-mx-1 flex flex-col">
			{def.options.map((option) => {
				const count = counts.get(option) ?? 0;
				const checked = selected.includes(option);
				return (
					<li key={option}>
						<label
							className={cn(
								"flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 hover:bg-accent",
								count === 0 && !checked && "text-muted-foreground",
							)}
						>
							<input
								type="checkbox"
								checked={checked}
								onChange={() => toggle(option)}
								className="accent-brand"
								data-testid="markdown-table-filter-option"
							/>
							<span className="min-w-0 flex-1 truncate">{option}</span>
							<span className="text-xs text-muted-foreground tabular-nums">
								{count}
							</span>
						</label>
					</li>
				);
			})}
		</ul>
	);
}

/**
 * Min and max, typed the way the table writes them. Kept locally while
 * typing: a half-typed bound ("$") is not a filter yet, but must stay put.
 */
function RangeFilter({
	column,
	def,
	onChange,
}: {
	column: TableColumn;
	def: Column;
	onChange: (value: RangeValue) => void;
}) {
	const [range, setRange] = useState<RangeValue>(() => {
		const parsed = RangeValueSchema.safeParse(column.getFilterValue());
		return parsed.success ? parsed.data : { min: "", max: "" };
	});

	function update(patch: Partial<RangeValue>) {
		const next = { ...range, ...patch };
		setRange(next);
		onChange(next);
	}

	return (
		<div className="flex flex-col gap-1.5">
			<div className="flex items-center gap-2">
				<Input
					value={range.min}
					onChange={(event) => update({ min: event.target.value })}
					placeholder={def.range ? `Min (${def.range.min})` : "Min"}
					aria-label="Minimum"
					autoFocus
					data-testid="markdown-table-filter-min"
				/>
				<span aria-hidden className="text-muted-foreground">
					-
				</span>
				<Input
					value={range.max}
					onChange={(event) => update({ max: event.target.value })}
					placeholder={def.range ? `Max (${def.range.max})` : "Max"}
					aria-label="Maximum"
					data-testid="markdown-table-filter-max"
				/>
			</div>
			<p className="text-xs text-muted-foreground">
				Inclusive. Write it like the table: 100K, $1,200, 15%.
			</p>
		</div>
	);
}

function TextFilter({
	column,
	name,
	onChange,
}: {
	column: TableColumn;
	name: string;
	onChange: (value: string) => void;
}) {
	const parsed = TextValueSchema.safeParse(column.getFilterValue());
	return (
		<Input
			value={parsed.success ? parsed.data : ""}
			onChange={(event) => onChange(event.target.value)}
			placeholder="Contains..."
			aria-label={`${name} contains`}
			autoFocus
			data-testid="markdown-table-filter-text"
		/>
	);
}

/** One removable chip per active filter, so they're visible without opening anything. */
export function ActiveFilters({
	table,
	parsed,
}: {
	table: Table;
	parsed: ParsedTable;
}) {
	const filters = table.state.columnFilters;
	if (filters.length === 0) return null;

	function remove(id: string) {
		table.getColumn(id)?.setFilterValue(undefined);
		table.setPageIndex(0);
	}

	return (
		<ul
			aria-label="Active filters"
			className="flex flex-wrap items-center gap-1.5 border-b border-border px-3 py-1.5"
		>
			{filters.map((filter) => {
				const def = parsed.columns[Number(filter.id)];
				const label = def ? describeFilter(def, filter.value) : null;
				if (!label) return null;
				return (
					<li
						key={filter.id}
						className="flex items-center gap-0.5 rounded-full bg-brand-soft/60 py-0.5 pr-0.5 pl-2.5 text-xs text-foreground"
						data-testid="markdown-table-filter-chip"
					>
						{label}
						<ActionButton
							label={`Remove filter: ${label}`}
							onClick={() => remove(filter.id)}
							className="size-5"
						>
							<XIcon />
						</ActionButton>
					</li>
				);
			})}
			{filters.length > 1 ? (
				<li>
					<Button
						variant="link"
						size="xs"
						onClick={() => {
							table.resetColumnFilters();
							table.setPageIndex(0);
						}}
						data-testid="markdown-table-filter-clear-all"
					>
						Clear all
					</Button>
				</li>
			) : null}
		</ul>
	);
}
