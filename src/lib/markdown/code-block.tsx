import { cn } from "cn";
import { ChevronDownIcon, WrapTextIcon } from "lucide-react";
import { Fragment, useEffect, useState } from "react";
import type { ThemedToken } from "shiki/core";
import { Button } from "@/components/ui/button";
import { highlight, Tokens } from "@/lib/shiki";
import { ActionButton, CopyButton } from "./action-button";

/** Longer blocks start collapsed, so one big file doesn't bury the answer. */
const COLLAPSE_AFTER_LINES = 20;

/** Fence names worth spelling out; the rest show as written (`ts`, `sql`...). */
const LANGUAGE_LABELS: Record<string, string> = {
	js: "JavaScript",
	jsx: "JSX",
	ts: "TypeScript",
	tsx: "TSX",
	py: "Python",
	python: "Python",
	javascript: "JavaScript",
	typescript: "TypeScript",
	sh: "Shell",
	bash: "Bash",
	shell: "Shell",
	sql: "SQL",
	json: "JSON",
	yaml: "YAML",
	yml: "YAML",
	md: "Markdown",
	diff: "Diff",
	html: "HTML",
	css: "CSS",
};

type CodeBlockProps = {
	code: string;
	/** The fence's info string, e.g. "ts". Empty for an unlabelled fence. */
	lang: string;
};

/** A fenced code block: highlighted, with copy, soft wrap and collapse. */
export function CodeBlock({ code, lang }: CodeBlockProps) {
	const [wrap, setWrap] = useState(false);
	const [expanded, setExpanded] = useState(false);
	const highlighted = useHighlighted(code, lang);
	const lineCount = code.split("\n").length;
	const collapsed = !expanded && lineCount > COLLAPSE_AFTER_LINES;

	return (
		<div
			className="not-prose group/code my-3 overflow-hidden rounded-lg border border-border bg-muted/40"
			data-testid="markdown-code-block"
		>
			<div className="flex h-8 items-center gap-1 border-b border-border pr-1.5 pl-3 text-xs text-muted-foreground">
				<span className="mr-auto font-mono">
					{LANGUAGE_LABELS[lang.toLowerCase()] ?? (lang || "Text")}
				</span>
				<ActionButton
					label={wrap ? "Don't wrap lines" : "Wrap lines"}
					aria-pressed={wrap}
					onClick={() => setWrap(!wrap)}
					className={cn(wrap && "bg-accent text-foreground")}
					data-testid="markdown-code-wrap"
				>
					<WrapTextIcon />
				</ActionButton>
				<CopyButton
					text={() => code}
					label="Copy code"
					data-testid="markdown-code-copy"
				/>
			</div>
			<div className="relative">
				<pre
					data-shiki=""
					className={cn(
						"overflow-x-auto px-4 py-3 font-mono text-[12.5px] leading-relaxed text-foreground",
						wrap ? "break-words whitespace-pre-wrap" : "whitespace-pre",
						collapsed && "max-h-[22rem] overflow-y-hidden",
					)}
				>
					<code>{renderCode(code, highlighted)}</code>
				</pre>
				{collapsed ? (
					<div className="absolute inset-x-0 bottom-0 flex justify-center bg-gradient-to-t from-background via-background/80 to-transparent pt-10 pb-2">
						<Button
							variant="secondary"
							size="xs"
							onClick={() => setExpanded(true)}
							data-testid="markdown-code-expand"
						>
							<ChevronDownIcon />
							Show all {lineCount} lines
						</Button>
					</div>
				) : null}
			</div>
		</div>
	);
}

type HighlightResult = { code: string; tokens: ThemedToken[][] };

/**
 * Tokens for `code`, or null until (and unless) its grammar loads. Keeps the
 * last result while a streamed block grows, so `renderCode` can reuse it.
 */
function useHighlighted(code: string, lang: string): HighlightResult | null {
	const [result, setResult] = useState<HighlightResult | null>(null);
	useEffect(() => {
		if (!lang) return;
		let current = true;
		highlight(code, lang)
			.then((highlighted) => {
				if (current && highlighted)
					setResult({ code, tokens: highlighted.tokens });
			})
			// An unknown grammar or a failed chunk load: the block stays plain.
			.catch(() => {});
		return () => {
			current = false;
		};
	}, [code, lang]);
	return result;
}

/**
 * While a reply streams, the text runs ahead of the last highlight. Every line
 * but its last is final, so those keep their colours and only the tail is plain
 * until the next highlight lands: no flicker on each token.
 */
function renderCode(
	code: string,
	highlighted: HighlightResult | null,
): React.ReactNode {
	if (!highlighted || !code.startsWith(highlighted.code)) return code;
	const isCurrent = highlighted.code === code;
	const lines = isCurrent
		? highlighted.tokens
		: highlighted.tokens.slice(0, -1);
	const tail = isCurrent
		? ""
		: code.slice(highlighted.code.lastIndexOf("\n") + 1);
	return (
		<>
			{lines.map((line, index) => (
				// biome-ignore lint/suspicious/noArrayIndexKey: lines have no id and only grow
				<Fragment key={index}>
					<Tokens line={line} />
					{index < lines.length - 1 || tail ? "\n" : null}
				</Fragment>
			))}
			{tail}
		</>
	);
}
