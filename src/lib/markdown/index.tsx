import { cn } from "cn";
import { memo } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

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
	// Links in model output and files leave the app: new tab, no opener.
	a: ({ node: _node, ...props }) => (
		<a {...props} target="_blank" rel="noopener noreferrer" />
	),
	// Wide tables scroll inside the message instead of widening the transcript.
	table: ({ node: _node, ...props }) => (
		<div className="overflow-x-auto">
			<table {...props} />
		</div>
	),
	// Remote images load on their own; keep them inside the column.
	img: ({ node: _node, alt, ...props }) => (
		<img alt={alt ?? ""} loading="lazy" className="max-w-full" {...props} />
	),
};

const PLUGINS = [remarkGfm];

/**
 * GitHub-flavoured markdown (tables, task lists, strikethrough, autolinks), styled
 * with Tailwind Typography. Memoized: streaming re-renders every message otherwise.
 */
export const Markdown = memo(function Markdown({
	children,
	className,
}: MarkdownProps) {
	return (
		<div
			className={cn(
				"prose prose-sm max-w-none dark:prose-invert",
				// Calmer than the plugin's defaults for chat: tight rhythm, quiet code.
				"prose-headings:font-semibold prose-headings:tracking-tight prose-h1:text-xl prose-h2:text-lg prose-h3:text-base",
				"prose-p:leading-relaxed prose-li:my-0.5 prose-pre:rounded-lg prose-pre:border prose-pre:border-border prose-pre:bg-muted prose-pre:text-foreground",
				"prose-code:rounded prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:font-normal prose-code:before:content-none prose-code:after:content-none",
				"[&_pre_code]:bg-transparent [&_pre_code]:p-0",
				"prose-table:my-3 prose-th:border prose-th:border-border prose-th:px-2 prose-th:py-1 prose-td:border prose-td:border-border prose-td:px-2 prose-td:py-1",
				"prose-a:text-brand prose-a:no-underline hover:prose-a:underline",
				className,
			)}
		>
			<ReactMarkdown remarkPlugins={PLUGINS} components={COMPONENTS}>
				{children}
			</ReactMarkdown>
		</div>
	);
});
