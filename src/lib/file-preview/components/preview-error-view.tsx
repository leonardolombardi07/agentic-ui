import {
	AlertCircle,
	Check,
	ChevronRight,
	Copy,
	Download,
	RotateCw,
} from "lucide-react";
import * as React from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { describePreviewError } from "../lib/errors";

/**
 * Two audiences, one screen: a plain-language explanation with something to do next,
 * and, folded away, the exact error for whoever has to fix it (open by default in development).
 */
export function PreviewErrorView({
	error,
	componentStack,
	typeLabel,
	fileName,
	downloadUrl,
	onRetry,
}: {
	error: unknown;
	componentStack?: string;
	typeLabel: string;
	fileName?: string;
	downloadUrl?: string;
	onRetry?: () => void;
}) {
	const { title, description, retryable } = describePreviewError(
		error,
		typeLabel,
	);
	const [retrying, setRetrying] = React.useState(false);

	return (
		<div
			role="alert"
			className="flex h-full flex-col items-center overflow-auto px-6 py-10 text-center"
		>
			<div className="my-auto flex w-full max-w-md flex-col items-center gap-3">
				<span
					className="flex size-10 items-center justify-center rounded-full bg-destructive-soft text-destructive-foreground"
					aria-hidden="true"
				>
					<AlertCircle className="size-5" />
				</span>
				<div>
					<p className="text-sm font-medium">{title}</p>
					<p className="mt-1 text-xs text-balance text-muted-foreground">
						{description}
					</p>
				</div>
				<div className="flex flex-wrap justify-center gap-2">
					{retryable && onRetry && (
						<Button
							variant="outline"
							size="sm"
							disabled={retrying}
							onClick={() => {
								setRetrying(true);
								onRetry();
							}}
						>
							<RotateCw className={cn(retrying && "animate-spin")} /> Try again
						</Button>
					)}
					{downloadUrl && (
						<a
							href={downloadUrl}
							download={fileName}
							className={buttonVariants({
								variant: retryable ? "ghost" : "outline",
								size: "sm",
							})}
						>
							<Download /> Download
						</a>
					)}
				</div>
				<TechnicalDetails error={error} componentStack={componentStack} />
			</div>
		</div>
	);
}

function TechnicalDetails({
	error,
	componentStack,
}: {
	error: unknown;
	componentStack?: string;
}) {
	const [copied, setCopied] = React.useState(false);
	const report = formatReport(error, componentStack);

	return (
		<details
			open={import.meta.env.DEV}
			className="group mt-3 w-full rounded-md border bg-muted/40 text-left"
		>
			<summary className="flex cursor-pointer list-none items-center gap-1.5 px-3 py-2 text-xs font-medium text-muted-foreground select-none hover:text-foreground [&::-webkit-details-marker]:hidden">
				<ChevronRight
					className="size-3.5 transition-transform group-open:rotate-90"
					aria-hidden="true"
				/>
				Technical details
				<button
					type="button"
					onClick={(e) => {
						e.preventDefault();
						void navigator.clipboard?.writeText(report).then(() => {
							setCopied(true);
							window.setTimeout(() => setCopied(false), 1500);
						});
					}}
					className="ml-auto flex cursor-pointer items-center gap-1 rounded px-1.5 py-0.5 font-normal hover:bg-accent"
				>
					{copied ? <Check className="size-3" /> : <Copy className="size-3" />}{" "}
					{copied ? "Copied" : "Copy"}
				</button>
			</summary>
			<pre className="max-h-64 overflow-auto border-t px-3 py-2 font-mono text-[11px] leading-relaxed whitespace-pre-wrap break-words text-foreground/80">
				{report}
			</pre>
		</details>
	);
}

function formatReport(error: unknown, componentStack?: string) {
	const parts: string[] = [];
	let e: unknown = error;
	for (let depth = 0; e && depth < 4; depth++) {
		if (e instanceof Error) {
			const kind = "kind" in e ? ` [${String(e.kind)}]` : "";
			parts.push(`${depth ? "Caused by: " : ""}${e.name}${kind}: ${e.message}`);
			// Frames only: V8 ("    at fn (url)") and Firefox/Safari ("fn@url") formats.
			const frames = e.stack?.split("\n").filter((l) => /^\s+at |@/.test(l));
			if (frames?.length) parts.push(frames.join("\n"));
			e = e.cause;
		} else {
			parts.push(`${depth ? "Caused by: " : "Thrown: "}${safeString(e)}`);
			break;
		}
	}
	if (componentStack) parts.push(`Component stack:${componentStack}`);
	return parts.join("\n\n");
}

const safeString = (v: unknown) => {
	try {
		return typeof v === "string" ? v : JSON.stringify(v);
	} catch {
		return String(v);
	}
};
