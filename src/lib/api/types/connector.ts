import { z } from "zod";

/** An action a connector lets agents take. */
export const ConnectorToolSchema = z.object({
	name: z.string(),
	description: z.string(),
	/** Read-only tools never change anything in the connected service. */
	access: z.enum(["read", "write"]),
});

/** A link to an external service that agents can read from or act in. */
export const ConnectorSchema = z.object({
	id: z.string(),
	name: z.string(),
	description: z.string(),
	/** Longer text for the connector's page. */
	about: z.string(),
	publisher: z.string(),
	category: z.string(),
	/** Verified by the workspace's admins. */
	isVerified: z.boolean(),
	/** Brand color of the icon tile, e.g. `#4285f4`. */
	color: z.string().regex(/^#[0-9a-f]{6}$/i),
	/** One or two characters shown on the tile (there are no logo files yet). */
	monogram: z.string().min(1).max(2),
	tools: z.array(ConnectorToolSchema),
});

export type ConnectorTool = z.infer<typeof ConnectorToolSchema>;
export type Connector = z.infer<typeof ConnectorSchema>;
