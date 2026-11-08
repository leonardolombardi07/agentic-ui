import { Info } from "lucide-react";
import styles from "../../components/prose.module.css";
import { usePreviewData } from "../../lib/use-preview-data";
import type { PreviewProps } from "../../types";
import { convertDocx } from "./convert-docx";

export function DocxPreview({ source, maxBytes }: PreviewProps) {
	const doc = usePreviewData(source, {
		key: "docx",
		maxBytes,
		parse: convertDocx,
	});

	return (
		<div className="flex h-full flex-col">
			<div className="flex shrink-0 items-center gap-1.5 border-b bg-background px-3 py-1.5 text-xs text-muted-foreground">
				<Info className="size-3.5 shrink-0" aria-hidden="true" />
				<span
					className="min-w-0 truncate"
					title={doc.warnings.join("\n") || undefined}
				>
					Simplified preview: page layout, fonts and colours may differ from
					Word.
				</span>
			</div>
			<div className="min-h-0 flex-1 overflow-auto bg-muted/60 p-[clamp(0.5rem,3%,1.5rem)]">
				<article
					className={`${styles.prose} paper mx-auto min-h-full max-w-[816px] rounded-sm bg-white px-[clamp(1.25rem,8%,72px)] py-[clamp(1.5rem,8%,72px)] shadow-sm ring-1 ring-black/5`}
					// biome-ignore lint/security/noDangerouslySetInnerHtml: sanitized in convertDocx (DOMPurify, strict allow-list).
					dangerouslySetInnerHTML={{ __html: doc.html }}
				/>
			</div>
		</div>
	);
}
