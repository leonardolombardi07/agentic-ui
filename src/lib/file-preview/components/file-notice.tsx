import type { LucideIcon } from "lucide-react";
import { Download } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { formatBytes } from "../lib/format";
import type { PreviewSource } from "../types";

/** A centred "can't show this" card with a download button. Used by the fallback and the size gate. */
export function FileNotice({
	source,
	icon: Icon,
	title,
	description,
}: {
	source: Pick<PreviewSource, "name" | "sizeBytes" | "url">;
	icon: LucideIcon;
	title: string;
	description: string;
}) {
	return (
		<div className="flex h-full flex-col items-center justify-center gap-3 overflow-auto px-6 py-10 text-center">
			<span
				className="flex size-12 items-center justify-center rounded-xl bg-background text-muted-foreground shadow-sm ring-1 ring-border"
				aria-hidden="true"
			>
				<Icon className="size-6" />
			</span>
			<div className="max-w-sm">
				<p className="text-sm font-medium">{title}</p>
				<p className="mt-1 text-xs text-balance text-muted-foreground">
					{description}
				</p>
				<p className="mt-2 truncate text-xs text-muted-foreground">
					{source.name} · {formatBytes(source.sizeBytes)}
				</p>
			</div>
			<a
				href={source.url}
				download={source.name}
				className={buttonVariants({ variant: "outline", size: "sm" })}
			>
				<Download /> Download
			</a>
		</div>
	);
}
