import { WrapText } from "lucide-react";
import * as React from "react";
import {
	CopyButton,
	PreviewToolbar,
	ToolbarButton,
} from "../../components/preview-toolbar";
import { splitLines, VirtualLines } from "../../components/virtual-lines";
import { decodeText } from "../../lib/fetch-bytes";
import { usePreviewData } from "../../lib/use-preview-data";
import type { PreviewProps } from "../../types";

/** Plain text and logs: no highlighting (it would cost more than it helps), virtualized so size barely matters. */
export function TextPreview({ source, maxBytes }: PreviewProps) {
	const doc = usePreviewData(source, {
		key: "text",
		maxBytes,
		parse: (bytes) => {
			const text = decodeText(bytes);
			return { text, ...splitLines(text) };
		},
	});
	const [wrap, setWrap] = React.useState(false);

	return (
		<div className="flex h-full flex-col bg-background">
			<PreviewToolbar>
				<span className="px-1 tabular-nums">
					{doc.lines.length.toLocaleString()} lines
				</span>
				<span className="flex-1" />
				<ToolbarButton active={wrap} onClick={() => setWrap(!wrap)}>
					<WrapText /> Wrap
				</ToolbarButton>
				<CopyButton text={() => doc.text} />
			</PreviewToolbar>
			<div className="min-h-0 flex-1">
				<VirtualLines
					label={`${source.name} contents`}
					count={doc.lines.length}
					longestLine={doc.longest}
					wrap={wrap}
					renderLine={(i) => doc.lines[i]}
				/>
			</div>
		</div>
	);
}
