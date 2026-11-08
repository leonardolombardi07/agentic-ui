import { FileImage } from "lucide-react";
import { lazy } from "react";
import { MB } from "../../lib/format";
import type { FileTypeDef } from "../../types";
import { ImageSkeleton } from "./image-skeleton";

export const imageType: FileTypeDef = {
	id: "image",
	label: "Image",
	icon: FileImage,
	extensions: [
		"png",
		"jpg",
		"jpeg",
		"gif",
		"webp",
		"avif",
		"bmp",
		"ico",
		"svg",
	],
	mimeTypes: ["image/"],
	// A 30 MB JPEG decodes to ~150+ MB of pixels: beyond that phones start to struggle.
	maxBytes: 30 * MB,
	Skeleton: ImageSkeleton,
	Preview: lazy(() =>
		import("./image-preview").then((m) => ({ default: m.ImagePreview })),
	),
};
