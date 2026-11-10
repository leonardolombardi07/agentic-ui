import { cn } from "cn";
import { isValidElement, memo, type ReactNode, useId, useMemo } from "react";
import ReactMarkdown, { type Components, type Options } from "react-markdown";
import remarkGfm from "remark-gfm";
import { Blockquote } from "./alert";
import { CodeBlock } from "./code-block";
import { DataTable } from "./data-table";
import { textOf } from "./text-of";

export { CopyButton } from "./action-button";

/*
 * The one place that knows about react-markdown (AGENTS.md: wrap less stable
 * dependencies). Raw HTML in the source is NOT rendered: react-markdown escapes it
 * unless a rehype-raw plugin is added, which model output must never get.
 */

type MarkdownProps = {
	children: string;
	className?: string;
};

const COMPONENTS: Components = {
	a: Link,
	// Wide or long tables get sorting, search, paging and export.
	table: ({ children }) => <DataTable>{children}</DataTable>,
	pre: Pre,
	blockquote: ({ children }) => <Blockquote>{children}</Blockquote>,
	// Remote images load on their own; keep them inside the column.
	img: ({ node: _node, alt, ...props }) => (
		<img alt={alt ?? ""} loading="lazy" className="max-w-full" {...props} />
	),
};

const PLUGINS = [remarkGfm];

/**
 * GitHub-flavoured markdown (tables, task lists, strikethrough, autolinks,
 * footnotes, alerts), styled with Tailwind Typography. Memoized: streaming
 * re-renders every message otherwise.
 */
export const Markdown = memo(function Markdown({
	children,
	className,
}: MarkdownProps) {
	/*
	 * Footnote ids (`fn-1`) repeat in every message that has footnotes: prefix
	 * them per message, so a reference jumps to its own note.
	 */
	const id = useId();
	const remarkRehypeOptions = useMemo<Options["remarkRehypeOptions"]>(
		() => ({ clobberPrefix: `${id}-` }),
		[id],
	);
	return (
		<div
			className={cn(
				"prose prose-sm max-w-none dark:prose-invert",
				// Calmer than the plugin's defaults for chat: tight rhythm, quiet code.
				"prose-headings:font-semibold prose-headings:tracking-tight prose-h1:text-xl prose-h2:text-lg prose-h3:text-base",
				"prose-p:leading-relaxed prose-li:my-0.5",
				"prose-code:rounded prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:font-normal prose-code:before:content-none prose-code:after:content-none",
				"prose-a:text-brand-text prose-a:no-underline hover:prose-a:underline",
				"prose-blockquote:border-l-border prose-blockquote:font-normal prose-blockquote:not-italic prose-blockquote:text-muted-foreground",
				// Task lists: the checkbox replaces the bullet.
				"[&_.contains-task-list]:list-none [&_.contains-task-list]:pl-0 [&_.task-list-item]:flex [&_.task-list-item]:items-start [&_.task-list-item]:gap-2 [&_.task-list-item_input]:mt-[0.4em] [&_.task-list-item_input]:accent-brand",
				// Footnotes: a quiet block at the end, the references small and tappable.
				"[&_.footnotes]:mt-6 [&_.footnotes]:border-t [&_.footnotes]:border-border [&_.footnotes]:pt-2 [&_.footnotes]:text-xs [&_.footnotes]:text-muted-foreground [&_sup_a]:px-0.5 [&_sup_a]:font-medium",
				className,
			)}
		>
			<ReactMarkdown
				remarkPlugins={PLUGINS}
				remarkRehypeOptions={remarkRehypeOptions}
				components={COMPONENTS}
			>
				{children}
			</ReactMarkdown>
		</div>
	);
});

/** Fenced code: `<pre><code class="language-ts">`. Anything else stays a plain `pre`. */
function Pre({ children }: { children?: ReactNode }) {
	const code = Array.isArray(children) ? children[0] : children;
	if (!isValidElement<{ className?: string; children?: ReactNode }>(code)) {
		return <pre>{children}</pre>;
	}
	const lang =
		/language-([\w+#-]+)/.exec(code.props.className ?? "")?.[1] ?? "";
	const text = textOf(code.props.children).replace(/\n$/, "");
	return <CodeBlock code={text} lang={lang} />;
}

/**
 * Links in model output leave the app: new tab, no opener. In-page ones
 * (footnotes) scroll the transcript instead of changing the URL's hash.
 */
function Link({
	href,
	children,
	node: _node,
	...props
}: React.ComponentProps<"a"> & { node?: unknown }) {
	if (href?.startsWith("#")) {
		const target = decodeURIComponent(href.slice(1));
		return (
			<a
				{...props}
				href={href}
				onClick={(event) => {
					event.preventDefault();
					document
						.getElementById(target)
						?.scrollIntoView({ behavior: "smooth", block: "center" });
				}}
			>
				{children}
			</a>
		);
	}
	return (
		<a
			{...props}
			href={href}
			title={href}
			target="_blank"
			rel="noopener noreferrer"
		>
			{children}
		</a>
	);
}
