import { PreviewError } from "../../lib/errors";
import { OLE_MAGIC, startsWith, ZIP_MAGIC } from "../../lib/fetch-bytes";
import { assertSafeZip } from "../../lib/zip-guard";

export type DocxDocument = { html: string; warnings: string[] };

const SAFE_IMAGE_TYPES = new Set([
	"image/png",
	"image/jpeg",
	"image/gif",
	"image/webp",
	"image/bmp",
]);

/**
 * .docx → sanitized HTML.
 *
 * Mammoth maps Word's semantic structure (headings, lists, tables, bold, links, images) to
 * plain HTML and deliberately ignores most visual formatting. Its output is still built from
 * untrusted input, so it goes through DOMPurify with a strict allow-list before it reaches
 * the DOM: no scripts, styles, forms, frames or event handlers; links limited to http(s),
 * mailto and in-document anchors; images only as inline raster data URIs.
 */
export async function convertDocx(bytes: Uint8Array): Promise<DocxDocument> {
	if (startsWith(bytes, OLE_MAGIC)) {
		throw new PreviewError(
			"protected",
			"OLE compound file: either an encrypted .docx or a legacy .doc renamed to .docx.",
		);
	}
	if (!startsWith(bytes, ZIP_MAGIC))
		throw new PreviewError(
			"corrupt",
			"Not a zip container (missing PK\\x03\\x04 signature).",
		);
	assertSafeZip(bytes, { maxUncompressed: 200 * 1024 * 1024 });

	const [{ default: mammoth }, purify] = await Promise.all([
		import("mammoth"),
		getPurifier(),
	]);

	let result: { value: string; messages: { type: string; message: string }[] };
	try {
		result = await mammoth.convertToHtml(
			{
				arrayBuffer: bytes.buffer.slice(
					bytes.byteOffset,
					bytes.byteOffset + bytes.byteLength,
				) as ArrayBuffer,
			},
			{
				// Linked (not embedded) images would make the viewer fetch arbitrary URLs: drop them.
				externalFileAccess: false,
				// Word's Title/Subtitle aren't headings by default; most documents use them as such.
				styleMap: [
					"p[style-name='Title'] => h1.doc-title:fresh",
					"p[style-name='Subtitle'] => h2.doc-subtitle:fresh",
				],
				convertImage: mammoth.images.imgElement(async (image) => {
					if (!SAFE_IMAGE_TYPES.has(image.contentType)) return { src: "" };
					return {
						src: `data:${image.contentType};base64,${await image.readAsBase64String()}`,
					};
				}),
			},
		);
	} catch (e) {
		throw new PreviewError(
			"corrupt",
			`mammoth could not read the document: ${e instanceof Error ? e.message : String(e)}`,
			{ cause: e },
		);
	}

	const html = purify.sanitize(result.value, {
		USE_PROFILES: { html: true },
		FORBID_TAGS: [
			"style",
			"script",
			"form",
			"input",
			"button",
			"textarea",
			"select",
			"iframe",
			"object",
			"embed",
			"svg",
			"math",
			"link",
			"meta",
			"base",
		],
		FORBID_ATTR: ["style", "srcset", "action", "formaction"],
		ALLOWED_URI_REGEXP:
			/^(?:https?:|mailto:|#|data:image\/(?:png|jpe?g|gif|webp|bmp);base64,)/i,
	});

	return {
		html,
		warnings: result.messages
			.filter((m) => m.type === "warning")
			.map((m) => m.message),
	};
}

type Purifier = typeof import("dompurify").default;
let purifier: Promise<Purifier> | undefined;

/** A private DOMPurify instance, so these hooks never leak into other uses of the library. */
function getPurifier() {
	purifier ??= import("dompurify").then(({ default: createDOMPurify }) => {
		const p = createDOMPurify(window);
		p.addHook("afterSanitizeAttributes", (node) => {
			if (node.tagName === "A") {
				const href = node.getAttribute("href") ?? "";
				if (href.startsWith("#")) return;
				node.setAttribute("target", "_blank");
				node.setAttribute("rel", "noopener noreferrer nofollow");
			}
			if (node.tagName === "IMG" && !node.getAttribute("src")) node.remove();
		});
		return p;
	});
	return purifier;
}
