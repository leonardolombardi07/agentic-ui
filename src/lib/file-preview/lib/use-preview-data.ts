import { useSuspenseQuery } from "@tanstack/react-query";
import type { PreviewSource } from "../types";
import { isRetryable } from "./errors";
import { fetchBytes } from "./fetch-bytes";

/**
 * The one data hook every previewer uses: download the bytes (within the limit), turn them
 * into whatever the previewer renders, and cache the result per file.
 *
 * It suspends, so the nearest <PreviewBoundary> shows the type's skeleton while loading
 * and its error screen if anything throws. Previewers stay free of loading/error state.
 */
export function usePreviewData<T>(
	source: PreviewSource,
	{
		key,
		maxBytes,
		parse,
	}: {
		key: string;
		maxBytes: number;
		parse: (bytes: Uint8Array, signal: AbortSignal) => T | Promise<T>;
	},
): T {
	return useSuspenseQuery({
		queryKey: ["file-preview", key, source.id, source.url],
		queryFn: async ({ signal }) =>
			parse(await fetchBytes(source.url, { maxBytes, signal }), signal),
		retry: (count, error) => count < 2 && isRetryable(error),
		staleTime: Infinity, // same id, same bytes
		gcTime: 2 * 60_000, // parsed models can be large: drop them soon after the preview closes
	}).data;
}
