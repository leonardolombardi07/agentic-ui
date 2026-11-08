import { Link, type LinkProps } from "@tanstack/react-router";
import { cn } from "cn";
import {
	ArrowRightIcon,
	ArrowUpDownIcon,
	BadgeCheckIcon,
	CheckIcon,
	ListFilterIcon,
	PlusIcon,
	SearchIcon,
} from "lucide-react";
import { type ReactNode, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import type { CatalogSearch } from "./search";
import { ToggleButton } from "./toggle-button";

/** How many cards Discover previews before "Show all". */
const PREVIEW_COUNT = 6;

/** What a card needs, whatever the item is. Each list maps its own data to this. */
export type CatalogItem = {
	id: string;
	name: string;
	description: string;
	/** Small line under the description, e.g. "Anthropic Directory" or "by Google". */
	byline: string;
	category: string;
	/** ISO date-time. Only needed to sort by "recent". */
	updatedAt?: string;
	isVerified?: boolean;
	icon: ReactNode;
	isAdded: boolean;
	/** Where the card goes. */
	link: Pick<LinkProps, "to" | "params">;
};

/** The words that differ between the three lists. */
export type CatalogCopy = {
	/** Plural, lowercase: "skills". */
	noun: string;
	/** Heading of the Discover preview, e.g. "New skills". */
	discoverTitle: string;
	/** Tooltip of the add button: "Add to your skills". */
	addLabel: string;
	removeLabel: string;
	/** Empty "Yours" message. */
	emptyYours: string;
};

type CatalogProps = {
	/** Test id prefix and the active tab. */
	kind: "skills" | "connectors" | "prompts";
	copy: CatalogCopy;
	items: CatalogItem[];
	search: CatalogSearch;
	onSearchChange: (patch: Partial<CatalogSearch>) => void;
	onToggle: (item: CatalogItem) => void;
	/** The item whose add or remove is in flight. */
	pendingId: string | undefined;
	/** Items of the "Add" menu. */
	addMenu: ReactNode;
};

/**
 * The page of a Customize list: title, tabs, Yours / Discover, search, filter, sort and
 * the cards. State lives in the URL (`search`), so the page itself keeps none besides
 * whether the search box is open.
 */
export function Catalog({
	kind,
	copy,
	items,
	search,
	onSearchChange,
	onToggle,
	pendingId,
	addMenu,
}: CatalogProps) {
	const { view, q, category, sort, all } = search;
	const terms = (q ?? "").toLowerCase().split(/\s+/).filter(Boolean);
	const hasDates = items.some((item) => item.updatedAt);
	const categories = [...new Set(items.map((item) => item.category))].sort();

	const matching = sortItems(
		items.filter((item) => {
			if (view === "yours" && !item.isAdded) return false;
			if (category && item.category !== category) return false;
			const haystack =
				`${item.name} ${item.description} ${item.byline}`.toLowerCase();
			return terms.every((term) => haystack.includes(term));
		}),
		sort,
	);

	const isFiltering = terms.length > 0 || Boolean(category);
	const isPreview = view === "discover" && !isFiltering && !all;
	const shown = isPreview ? matching.slice(0, PREVIEW_COUNT) : matching;

	let heading: string;
	if (view === "yours") heading = `Your ${copy.noun}`;
	else if (isPreview) heading = copy.discoverTitle;
	else heading = isFiltering ? "Results" : `All ${copy.noun}`;

	return (
		<div
			className="mx-auto flex max-w-5xl flex-col gap-6 px-6 py-8 sm:px-9"
			data-testid={`customize-${kind}`}
		>
			<h1 className="text-3xl font-medium tracking-tight">Customize</h1>

			<div className="flex flex-wrap items-center gap-x-3 gap-y-3">
				<Tabs active={kind} />
				<div className="hidden h-5 w-px bg-border sm:block" />
				<ViewSwitch
					view={view}
					onChange={(next) => onSearchChange({ view: next, all: undefined })}
				/>
				<div className="ml-auto flex items-center gap-1">
					<SearchControl
						q={q}
						noun={copy.noun}
						onChange={(value) =>
							onSearchChange({ q: value || undefined, all: undefined })
						}
					/>
					<FilterMenu
						categories={categories}
						value={category}
						onChange={(next) =>
							onSearchChange({ category: next, all: undefined })
						}
					/>
					<SortMenu
						value={sort}
						hasDates={hasDates}
						onChange={(next) => onSearchChange({ sort: next })}
					/>
					<DropdownMenu>
						<DropdownMenuTrigger
							render={
								<Button
									variant="default"
									size="lg"
									className="ml-1 rounded-lg"
									data-testid="customize-add"
								/>
							}
						>
							<PlusIcon />
							Add
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">{addMenu}</DropdownMenuContent>
					</DropdownMenu>
				</div>
			</div>

			<section
				className="flex flex-col gap-4"
				aria-labelledby="catalog-heading"
			>
				<div className="flex items-center justify-between gap-4">
					<h2
						id="catalog-heading"
						className="flex items-center gap-2 text-base font-semibold"
					>
						{heading}
						<span
							className="rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-muted-foreground tabular-nums"
							data-testid="catalog-count"
						>
							{matching.length}
						</span>
					</h2>
					{isPreview && matching.length > PREVIEW_COUNT ? (
						<button
							type="button"
							className="flex items-center gap-1.5 rounded-md px-1 text-sm font-medium outline-none hover:text-brand-text focus-visible:ring-1 focus-visible:ring-ring"
							onClick={() => onSearchChange({ all: true })}
							data-testid="catalog-show-all"
						>
							Show all
							<ArrowRightIcon className="size-4" />
						</button>
					) : null}
				</div>

				{shown.length === 0 ? (
					<p
						className="py-16 text-center text-sm text-muted-foreground"
						data-testid="catalog-empty"
					>
						{view === "yours" && !isFiltering ? (
							<>
								{copy.emptyYours}{" "}
								<button
									type="button"
									className="text-brand-text underline-offset-4 hover:underline"
									onClick={() => onSearchChange({ view: "discover" })}
								>
									Discover {copy.noun}
								</button>
							</>
						) : (
							`No ${copy.noun} match your search.`
						)}
					</p>
				) : (
					<ul
						className="grid grid-cols-1 gap-3 md:grid-cols-2"
						data-testid="catalog-grid"
					>
						{shown.map((item) => (
							<CatalogCard
								key={item.id}
								kind={kind}
								item={item}
								copy={copy}
								isPending={pendingId === item.id}
								onToggle={() => onToggle(item)}
							/>
						))}
					</ul>
				)}
			</section>
		</div>
	);
}

/**
 * The whole card opens the item: the name link is stretched over it (`after:inset-0`),
 * so the add button can sit on top without nesting interactive elements.
 */
function CatalogCard({
	kind,
	item,
	copy,
	isPending,
	onToggle,
}: {
	kind: CatalogProps["kind"];
	item: CatalogItem;
	copy: CatalogCopy;
	isPending: boolean;
	onToggle: () => void;
}) {
	return (
		<li
			className="relative flex gap-4 rounded-card border border-border bg-card p-4 transition-colors duration-120 hover:bg-control-hover"
			data-testid={`${kind}-card`}
			data-item-id={item.id}
		>
			{item.icon}
			<div className="flex min-w-0 flex-1 flex-col gap-0.5">
				<h3 className="flex items-center gap-1.5 text-[15px] font-semibold">
					<Link
						{...item.link}
						className="min-w-0 truncate text-foreground outline-none after:absolute after:inset-0 after:rounded-card focus-visible:after:ring-1 focus-visible:after:ring-ring"
						data-testid={`${kind}-card-link`}
					>
						{item.name}
					</Link>
					{item.isVerified ? <VerifiedBadge /> : null}
				</h3>
				<p className="line-clamp-2 text-sm text-muted-foreground">
					{item.description}
				</p>
				<p className="mt-1 text-sm text-muted-foreground">{item.byline}</p>
			</div>
			<ToggleButton
				name={item.name}
				isAdded={item.isAdded}
				isPending={isPending}
				onToggle={onToggle}
				addLabel={copy.addLabel}
				removeLabel={copy.removeLabel}
				variant="card"
				testId={`${kind}-card-toggle`}
			/>
		</li>
	);
}

export function VerifiedBadge() {
	return (
		<Tooltip>
			<TooltipTrigger
				render={
					<BadgeCheckIcon
						aria-label="Verified"
						role="img"
						className="size-4 shrink-0 text-muted-foreground"
					/>
				}
			/>
			<TooltipContent>Verified</TooltipContent>
		</Tooltip>
	);
}

const tabClassName =
	"flex h-9 items-center rounded-lg px-3.5 text-[15px] text-foreground outline-none transition-colors duration-120 hover:bg-accent focus-visible:ring-1 focus-visible:ring-ring";
const activeTabClassName = "bg-control-active";

/** Skills / Connectors / Prompts. Each is its own route, so the tab is just a link. */
function Tabs({ active }: { active: CatalogProps["kind"] }) {
	const tabs = [
		<Link
			key="skills"
			to="/skills"
			className={cn(tabClassName, active === "skills" && activeTabClassName)}
			aria-current={active === "skills" ? "page" : undefined}
			data-testid="customize-tab-skills"
		>
			Skills
		</Link>,
		<Link
			key="connectors"
			to="/connectors"
			className={cn(
				tabClassName,
				active === "connectors" && activeTabClassName,
			)}
			aria-current={active === "connectors" ? "page" : undefined}
			data-testid="customize-tab-connectors"
		>
			Connectors
		</Link>,
		<Link
			key="prompts"
			to="/prompts"
			className={cn(tabClassName, active === "prompts" && activeTabClassName)}
			aria-current={active === "prompts" ? "page" : undefined}
			data-testid="customize-tab-prompts"
		>
			Prompts
		</Link>,
	];
	return (
		<nav aria-label="Customize" className="flex items-center gap-1">
			{tabs}
		</nav>
	);
}

/** Yours / Discover, as a segmented control. */
function ViewSwitch({
	view,
	onChange,
}: {
	view: CatalogSearch["view"];
	onChange: (view: CatalogSearch["view"]) => void;
}) {
	const options = [
		{ value: "yours", label: "Yours" },
		{ value: "discover", label: "Discover" },
	] as const;
	return (
		<fieldset className="flex gap-0.5 rounded-xl bg-control p-0.5">
			<legend className="sr-only">Show</legend>
			{options.map((option) => (
				<button
					key={option.value}
					type="button"
					aria-pressed={view === option.value}
					className={cn(
						"h-8 rounded-[10px] border border-transparent px-4 text-[15px] outline-none transition-colors duration-120 hover:text-foreground focus-visible:ring-1 focus-visible:ring-ring",
						view === option.value
							? "border-input bg-control-active text-foreground"
							: "text-muted-foreground",
					)}
					onClick={() => onChange(option.value)}
					data-testid={`customize-view-${option.value}`}
				>
					{option.label}
				</button>
			))}
		</fieldset>
	);
}

/** An icon that opens a search box in its place. Stays open while there is a query. */
function SearchControl({
	q,
	noun,
	onChange,
}: {
	q: string | undefined;
	noun: string;
	onChange: (value: string) => void;
}) {
	const [isOpen, setIsOpen] = useState(Boolean(q));

	if (isOpen || q) {
		return (
			<Input
				type="search"
				autoFocus
				aria-label={`Search ${noun}`}
				placeholder={`Search ${noun}`}
				value={q ?? ""}
				className="h-9 w-44 rounded-lg sm:w-56"
				onChange={(event) => onChange(event.target.value)}
				onBlur={() => {
					if (!q) setIsOpen(false);
				}}
				data-testid="customize-search"
			/>
		);
	}
	return (
		<IconButton
			label={`Search ${noun}`}
			onClick={() => setIsOpen(true)}
			testId="customize-search-open"
		>
			<SearchIcon />
		</IconButton>
	);
}

function FilterMenu({
	categories,
	value,
	onChange,
}: {
	categories: string[];
	value: string | undefined;
	onChange: (category: string | undefined) => void;
}) {
	return (
		<DropdownMenu>
			<Tooltip>
				<TooltipTrigger
					render={
						<DropdownMenuTrigger
							render={
								<Button
									variant="ghost"
									size="icon-lg"
									className={cn("rounded-lg", value && "text-brand-text")}
									aria-label="Filter by category"
									data-testid="customize-filter"
								/>
							}
						/>
					}
				>
					<ListFilterIcon />
				</TooltipTrigger>
				<TooltipContent>Filter by category</TooltipContent>
			</Tooltip>
			<DropdownMenuContent align="end" className="min-w-48">
				<DropdownMenuGroup>
					<DropdownMenuLabel>Category</DropdownMenuLabel>
					<CheckItem checked={!value} onClick={() => onChange(undefined)}>
						All categories
					</CheckItem>
					{categories.map((category) => (
						<CheckItem
							key={category}
							checked={value === category}
							onClick={() => onChange(category)}
						>
							{category}
						</CheckItem>
					))}
				</DropdownMenuGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

const SORT_LABELS: Record<CatalogSearch["sort"], string> = {
	featured: "Featured",
	name: "Name",
	recent: "Recently updated",
};

function SortMenu({
	value,
	hasDates,
	onChange,
}: {
	value: CatalogSearch["sort"];
	hasDates: boolean;
	onChange: (sort: CatalogSearch["sort"]) => void;
}) {
	const options = (["featured", "name", "recent"] as const).filter(
		(option) => option !== "recent" || hasDates,
	);
	return (
		<DropdownMenu>
			<Tooltip>
				<TooltipTrigger
					render={
						<DropdownMenuTrigger
							render={
								<Button
									variant="ghost"
									size="icon-lg"
									className="rounded-lg"
									aria-label="Sort"
									data-testid="customize-sort"
								/>
							}
						/>
					}
				>
					<ArrowUpDownIcon />
				</TooltipTrigger>
				<TooltipContent>Sort</TooltipContent>
			</Tooltip>
			<DropdownMenuContent align="end" className="min-w-48">
				<DropdownMenuGroup>
					<DropdownMenuLabel>Sort by</DropdownMenuLabel>
					{options.map((option) => (
						<CheckItem
							key={option}
							checked={value === option}
							onClick={() => onChange(option)}
							testId={`customize-sort-${option}`}
						>
							{SORT_LABELS[option]}
						</CheckItem>
					))}
				</DropdownMenuGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

function CheckItem({
	checked,
	onClick,
	testId,
	children,
}: {
	checked: boolean;
	onClick: () => void;
	testId?: string;
	children: ReactNode;
}) {
	return (
		<DropdownMenuItem onClick={onClick} data-testid={testId}>
			{children}
			{checked ? <CheckIcon className="ml-auto" /> : null}
		</DropdownMenuItem>
	);
}

function IconButton({
	label,
	onClick,
	testId,
	children,
}: {
	label: string;
	onClick: () => void;
	testId: string;
	children: ReactNode;
}) {
	return (
		<Tooltip>
			<TooltipTrigger
				render={
					<Button
						variant="ghost"
						size="icon-lg"
						className="rounded-lg"
						aria-label={label}
						onClick={onClick}
						data-testid={testId}
					/>
				}
			>
				{children}
			</TooltipTrigger>
			<TooltipContent>{label}</TooltipContent>
		</Tooltip>
	);
}

/** "featured" keeps the API order. Items without a date sort last by "recent". */
function sortItems(
	items: CatalogItem[],
	sort: CatalogSearch["sort"],
): CatalogItem[] {
	if (sort === "name") {
		return [...items].sort((a, b) => a.name.localeCompare(b.name));
	}
	if (sort === "recent") {
		return [...items].sort((a, b) =>
			(b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""),
		);
	}
	return items;
}
