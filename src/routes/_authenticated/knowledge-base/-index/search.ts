import { z } from "zod";
import type { VisibleSpace } from "@/lib/api/types/knowledge-base";

/**
 * Where the user is and what they searched. In the URL so a folder or a search can be
 * shared and Back walks up the folders. `.catch` keeps a hand-edited URL from being an error.
 */
export const KnowledgeBaseSearchSchema = z.object({
	/** The open space. Omitted: the first one the user can see. */
	space: z.string().optional().catch(undefined),
	/** The open folder. Omitted: the root of the space. */
	folder: z.string().optional().catch(undefined),
	/** The file open in the preview, over whatever the page shows. */
	file: z.string().optional().catch(undefined),
	/** Where the open file lands: a PDF page, or a spreadsheet's sheet and cell. */
	page: z.number().int().positive().optional().catch(undefined),
	sheet: z.string().optional().catch(undefined),
	cell: z.string().optional().catch(undefined),
	/** While set, the page shows search results instead of the folder. */
	q: z.string().optional().catch(undefined),
	/** Search everywhere the user has access (default) or only in the open space. */
	scope: z.enum(["all", "space"]).optional().catch(undefined),
});

export type KnowledgeBaseSearch = z.infer<typeof KnowledgeBaseSearchSchema>;

/**
 * The search params that open a file, as a patch over the current ones. The place is
 * always set, even to nothing: opening a file must not inherit the previous file's page.
 */
export function openFileSearch(
	fileId: string | undefined,
	place: Pick<KnowledgeBaseSearch, "page" | "sheet" | "cell"> = {},
): Pick<KnowledgeBaseSearch, "file" | "page" | "sheet" | "cell"> {
	return {
		file: fileId,
		page: place.page,
		sheet: place.sheet,
		cell: place.cell,
	};
}

/**
 * The space to show. A space the user can't see (a stale link, or access that was just
 * removed) falls back to the first visible one rather than to an error.
 */
export function resolveSpaceId(
	spaces: VisibleSpace[],
	requested: string | undefined,
): string {
	const match = spaces.find((space) => space.id === requested);
	return (match ?? spaces[0])?.id ?? "";
}
