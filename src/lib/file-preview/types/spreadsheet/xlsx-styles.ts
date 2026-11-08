/**
 * Reads cell formatting straight from an .xlsx's XML parts.
 *
 * SheetJS Community Edition parses values, number formats and merges, but of the formatting
 * it only exposes fills. Fonts, borders, alignment, theme colours with tints, frozen panes,
 * gridlines and tab colours come from here. The result is a flat, precomputed list of
 * CSS-ready styles indexed like `cellXfs`, so rendering a cell is a lookup.
 */

export type BorderEdge = {
	width: number;
	style: "solid" | "dashed" | "dotted" | "double";
	color: string;
};
export type HAlign = "left" | "center" | "right" | "justify";
export type CellStyle = {
	fontFamily: string;
	/** Points. */
	fontSize: number;
	bold: boolean;
	italic: boolean;
	underline: boolean;
	strike: boolean;
	color?: string;
	vertAlign?: "super" | "sub";
	fill?: string;
	border: {
		left?: BorderEdge;
		right?: BorderEdge;
		top?: BorderEdge;
		bottom?: BorderEdge;
	};
	/** undefined = Excel's "General": numbers right, text left, booleans/errors centred. */
	h?: HAlign;
	v: "top" | "center" | "bottom";
	wrap: boolean;
	indent: number;
};

type ColorCtx = { theme: string[]; indexed: string[] };

/* ----------------------------------------------------------------- colours */

// Excel's legacy 64-colour palette (indexes 0–63), then system foreground/background.
const DEFAULT_INDEXED = (
	"000000 FFFFFF FF0000 00FF00 0000FF FFFF00 FF00FF 00FFFF 000000 FFFFFF FF0000 00FF00 0000FF FFFF00 FF00FF 00FFFF " +
	"800000 008000 000080 808000 800080 008080 C0C0C0 808080 9999FF 993366 FFFFCC CCFFFF 660066 FF8080 0066CC CCCCFF " +
	"000080 FF00FF FFFF00 00FFFF 800080 800000 008080 0000FF 00CCFF CCFFFF CCFFCC FFFF99 99CCFF FF99CC CC99FF FFCC99 " +
	"3366FF 33CCCC 99CC00 FFCC00 FF9900 FF6600 666699 969696 003366 339966 003300 333300 993300 993366 333399 333333 000000 FFFFFF"
).split(" ");

// Office 2013+ default theme, used when a file has no theme part.
const DEFAULT_THEME = [
	"FFFFFF",
	"000000",
	"E7E6E6",
	"44546A",
	"4472C4",
	"ED7D31",
	"A5A5A5",
	"FFC000",
	"5B9BD5",
	"70AD47",
	"0563C1",
	"954F72",
];

function resolveColor(
	el: Element | null | undefined,
	ctx: ColorCtx,
): string | undefined {
	if (!el || el.getAttribute("auto") === "1") return undefined;
	let hex: string | undefined;
	const rgb = el.getAttribute("rgb");
	const theme = el.getAttribute("theme");
	const indexed = el.getAttribute("indexed");
	if (rgb)
		hex = rgb.length === 8 ? rgb.slice(2) : rgb; // ARGB → RGB (Excel ignores alpha here)
	else if (theme != null) hex = ctx.theme[+theme];
	else if (indexed != null) hex = ctx.indexed[+indexed];
	if (!hex || !/^[0-9a-f]{6}$/i.test(hex)) return undefined;
	const tint = Number(el.getAttribute("tint") ?? 0);
	return `#${tint ? applyTint(hex, tint) : hex}`.toLowerCase();
}

/** ECMA-376 §18.8.19: tint lightens/darkens the HSL luminance. */
function applyTint(hex: string, tint: number) {
	const [r, g, b] = [0, 2, 4].map(
		(i) => parseInt(hex.slice(i, i + 2), 16) / 255,
	);
	const max = Math.max(r, g, b);
	const min = Math.min(r, g, b);
	let h = 0;
	let s = 0;
	let l = (max + min) / 2;
	if (max !== min) {
		const d = max - min;
		s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
		h =
			max === r
				? (g - b) / d + (g < b ? 6 : 0)
				: max === g
					? (b - r) / d + 2
					: (r - g) / d + 4;
		h /= 6;
	}
	l = tint < 0 ? l * (1 + tint) : l * (1 - tint) + tint;
	const hue = (p: number, q: number, t: number) => {
		t = (t + 1) % 1;
		if (t < 1 / 6) return p + (q - p) * 6 * t;
		if (t < 1 / 2) return q;
		if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
		return p;
	};
	let out: number[];
	if (s === 0) out = [l, l, l];
	else {
		const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
		const p = 2 * l - q;
		out = [hue(p, q, h + 1 / 3), hue(p, q, h), hue(p, q, h - 1 / 3)];
	}
	return out
		.map((c) =>
			Math.round(Math.min(1, Math.max(0, c)) * 255)
				.toString(16)
				.padStart(2, "0"),
		)
		.join("");
}

