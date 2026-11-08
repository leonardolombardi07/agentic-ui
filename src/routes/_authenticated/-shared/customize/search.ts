import { z } from "zod";

export const SORT_OPTIONS = ["featured", "name", "recent"] as const;

/**
 * Search params shared by the Skills, Connectors and Prompts lists. They live in the URL
 * so a filtered view is shareable and Back restores it. `.catch` keeps a hand-edited URL
 * from ever being an error.
 */
export const CatalogSearchSchema = z.object({
	/** Yours: what the user has added. Discover: everything on offer. */
	view: z.enum(["yours", "discover"]).default("yours").catch("yours"),
	q: z.string().optional().catch(undefined),
	category: z.string().optional().catch(undefined),
	sort: z.enum(SORT_OPTIONS).default("featured").catch("featured"),
	/** Discover shows a short preview until this is set. */
	all: z.boolean().optional().catch(undefined),
});

export type CatalogSearch = z.infer<typeof CatalogSearchSchema>;
