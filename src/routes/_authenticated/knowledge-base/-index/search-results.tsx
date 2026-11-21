import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { cn } from "cn";
import { ChevronRightIcon, FolderIcon, SearchXIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { knowledgeSearchQueryOptions } from "@/lib/api/knowledge-base/queries";
import type { SearchHit, VisibleSpace } from "@/lib/api/types/knowledge-base";
import { resolveFileType } from "@/lib/file-preview";
import { openFileSearch } from "./search";
import { formatDate, RestrictedBadge, SPACE_KIND_ICONS } from "./space-meta";

type SearchResultsProps = {
	q: string;
	scope: "all" | "space";
	/** The space the user was in when they searched: what "space" scope means. */
	space: VisibleSpace | undefined;
	onScopeChange: (scope: "all" | "space") => void;
};

/**
 * Results across the spaces the user can see. A file shows the passages that matched,
 * since search reads content, not just names. Each result says where it lives, because
 * the same file name can exist in several spaces with different audiences.
 */
export function SearchResults({
	q,
	scope,
	space,
	onScopeChange,
}: SearchResultsProps) {
	const scopedSpaceId = scope === "space" ? space?.id : undefined;
	const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
	// Not suspense: the previous results stay on screen while the next ones load.
	const { data: hits, isPlaceholderData } = useQuery({
		...knowledgeSearchQueryOptions(q, scopedSpaceId),
		placeholderData: keepPreviousData,
	});

	return (
		<section
			aria-label="Search results"
			className="flex flex-col gap-4 px-6 py-5"
			data-testid="kb-search-results"
		>
			<div className="flex flex-wrap items-center justify-between gap-3">
				<h2 className="flex items-center gap-2 text-lg font-medium">
					Results
					{hits ? (
						<span
							className="rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-muted-foreground tabular-nums"
							data-testid="kb-search-count"
						>
							{hits.length}
						</span>
					) : null}
				</h2>
				{space ? (
					<fieldset className="flex items-center gap-1 rounded-lg bg-accent p-0.5">
						<legend className="sr-only">Where to search</legend>
						<ScopeButton
							isActive={scope === "all"}
							onClick={() => onScopeChange("all")}
							testId="kb-search-scope-all"
						>
							Everywhere I have access
						</ScopeButton>
						<ScopeButton
							isActive={scope === "space"}
							onClick={() => onScopeChange("space")}
							testId="kb-search-scope-space"
						>
							{space.name}
						</ScopeButton>
					</fieldset>
				) : null}
			</div>

			{hits === undefined ? (
				<div className="flex flex-col gap-2">
					<Skeleton className="h-16 w-full" />
					<Skeleton className="h-16 w-full" />
					<Skeleton className="h-16 w-full" />
				</div>
			) : hits.length === 0 ? (
				<div
					className="flex flex-col items-center gap-2 py-20 text-center"
					data-testid="kb-search-empty"
				>
					<SearchXIcon className="size-8 text-text-dim" />
					<p className="text-sm font-medium">Nothing matches "{q}"</p>
					<p className="max-w-sm text-sm text-muted-foreground">
						Search only covers the spaces you have access to. If you expected a
						file here, ask a manager of its space to add you.
					</p>
				</div>
			) : (
				<ul
					className={cn(
						"flex flex-col transition-opacity duration-120",
						isPlaceholderData && "opacity-60",
					)}
				>
					{hits.map((hit) => (
						<Hit key={hit.node.id} hit={hit} terms={terms} />
					))}
				</ul>
			)}
		</section>
	);
}

function ScopeButton({
	isActive,
	onClick,
	testId,
	children,
}: {
	isActive: boolean;
	onClick: () => void;
	testId: string;
	children: string;
}) {
	return (
		<button
			type="button"
			aria-pressed={isActive}
			onClick={onClick}
			className={cn(
				"h-7 rounded-md px-2.5 text-sm text-muted-foreground outline-none transition-colors duration-120 hover:text-foreground focus-visible:ring-1 focus-visible:ring-ring",
				isActive && "bg-background font-medium text-foreground shadow-sm",
			)}
			data-testid={testId}
		>
			{children}
		</button>
	);
}

const hitLinkClassName =
	"truncate text-sm font-medium outline-none after:absolute after:inset-0 focus-visible:after:ring-1 focus-visible:after:ring-ring";

/**
 * A folder result opens the folder. A file result opens the file beside the results, and
 * each matched passage opens it at the place the passage is on.
 */
function Hit({ hit, terms }: { hit: SearchHit; terms: string[] }) {
	const { node, space, path, passages } = hit;
	const Icon = node.kind === "folder" ? FolderIcon : resolveFileType(node).icon;
	const SpaceIcon = SPACE_KIND_ICONS[space.kind];

	return (
		<li
			className="relative flex gap-3 border-b border-border px-2 py-3 transition-colors duration-120 hover:bg-accent"
			data-testid="kb-search-hit"
			data-node-id={node.id}
		>
			<Icon
				className={cn(
					"mt-0.5 size-4.5 shrink-0",
					node.kind === "folder"
						? "fill-brand-soft text-brand-text"
						: "text-muted-foreground",
				)}
			/>
			<div className="flex min-w-0 flex-1 flex-col gap-1">
				{node.kind === "folder" ? (
					<Link
						to="/knowledge-base"
						search={{ space: space.id, folder: node.id }}
						className={hitLinkClassName}
					>
						<Highlighted text={node.name} terms={terms} />
					</Link>
				) : (
					<Link
						to="."
						search={(prev) => ({ ...prev, ...openFileSearch(node.id) })}
						className={hitLinkClassName}
					>
						<Highlighted text={node.name} terms={terms} />
					</Link>
				)}

				{passages.length > 0 ? (
					<ul className="flex flex-col gap-1" data-testid="kb-search-passages">
						{passages.map((passage) => (
							<li key={passage.id}>
								{/* Above the row's stretched link, so it gets its own click. */}
								<Link
									to="."
									search={(prev) => ({
										...prev,
										...openFileSearch(node.id, passage),
									})}
									className="relative z-10 flex flex-col gap-1 rounded-md py-1 pr-2 pl-2 text-sm @lg:flex-row @lg:gap-2 text-text-secondary outline-none transition-colors duration-120 hover:bg-control-active focus-visible:ring-1 focus-visible:ring-ring"
									data-testid="kb-search-passage"
								>
									<span className="mt-0.5 h-fit w-fit shrink-0 rounded-sm bg-accent px-1.5 text-xs font-medium whitespace-nowrap text-muted-foreground">
										{passage.label}
									</span>
									<span className="line-clamp-2">
										<Highlighted text={passage.text} terms={terms} />
									</span>
								</Link>
							</li>
						))}
					</ul>
				) : node.kind === "file" && node.summary ? (
					<p className="line-clamp-2 text-sm text-muted-foreground">
						<Highlighted text={node.summary} terms={terms} />
					</p>
				) : null}

				<p className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
					<SpaceIcon className="size-3.5 shrink-0" />
					<span>{space.name}</span>
					{space.isRestricted ? <RestrictedBadge className="relative" /> : null}
					{path.map((name, index) => (
						// The same folder name can repeat along a path.
						// biome-ignore lint/suspicious/noArrayIndexKey: a path never reorders
						<span key={index} className="flex items-center gap-1">
							<ChevronRightIcon aria-hidden className="size-3 text-text-dim" />
							{name}
						</span>
					))}
				</p>
			</div>
			<p className="hidden shrink-0 text-xs text-muted-foreground @lg:block">
				{formatDate(node.updatedAt)}
			</p>
		</li>
	);
}

/** The text with every search term marked, so the eye lands on why it matched. */
function Highlighted({ text, terms }: { text: string; terms: string[] }) {
	if (terms.length === 0) return text;
	const pattern = new RegExp(
		`(${terms.map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`,
		"gi",
	);
	// With one capturing group, split() puts the matches at the odd positions.
	return text.split(pattern).map((part, index) =>
		index % 2 === 1 ? (
			<mark
				// biome-ignore lint/suspicious/noArrayIndexKey: the parts of one string, in order
				key={index}
				className="rounded-sm bg-warning-soft text-foreground"
			>
				{part}
			</mark>
		) : (
			part
		),
	);
}