/* ------------------------------------------------------------------- theme */

export function parseTheme(xml: string | undefined): string[] {
	if (!xml) return DEFAULT_THEME;
	const doc = parseXml(xml);
	const scheme = first(doc, "clrScheme");
	if (!scheme) return DEFAULT_THEME;
	const color = (name: string) => {
		const el = first(scheme, name);
		const c =
			el &&
			(first(el, "srgbClr")?.getAttribute("val") ??
				first(el, "sysClr")?.getAttribute("lastClr"));
		return c ?? undefined;
	};
	const xmlOrder = [
		"dk1",
		"lt1",
		"dk2",
		"lt2",
		"accent1",
		"accent2",
		"accent3",
		"accent4",
		"accent5",
		"accent6",
		"hlink",
		"folHlink",
	].map(color);
	// Cell colours index the theme as lt1, dk1, lt2, dk2, … (the first two pairs swapped).
	const [dk1, lt1, dk2, lt2, ...rest] = xmlOrder;
	return [lt1, dk1, lt2, dk2, ...rest].map((c, i) => c ?? DEFAULT_THEME[i]);
}

/* ------------------------------------------------------------------ styles */

const BORDER: Record<string, Omit<BorderEdge, "color">> = {
	hair: { width: 1, style: "dotted" },
	thin: { width: 1, style: "solid" },
	dotted: { width: 1, style: "dotted" },
	dashed: { width: 1, style: "dashed" },
	dashDot: { width: 1, style: "dashed" },
	dashDotDot: { width: 1, style: "dotted" },
	medium: { width: 2, style: "solid" },
	mediumDashed: { width: 2, style: "dashed" },
	mediumDashDot: { width: 2, style: "dashed" },
	mediumDashDotDot: { width: 2, style: "dashed" },
	slantDashDot: { width: 2, style: "dashed" },
	thick: { width: 3, style: "solid" },
	double: { width: 3, style: "double" },
};

export function cssFontFamily(name: string | undefined) {
	const n = name ?? "Calibri";
	const generic = /mono|courier|consolas|menlo/i.test(n)
		? "monospace"
		: /times|georgia|cambria|garamond|serif/i.test(n) && !/sans/i.test(n)
			? "serif"
			: "sans-serif";
	// Metric-compatible open fonts first, so column widths line up even without Office installed.
	const twins: Record<string, string> = {
		calibri: "Carlito",
		cambria: "Caladea",
		arial: "Liberation Sans",
		"times new roman": "Liberation Serif",
		"courier new": "Liberation Mono",
	};
	const twin = twins[n.toLowerCase()];
	return [`"${n}"`, twin && `"${twin}"`, generic].filter(Boolean).join(", ");
}

export type ParsedStyles = { styles: CellStyle[]; defaultStyle: CellStyle };

