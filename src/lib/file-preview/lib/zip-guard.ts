import { type Unzipped, unzipSync } from "fflate";
import { PreviewError } from "./errors";
import { formatBytes, MB } from "./format";

/**
 * Office files are zip archives, and a small zip can inflate to gigabytes (a "zip bomb").
 * Before handing bytes to a parser, read the central directory (nothing is decompressed)
 * and refuse archives whose declared contents are unreasonable.
 *
 * Declared sizes can lie, so this is defence in depth next to the download limit, not a guarantee.
 */
export function assertSafeZip(
	bytes: Uint8Array,
	{ maxUncompressed = 300 * MB, maxEntries = 10_000 } = {},
) {
	let total = 0;
	let entries = 0;
	try {
		unzipSync(bytes, {
			filter(file) {
				entries++;
				total += file.originalSize;
				if (entries > maxEntries)
					throw new PreviewError(
						"unsupported",
						`This file contains more than ${maxEntries.toLocaleString()} parts, too many to preview safely.`,
					);
				if (total > maxUncompressed)
					throw new PreviewError(
						"unsupported",
						`This file expands to more than ${formatBytes(maxUncompressed)} when opened, too much to preview safely.`,
					);
				return false; // inspect only, never inflate
			},
		});
	} catch (e) {
		if (e instanceof PreviewError) throw e;
		throw new PreviewError(
			"corrupt",
			`Invalid zip container: ${e instanceof Error ? e.message : String(e)}`,
			{ cause: e },
		);
	}
}

/** Inflates only the entries `want` accepts. */
export function readZipEntries(
	bytes: Uint8Array,
	want: (name: string) => boolean,
): Unzipped {
	return unzipSync(bytes, { filter: (f) => want(f.name) });
}
