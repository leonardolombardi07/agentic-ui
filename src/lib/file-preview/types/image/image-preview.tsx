import { Expand, Grid2x2, Minus, Plus, RotateCw, Scan } from "lucide-react";
import * as React from "react";
import { cn } from "@/lib/utils";
import {
	PreviewToolbar,
	ToolbarButton,
	ToolbarDivider,
} from "../../components/preview-toolbar";
import { PreviewError } from "../../lib/errors";
import { extensionOf } from "../../lib/format";
import { useObjectUrl } from "../../lib/use-object-url";
import { usePreviewData } from "../../lib/use-preview-data";
import type { PreviewProps } from "../../types";
import { useZoomPan } from "./use-zoom-pan";

type Backdrop = "checker" | "light" | "dark";
const BACKDROPS: Record<Backdrop, string> = {
	checker:
		"bg-[length:16px_16px] bg-[position:0_0,8px_8px] bg-[image:linear-gradient(45deg,#e8e8ea_25%,transparent_25%,transparent_75%,#e8e8ea_75%),linear-gradient(45deg,#e8e8ea_25%,transparent_25%,transparent_75%,#e8e8ea_75%)] bg-white",
	light: "bg-white",
	dark: "bg-[oklch(0.22_0.01_260)]",
};
const NEXT_BACKDROP: Record<Backdrop, Backdrop> = {
	checker: "light",
	light: "dark",
	dark: "checker",
};

/**
 * Zoom (buttons, wheel, pinch, double-click), pan (drag, arrow keys), rotate, fit / 100%,
 * and a backdrop switch for transparent images. SVGs render through <img>, where their
 * scripts and external resources never run.
 */
export function ImagePreview({ source, maxBytes }: PreviewProps) {
	const image = usePreviewData(source, {
		key: "image",
		maxBytes,
		parse: (bytes) => decodeImage(bytes, source.name, source.mimeType),
	});
	const url = useObjectUrl(image.blob);
	const viewport = React.useRef<HTMLDivElement>(null);
	const { scale, fit, transform, actions, viewportProps } = useZoomPan(
		viewport,
		image,
	);
	const [backdrop, setBackdrop] = React.useState<Backdrop>("checker");

	return (
		<div className="flex h-full flex-col">
			<PreviewToolbar>
				<ToolbarButton aria-label="Zoom out" onClick={actions.zoomOut}>
					<Minus />
				</ToolbarButton>
				<span className="w-11 text-center tabular-nums" aria-live="polite">
					{Math.round(scale * 100)}%
				</span>
				<ToolbarButton aria-label="Zoom in" onClick={actions.zoomIn}>
					<Plus />
				</ToolbarButton>
				<ToolbarDivider />
				<ToolbarButton
					active={fit}
					onClick={actions.fit}
					title="Fit to view (0)"
				>
					<Expand /> <span className="hidden @[420px]:inline">Fit</span>
				</ToolbarButton>
				<ToolbarButton
					active={!fit && Math.abs(scale - 1) < 0.01}
					onClick={actions.actualSize}
					title="Actual size (1)"
				>
					<Scan /> <span className="hidden @[420px]:inline">100%</span>
				</ToolbarButton>
				<ToolbarButton
					aria-label="Rotate 90°"
					title="Rotate (R)"
					onClick={actions.rotate}
				>
					<RotateCw />
				</ToolbarButton>
				<ToolbarButton
					aria-label={`Background: ${backdrop}. Change background`}
					title="Change background"
					onClick={() => setBackdrop(NEXT_BACKDROP[backdrop])}
				>
					<Grid2x2 />
				</ToolbarButton>
				<span className="ml-auto hidden truncate pl-2 tabular-nums @[360px]:inline">
					{image.width} × {image.height} px
				</span>
			</PreviewToolbar>

			<div
				ref={viewport}
				tabIndex={0}
				role="img"
				aria-label={`${source.name}, ${image.width} by ${image.height} pixels. Use plus and minus to zoom, arrow keys to pan.`}
				className={cn(
					"relative min-h-0 flex-1 cursor-grab touch-none overflow-hidden select-none active:cursor-grabbing focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none focus-visible:ring-inset",
					BACKDROPS[backdrop],
				)}
				{...viewportProps}
			>
				{url && (
					<img
						src={url}
						alt=""
						draggable={false}
						width={image.width}
						height={image.height}
						className="absolute top-1/2 left-1/2 max-w-none shadow-sm"
						style={{
							transform,
							imageRendering: scale >= 3 ? "pixelated" : "auto",
						}}
					/>
				)}
			</div>
		</div>
	);
}

const MIME_BY_EXT: Record<string, string> = {
	png: "image/png",
	jpg: "image/jpeg",
	jpeg: "image/jpeg",
	gif: "image/gif",
	webp: "image/webp",
	avif: "image/avif",
	bmp: "image/bmp",
	ico: "image/x-icon",
	svg: "image/svg+xml",
};

/** Decodes once up front, so an unsupported or broken image fails into the error boundary, with its size known. */
async function decodeImage(bytes: Uint8Array, name: string, mimeType?: string) {
	const type =
		MIME_BY_EXT[extensionOf(name)] ??
		(mimeType?.startsWith("image/") ? mimeType : "application/octet-stream");
	const blob = new Blob([bytes as BlobPart], { type });
	const url = URL.createObjectURL(blob);
	try {
		const img = new Image();
		img.src = url;
		await img.decode();
		// SVGs without width/height report 0: fall back to a sensible canvas.
		return {
			blob,
			width: img.naturalWidth || 800,
			height: img.naturalHeight || 600,
		};
	} catch (e) {
		throw new PreviewError(
			"unsupported",
			`Your browser can't display ${extensionOf(name).toUpperCase() || "this"} images. Download the file to open it.`,
			{ cause: e },
		);
	} finally {
		URL.revokeObjectURL(url);
	}
}