export function parseStyles(
	xml: string | undefined,
	themeXml: string | undefined,
): ParsedStyles {
	const fallback: CellStyle = {
		fontFamily: cssFontFamily("Calibri"),
		fontSize: 11,
		bold: false,
		italic: false,
		underline: false,
		strike: false,
		border: {},
		v: "bottom",
		wrap: false,
		indent: 0,
	};
	if (!xml) return { styles: [], defaultStyle: fallback };

	const doc = parseXml(xml);
	const customIndexed = all(first(doc, "indexedColors"), "rgbColor").map((el) =>
		(el.getAttribute("rgb") ?? "").slice(-6),
	);
	const ctx: ColorCtx = {
		theme: parseTheme(themeXml),
		indexed: customIndexed.length ? customIndexed : DEFAULT_INDEXED,
	};

	const fonts = all(first(doc, "fonts"), "font").map((f) => {
		const val = (tag: string) => first(f, tag)?.getAttribute("val");
		const flag = (tag: string) => {
			const el = first(f, tag);
			return (
				!!el &&
				el.getAttribute("val") !== "0" &&
				el.getAttribute("val") !== "false"
			);
		};
		const underline = first(f, "u");
		const va = val("vertAlign");
		return {
			fontFamily: cssFontFamily(val("name") ?? undefined),
			fontSize: Number(val("sz") ?? 11),
			bold: flag("b"),
			italic: flag("i"),
			strike: flag("strike"),
			underline: !!underline && underline.getAttribute("val") !== "none",
			color: resolveColor(first(f, "color"), ctx),
			vertAlign:
				va === "superscript"
					? ("super" as const)
					: va === "subscript"
						? ("sub" as const)
						: undefined,
		};
	});

	const fills = all(first(doc, "fills"), "fill").map((f) => {
		const pattern = first(f, "patternFill");
		if (pattern) {
			const type = pattern.getAttribute("patternType");
			if (!type || type === "none") return undefined;
			// Solid uses fgColor; other patterns are approximated by their foreground colour.
			return (
				resolveColor(first(pattern, "fgColor"), ctx) ??
				resolveColor(first(pattern, "bgColor"), ctx)
			);
		}
		const stop = first(f, "stop"); // gradientFill: first stop
		return stop ? resolveColor(first(stop, "color"), ctx) : undefined;
	});

	const borders = all(first(doc, "borders"), "border").map((b) => {
		const edge = (tag: string): BorderEdge | undefined => {
			const el = first(b, tag);
			const kind = el?.getAttribute("style");
			if (!el || !kind || kind === "none" || !BORDER[kind]) return undefined;
			return {
				...BORDER[kind],
				color: resolveColor(first(el, "color"), ctx) ?? "#000000",
			};
		};
		return {
			left: edge("left") ?? edge("start"),
			right: edge("right") ?? edge("end"),
			top: edge("top"),
			bottom: edge("bottom"),
		};
	});

	const H: Record<string, HAlign | undefined> = {
		left: "left",
		center: "center",
		centerContinuous: "center",
		right: "right",
		justify: "justify",
		distributed: "justify",
		fill: "left",
	};
	const V: Record<string, CellStyle["v"]> = {
		top: "top",
		center: "center",
		bottom: "bottom",
		justify: "top",
		distributed: "center",
	};

	const styles = all(first(doc, "cellXfs"), "xf").map((xf): CellStyle => {
		const font = fonts[Number(xf.getAttribute("fontId") ?? 0)] ?? fonts[0];
		const align = first(xf, "alignment");
		return {
			...fallback,
			...font,
			fill: fills[Number(xf.getAttribute("fillId") ?? 0)],
			border: borders[Number(xf.getAttribute("borderId") ?? 0)] ?? {},
			h: H[align?.getAttribute("horizontal") ?? ""],
			v: V[align?.getAttribute("vertical") ?? ""] ?? "bottom",
			wrap:
				align?.getAttribute("wrapText") === "1" ||
				align?.getAttribute("wrapText") === "true",
			indent: Number(align?.getAttribute("indent") ?? 0),
		};
	});

	return { styles, defaultStyle: styles[0] ?? { ...fallback, ...fonts[0] } };
}

/* --------------------------------------------------------------- sheet XML */

export type SheetXmlInfo = {
	/** Style index per cell, keyed `row * COL_STRIDE + col`. */
	cellStyles: Map<number, number>;
	rowHeights: Map<number, { px: number; hidden: boolean }>;
	cols: { min: number; max: number; px: number; hidden: boolean }[];
	defaultColPx?: number;
	defaultRowPx?: number;
	frozen: { rows: number; cols: number };
	showGridLines: boolean;
	zoom: number;
	tabColor?: string;
};

export const COL_STRIDE = 16_384; // Excel's maximum column count

const attr = (attrs: string, name: string) =>
	new RegExp(`(?:^|\\s)${name}="([^"]*)"`).exec(attrs)?.[1];
const colIndex = (letters: string) =>
	[...letters].reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0) - 1;
/** Excel's column width (in characters of the default font) to pixels, with a 7px max digit width. */
const charsToPx = (w: number) =>
	Math.trunc(((256 * w + Math.trunc(128 / 7)) / 256) * 7);
const ptToPx = (pt: number) => (pt * 96) / 72;

/**
 * Scans a worksheet's XML for what SheetJS CE doesn't give us. Regex, not DOMParser: a sheet can
 * be tens of MB of XML and we only need attributes from a few tags.
 */
