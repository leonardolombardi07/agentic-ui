import type { LucideIcon } from "lucide-react";
import type { ComponentType } from "react";

/** Everything a previewer needs to know about a file. Nothing chat-specific. */
export type PreviewSource = {
	/** Stable id: caches parsed content, so the same id must always mean the same bytes. */
	id: string;
	name: string;
	mimeType?: string;
	/** Declared size, checked against the limit before anything is downloaded. */
	sizeBytes: number;
	/** Where the bytes live: a same-origin path, a signed URL or a `blob:` URL. */
	url: string;
};

/** The minimum needed to pick a file type (an icon in a list has no URL yet). */
export type FileTypeInput = Pick<PreviewSource, "name" | "mimeType">;

export type FileTypeId =
	| "markdown"
	| "code"
	| "image"
	| "pdf"
	| "spreadsheet"
	| "docx"
	| "text"
	| "unknown";

/**
 * Where to land inside a file when it opens (a citation's page or cell). Types that can't honour a
 * field ignore it; the file simply opens at the top.
 */
export type PreviewTarget = {
	/** PDF: 1-based page. */
	page?: number;
	/** Spreadsheet: sheet name. */
	sheet?: string;
	/** Spreadsheet: A1-style cell, e.g. "E5". */
	cell?: string;
};

export type PreviewProps = {
	source: PreviewSource;
	/** Where to land when it opens. Applied once, on mount: remount to apply a new one. */
	target?: PreviewTarget;
	/** The type's size limit, re-checked against the real download. */
	maxBytes: number;
};

/**
 * One entry per file category. A type is self-contained: it owns its matching rules,
 * its size limit, its loading skeleton and its (lazy-loaded) preview component.
 */
export type FileTypeDef = {
	id: FileTypeId;
	/** Human label, e.g. "Spreadsheet". */
	label: string;
	icon: LucideIcon;
	/** Lower-case, without the dot. */
	extensions?: readonly string[];
	/** Exact MIME types, or prefixes ending in `/` (e.g. "image/"). */
	mimeTypes?: readonly string[];
	/** Exact file names, lower-case (e.g. "dockerfile"). */
	fileNames?: readonly string[];
	/** Files above this are not downloaded. `Infinity` for the fallback. */
	maxBytes: number;
	Skeleton: ComponentType;
	Preview: ComponentType<PreviewProps>;
};
