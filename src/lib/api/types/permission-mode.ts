import { z } from "zod";

/** How much the agent may do without asking. */
export const PermissionModeSchema = z.enum([
	"ask",
	"auto-edit",
	"plan",
	"auto",
]);

export type PermissionMode = z.infer<typeof PermissionModeSchema>;