export function scanSheetXml(
	xml: string,
	maxRows: number,
	themeXml: string | undefined,
): SheetXmlInfo {
	const dataStart = xml.indexOf("<sheetData");
	const head = dataStart >= 0 ? xml.slice(0, dataStart) : xml;

	const cellStyles = new Map<number, number>();
	const rowHeights = new Map<number, { px: number; hidden: boolean }>();
	const tagRe = /<(row|c)\s([^>]*)>/g;
	tagRe.lastIndex = Math.max(0, dataStart);
	let currentRow = -1;
	for (let m: RegExpExecArray | null; (m = tagRe.exec(xml)); ) {
		const attrs = m[2];
		if (m[1] === "row") {
			const r = Number(attr(attrs, "r")) - 1;
			currentRow = Number.isFinite(r) ? r : currentRow + 1;
			if (currentRow >= maxRows) break;
			const ht = attr(attrs, "ht");
			const hidden =
				attr(attrs, "hidden") === "1" || attr(attrs, "hidden") === "true";
			if ((ht && attr(attrs, "customHeight") !== "0") || hidden)
				rowHeights.set(currentRow, { px: ht ? ptToPx(Number(ht)) : 0, hidden });
			continue;
		}
		const s = attr(attrs, "s");
		const ref = attr(attrs, "r");
		if (!s || s === "0" || !ref) continue;
		const mm = /^([A-Z]+)(\d+)$/.exec(ref);
		if (!mm) continue;
		cellStyles.set(
			(Number(mm[2]) - 1) * COL_STRIDE + colIndex(mm[1]),
			Number(s),
		);
	}

	const cols: SheetXmlInfo["cols"] = [];
	for (const m of head.matchAll(/<col\s([^>]*)>/g)) {
		const width = Number(attr(m[1], "width"));
		cols.push({
			min: Number(attr(m[1], "min")) - 1,
			max: Number(attr(m[1], "max")) - 1,
			px: Number.isFinite(width) ? charsToPx(width) : 64,
			hidden: attr(m[1], "hidden") === "1" || attr(m[1], "hidden") === "true",
		});
	}

	const fmt = /<sheetFormatPr\s([^>]*)>/.exec(head)?.[1] ?? "";
	const defaultColWidth = Number(attr(fmt, "defaultColWidth"));
	const defaultRowHeight = Number(attr(fmt, "defaultRowHeight"));

	const view = /<sheetView\s([^>]*)>/.exec(head)?.[1] ?? "";
	const pane = /<pane\s([^>]*)>/.exec(head)?.[1] ?? "";
	const frozen = /state="frozen/.test(pane);

	const tab = /<tabColor\s([^>]*)>/.exec(head)?.[1];
	let tabColor: string | undefined;
	if (tab) {
		const el = parseXml(`<c ${tab.replace(/\/$/, "")}/>`).documentElement;
		tabColor = resolveColor(el, {
			theme: parseTheme(themeXml),
			indexed: DEFAULT_INDEXED,
		});
	}

	return {
		cellStyles,
		rowHeights,
		cols,
		defaultColPx: defaultColWidth ? charsToPx(defaultColWidth) : undefined,
		defaultRowPx: defaultRowHeight ? ptToPx(defaultRowHeight) : undefined,
		frozen: frozen
			? {
					rows: Number(attr(pane, "ySplit") ?? 0) | 0,
					cols: Number(attr(pane, "xSplit") ?? 0) | 0,
				}
			: { rows: 0, cols: 0 },
		showGridLines:
			attr(view, "showGridLines") !== "0" &&
			attr(view, "showGridLines") !== "false",
		zoom:
			Math.min(
				4,
				Math.max(0.1, Number(attr(view, "zoomScale") ?? 100) / 100),
			) || 1,
		tabColor,
	};
}

/* ----------------------------------------------------------------- helpers */

function parseXml(xml: string) {
	const doc = new DOMParser().parseFromString(xml, "application/xml");
	if (doc.getElementsByTagName("parsererror").length)
		throw new Error("Malformed XML part");
	return doc;
}
// Namespace-agnostic: some writers prefix SpreadsheetML elements (x:font).
/** Direct children named `local` (fonts > font, cellXfs > xf, …). */
const all = (root: Element | null | undefined, local: string): Element[] =>
	root ? Array.from(root.children).filter((el) => el.localName === local) : [];
const first = (root: Document | Element | null | undefined, local: string) =>
	root?.getElementsByTagNameNS("*", local)[0] ?? null;
