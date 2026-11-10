import { useSuspenseQuery } from "@tanstack/react-query";
import { WrapText } from "lucide-react";
import * as React from "react";
import { Tokens } from "@/lib/shiki";
import {
	CopyButton,
	PreviewToolbar,
	ToolbarButton,
} from "../../components/preview-toolbar";
import { splitLines, VirtualLines } from "../../components/virtual-lines";
import { KB } from "../../lib/format";
import { type Highlighted, highlight } from "../../lib/shiki";

/** Above these, tokenizing would block the page for seconds: show plain text instead. */
const HIGHLIGHT_MAX_CHARS = 512 * KB;
const HIGHLIGHT_MAX_LINES = 20_000;

export type CodeDocument = {
	text: string;
	lines: string[];
	longest: number;
	highlighted: Highlighted | null;
	/** Why highlighting is off, when it is. */
	plainReason?: "large" | "language";
};

async function buildCodeDocument(
	raw: string,
	lang: string,
): Promise<CodeDocument> {
	const text = raw.replace(/\r\n?/g, "\n");
	const { lines, longest } = splitLines(text);
	if (text.length > HIGHLIGHT_MAX_CHARS || lines.length > HIGHLIGHT_MAX_LINES)
		return { text, lines, longest, highlighted: null, plainReason: "large" };
	const highlighted = await highlight(text, lang).catch(() => null); // highlighting is a nicety, never a failure
	return {
		text,
		lines,
		longest,
		highlighted,
		plainReason: highlighted ? undefined : "language",
	};
}

/** Suspends while the grammar loads and the text is tokenized. Cached per `cacheKey` + language. */
export function useCodeDocument(cacheKey: string, text: string, lang: string) {
	return useSuspenseQuery({
		queryKey: ["file-preview", "code-tokens", cacheKey, lang],
		queryFn: () => buildCodeDocument(text, lang),
		staleTime: Infinity,
		gcTime: 2 * 60_000,
	}).data;
}

/** Toolbar (language, lines, wrap, copy) over virtualized, highlighted lines. */
export function CodeView({
	doc,
	language,
	label,
	toolbarStart,
}: {
	doc: CodeDocument;
	language: string;
	label: string;
	toolbarStart?: React.ReactNode;
}) {
	const [wrap, setWrap] = React.useState(false);
	const { highlighted } = doc;
	const count = highlighted ? highlighted.tokens.length : doc.lines.length;

	return (
		<div className="flex h-full flex-col bg-background" data-shiki="">
			<PreviewToolbar>
				{toolbarStart}
				<span className="truncate px-1">
					<span className="font-medium text-foreground">{language}</span> ·{" "}
					<span className="tabular-nums">{count.toLocaleString()} lines</span>
					{doc.plainReason === "large" && (
						<span> · highlighting off for large files</span>
					)}
				</span>
				<span className="flex-1" />
				<ToolbarButton active={wrap} onClick={() => setWrap(!wrap)}>
					<WrapText /> <span className="hidden @[420px]:inline">Wrap</span>
				</ToolbarButton>
				<CopyButton text={() => doc.text} />
			</PreviewToolbar>
			<div className="min-h-0 flex-1">
				<VirtualLines
					label={label}
					count={count}
					longestLine={doc.longest}
					wrap={wrap}
					renderLine={(i) =>
						highlighted ? <Tokens line={highlighted.tokens[i]} /> : doc.lines[i]
					}
				/>
			</div>
		</div>
	);
}
