import { useQuery } from "@tanstack/react-query";
import {
	DownloadIcon,
	FileCodeIcon,
	FileIcon,
	FileImageIcon,
	FileSpreadsheetIcon,
	FileTextIcon,
	type LucideIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { buttonVariants } from "@/components/ui/button";
import {
	fileDownloadUrl,
	fileUrl,
	type SessionFile,
} from "@/lib/api/types/file";
import { Markdown } from "@/lib/markdown";

/*
 * Previews for session files, by type. No session or workspace knowledge, so the
 * Files pane and (later) a file tab can both use it.
 */

type PreviewKind =
	| "image"
	| "pdf"
	| "markdown"
	| "csv"
	| "code"
	| "text"
	| "none";

const CODE_TYPES = new Set([
	"application/json",
	"text/typescript",
	"text/javascript",
	"text/x-python",
	"text/x-sql",
	"text/yaml",
	"text/html",
	"text/css",
]);

/** Text bigger than this isn't fetched for a preview; it can still be downloaded. */
const MAX_TEXT_PREVIEW_BYTES = 2 * 1024 * 1024;

export function previewKind(file: SessionFile): PreviewKind {
	const type = file.mediaType;
	if (type.startsWith("image/")) return "image";
	if (type === "application/pdf") return "pdf";
	if (file.size > MAX_TEXT_PREVIEW_BYTES) return "none";
	if (type === "text/markdown") return "markdown";
	if (type === "text/csv") return "csv";
	if (CODE_TYPES.has(type)) return "code";
	if (type.startsWith("text/")) return "text";
	return "none";
}

const ICONS: Record<PreviewKind, LucideIcon> = {
	image: FileImageIcon,
	pdf: FileTextIcon,
	markdown: FileTextIcon,
	csv: FileSpreadsheetIcon,
	code: FileCodeIcon,
	text: FileTextIcon,
	none: FileIcon,
};

export function fileIcon(file: SessionFile): LucideIcon {
	return ICONS[previewKind(file)];
}

export function formatBytes(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** The file's content, as well as its type allows. Fills its container. */
export function FilePreview({ file }: { file: SessionFile }) {
	const kind = previewKind(file);
	switch (kind) {
		case "image":
			return <ImagePreview file={file} />;
		case "pdf":
			return (
				<iframe
					src={fileUrl(file.id)}
					title={file.name}
					className="h-full min-h-96 w-full border-0"
					data-testid="file-preview-pdf"
				/>
			);
		case "none":
			return <NoPreview file={file} />;
		default:
			return <TextPreview file={file} kind={kind} />;
	}
}

/*
 * Fetched and shown from a blob URL rather than `<img src="/api/files/...">`: Vite's
 * dev server answers image requests itself (by `Sec-Fetch-Dest`) and 404s before
 * they reach the route. A blob URL behaves the same in dev and production.
 */
function ImagePreview({ file }: { file: SessionFile }) {
	const { data: blob, error } = useQuery({
		queryKey: ["files", file.id, "blob"],
		queryFn: async () => {
			const response = await fetch(fileUrl(file.id));
			if (!response.ok) throw new Error(`Couldn't load ${file.name}.`);
			return response.blob();
		},
		staleTime: Number.POSITIVE_INFINITY,
	});
	const [url, setUrl] = useState<string | null>(null);
	useEffect(() => {
		if (!blob) return;
		const next = URL.createObjectURL(blob);
		setUrl(next);
		return () => URL.revokeObjectURL(next);
	}, [blob]);

	if (error)
		return (
			<p className="p-4 text-sm text-destructive-foreground">{error.message}</p>
		);
	return (
		<div className="flex min-h-full items-center justify-center bg-muted/40 p-4">
			{url ? (
				<img
					src={url}
					alt={file.name}
					className="max-h-full max-w-full rounded-md object-contain shadow-sm"
					data-testid="file-preview-image"
				/>
			) : (
				<p className="text-sm text-muted-foreground">Loading...</p>
			)}
		</div>
	);
}

function TextPreview({
	file,
	kind,
}: {
	file: SessionFile;
	kind: "markdown" | "csv" | "code" | "text";
}) {
	const { data, error, isPending } = useQuery({
		queryKey: ["files", file.id, "text"],
		queryFn: async () => {
			const response = await fetch(fileUrl(file.id));
			if (!response.ok) throw new Error(`Couldn't load ${file.name}.`);
			return response.text();
		},
		// A file's bytes never change: its id is new on every upload.
		staleTime: Number.POSITIVE_INFINITY,
	});

	if (isPending)
		return <p className="p-4 text-sm text-muted-foreground">Loading...</p>;
	if (error)
		return (
			<p className="p-4 text-sm text-destructive-foreground">{error.message}</p>
		);

	if (kind === "markdown")
		return (
			<div className="p-4" data-testid="file-preview-markdown">
				<Markdown>{data}</Markdown>
			</div>
		);
	if (kind === "csv") return <CsvTable text={data} />;
	return <Lines text={data} />;
}

/** Plain text and code, with line numbers. No highlighting yet. */
function Lines({ text }: { text: string }) {
	const lines = text.replace(/\n$/, "").split("\n");
	return (
		<pre
			className="min-w-fit p-3 font-mono text-xs leading-5"
			data-testid="file-preview-text"
		>
			{lines.map((line, index) => (
				// biome-ignore lint/suspicious/noArrayIndexKey: lines have no identity beyond their position
				<div key={index} className="flex">
					<span
						aria-hidden
						className="w-10 shrink-0 pr-3 text-right text-muted-foreground select-none"
					>
						{index + 1}
					</span>
					<code className="whitespace-pre">{line || " "}</code>
				</div>
			))}
		</pre>
	);
}

function CsvTable({ text }: { text: string }) {
	const [header = [], ...rows] = parseCsv(text);
	return (
		<div className="p-3" data-testid="file-preview-csv">
			<table className="w-full border-collapse text-xs">
				<thead>
					<tr>
						{header.map((cell, i) => (
							<th
								// biome-ignore lint/suspicious/noArrayIndexKey: columns are positional
								key={i}
								className="border border-border bg-muted px-2 py-1 text-left font-medium"
							>
								{cell}
							</th>
						))}
					</tr>
				</thead>
				<tbody>
					{rows.map((row, r) => (
						// biome-ignore lint/suspicious/noArrayIndexKey: rows are positional
						<tr key={r}>
							{row.map((cell, c) => (
								<td
									// biome-ignore lint/suspicious/noArrayIndexKey: columns are positional
									key={c}
									className="border border-border px-2 py-1 tabular-nums"
								>
									{cell}
								</td>
							))}
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}

/** RFC 4180 enough for previews: quoted fields, escaped quotes, CRLF. */
function parseCsv(text: string): string[][] {
	const rows: string[][] = [];
	let row: string[] = [];
	let field = "";
	let quoted = false;
	for (let i = 0; i < text.length; i++) {
		const char = text[i];
		if (quoted) {
			if (char === '"' && text[i + 1] === '"') {
				field += '"';
				i++;
			} else if (char === '"') quoted = false;
			else field += char;
		} else if (char === '"') quoted = true;
		else if (char === ",") {
			row.push(field);
			field = "";
		} else if (char === "\n" || char === "\r") {
			if (char === "\r" && text[i + 1] === "\n") i++;
			row.push(field);
			rows.push(row);
			row = [];
			field = "";
		} else field += char;
	}
	if (field || row.length > 0) {
		row.push(field);
		rows.push(row);
	}
	return rows;
}

function NoPreview({ file }: { file: SessionFile }) {
	const Icon = fileIcon(file);
	return (
		<div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
			<Icon aria-hidden className="size-8 text-muted-foreground" />
			<p className="text-sm">No preview for this file type.</p>
			<a
				href={fileDownloadUrl(file.id)}
				className={buttonVariants({ variant: "secondary", size: "sm" })}
			>
				<DownloadIcon />
				Download
			</a>
		</div>
	);
}
