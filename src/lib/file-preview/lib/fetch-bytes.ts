import { isAbort, PreviewError, tooLarge } from "./errors";

/**
 * Downloads a file, refusing to read past `maxBytes` even when the declared size
 * (or a missing Content-Length) lies. Works for same-origin paths, signed URLs and blob: URLs.
 */
export async function fetchBytes(
	url: string,
	{ maxBytes, signal }: { maxBytes: number; signal?: AbortSignal },
): Promise<Uint8Array> {
	let res: Response;
	try {
		res = await fetch(url, {
			signal,
			credentials: "same-origin",
			referrerPolicy: "no-referrer",
		});
	} catch (e) {
		if (isAbort(e)) throw e;
		throw new PreviewError(
			"network",
			`Request to ${redact(url)} failed: ${e instanceof Error ? e.message : String(e)}`,
			{ cause: e },
		);
	}
	if (!res.ok) {
		throw new PreviewError(
			"network",
			`GET ${redact(url)} → HTTP ${res.status} ${res.statusText}`,
			{
				status: res.status,
				retryable:
					res.status >= 500 || res.status === 408 || res.status === 429,
			},
		);
	}

	const declared = Number(res.headers.get("content-length"));
	if (declared > maxBytes) throw tooLarge(declared, maxBytes);
	if (!res.body) return new Uint8Array(await res.arrayBuffer());

	const reader = res.body.getReader();
	const chunks: Uint8Array[] = [];
	let total = 0;
	for (;;) {
		const { done, value } = await reader.read();
		if (done) break;
		total += value.byteLength;
		if (total > maxBytes) {
			await reader.cancel();
			throw tooLarge(total, maxBytes);
		}
		chunks.push(value);
	}
	const out = new Uint8Array(total);
	let offset = 0;
	for (const c of chunks) {
		out.set(c, offset);
		offset += c.byteLength;
	}
	return out;
}

/** Signed URLs carry credentials in the query string: keep them out of error messages. */
const redact = (url: string) => url.split("?")[0];

/** Decodes text, dropping a UTF-8 BOM. Invalid sequences become U+FFFD rather than failing. */
export const decodeText = (bytes: Uint8Array) =>
	new TextDecoder("utf-8").decode(bytes);

export const startsWith = (
	bytes: Uint8Array,
	magic: readonly number[],
	at = 0,
) => magic.every((b, i) => bytes[at + i] === b);
export const ZIP_MAGIC = [0x50, 0x4b, 0x03, 0x04] as const;
/** OLE compound file: legacy .xls/.doc, and also every password-protected Office file. */
export const OLE_MAGIC = [
	0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1,
] as const;
