import { useSuspenseQuery } from "@tanstack/react-query";
import { Code2, Eye, ImageOff } from "lucide-react";
import * as React from "react";
import Markdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { LinesSkeleton } from "../../components/lines-skeleton";
import { ToolbarButton } from "../../components/preview-toolbar";
import styles from "../../components/prose.module.css";
import { decodeText } from "../../lib/fetch-bytes";
import { highlight } from "../../lib/shiki";
import { usePreviewData } from "../../lib/use-preview-data";
import type { PreviewProps } from "../../types";
import { CodeView, Tokens, useCodeDocument } from "../code/code-view";

/**
 * GitHub-flavoured Markdown (tables, task lists, strikethrough, autolinks) with Shiki code blocks.
 * Safety: raw HTML is not rendered (no rehype-raw), unsafe URLs are dropped by react-markdown's
 * default urlTransform, links open in a new tab without a referrer, and remote images only
 * load on request (they can track whoever opens the file).
 */
export function MarkdownPreview({ source, maxBytes }: PreviewProps) {
	const text = usePreviewData(source, {
		key: "text-content",
		maxBytes,
		parse: decodeText,
	});
	const [view, setView] = React.useState<"preview" | "source">("preview");

	const toggle = (
		<div className="flex items-center gap-0.5" role="group" aria-label="View">
			<ToolbarButton
				active={view === "preview"}
				onClick={() => setView("preview")}
			>
				<Eye /> Preview
			</ToolbarButton>
			<ToolbarButton
				active={view === "source"}
				onClick={() => setView("source")}
			>
				<Code2 /> Source
			</ToolbarButton>
		</div>
	);

	if (view === "source") {
		return (
			<React.Suspense fallback={<LinesSkeleton />}>
				<MarkdownSource
					id={source.id}
					text={text}
					name={source.name}
					toolbarStart={toggle}
				/>
			</React.Suspense>
		);
	}

	return (
		<div className="flex h-full flex-col">
			<div className="flex h-9 shrink-0 items-center border-b bg-background px-2 text-xs text-muted-foreground">
				{toggle}
			</div>
			<div className="min-h-0 flex-1 overflow-auto bg-background">
				<article
					className={`${styles.prose} mx-auto max-w-[760px] px-[clamp(1rem,5%,2.5rem)] py-8`}
				>
					<Markdown remarkPlugins={[remarkGfm]} components={COMPONENTS}>
						{text}
					</Markdown>
				</article>
			</div>
		</div>
	);
}

function MarkdownSource({
	id,
	text,
	name,
	toolbarStart,
}: {
	id: string;
	text: string;
	name: string;
	toolbarStart: React.ReactNode;
}) {
	const doc = useCodeDocument(id, text, "markdown");
	return (
		<CodeView
			doc={doc}
			language="Markdown"
			label={`${name} source`}
			toolbarStart={toolbarStart}
		/>
	);
}

const COMPONENTS: Components = {
	pre: ({ children }) => {
		const code = React.Children.toArray(children)[0];
		if (
			!React.isValidElement<{ className?: string; children?: React.ReactNode }>(
				code,
			)
		)
			return <pre>{children}</pre>;
		const lang =
			/language-([\w+#-]+)/.exec(code.props.className ?? "")?.[1] ?? "";
		const text = String(code.props.children ?? "").replace(/\n$/, "");
		// Each block upgrades on its own: the document is readable before any grammar loads.
		return (
			<React.Suspense fallback={<pre>{text}</pre>}>
				<CodeBlock code={text} lang={lang} />
			</React.Suspense>
		);
	},
	a: ({ href, children }) => {
		const internal = href?.startsWith("#");
		return (
			<a
				href={href}
				{...(internal
					? {}
					: { target: "_blank", rel: "noopener noreferrer nofollow" })}
			>
				{children}
			</a>
		);
	},
	img: ({ src, alt }) => (
		<GuardedImage
			src={typeof src === "string" ? src : undefined}
			alt={alt ?? ""}
		/>
	),
};

function CodeBlock({ code, lang }: { code: string; lang: string }) {
	const { data } = useSuspenseQuery({
		queryKey: ["file-preview", "md-block", lang, code],
		queryFn: () => (lang ? highlight(code, lang).catch(() => null) : null),
		staleTime: Infinity,
	});
	if (!data) return <pre>{code}</pre>;
	return (
		<pre data-language={lang} data-shiki="">
			<code>
				{data.tokens.map((line, i) => (
					<React.Fragment key={i}>
						<Tokens line={line} />
						{i < data.tokens.length - 1 && "\n"}
					</React.Fragment>
				))}
			</code>
		</pre>
	);
}

function GuardedImage({ src, alt }: { src?: string; alt: string }) {
	const [allowed, setAllowed] = React.useState(false);
	if (!src) return null;
	const inline = src.startsWith("data:image/");
	if (inline || allowed) {
		return (
			<img src={src} alt={alt} referrerPolicy="no-referrer" loading="lazy" />
		);
	}
	return (
		<span className="my-2 flex items-center gap-2 rounded-md border border-dashed bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
			<ImageOff className="size-4 shrink-0" aria-hidden="true" />
			<span className="min-w-0 flex-1 truncate">
				{alt || "Image"} · <span className="font-mono">{safeHost(src)}</span>
			</span>
			<button
				type="button"
				className="cursor-pointer rounded px-1.5 py-0.5 font-medium text-foreground hover:bg-accent"
				onClick={() => setAllowed(true)}
			>
				Load image
			</button>
		</span>
	);
}

const safeHost = (src: string) => {
	try {
		return new URL(src, window.location.href).host || src;
	} catch {
		return src;
	}
};
