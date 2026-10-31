import { z } from "zod";

/** A packaged set of instructions the agent loads for one kind of task. */
export const AgentSkillSchema = z.object({
	id: z.string(),
	name: z.string(),
	description: z.string(),
	version: z.number().int().positive(),
});

/** Something the agent can call: a built-in capability or a connector's tool. */
export const AgentToolSchema = z.object({
	id: z.string(),
	name: z.string(),
	description: z.string(),
	/** Where the tool comes from, e.g. `Built-in` or a connector name. */
	source: z.string(),
});

export const AgentSchema = z.object({
	id: z.string(),
	name: z.string(),
	description: z.string(),
	/** The agent's system prompt, shown on its page so users know what it will do. */
	instructions: z.string(),
	/** Identity color, e.g. `#f5b82e`. Fills the avatar when there's no image (or it fails to load). */
	color: z.string().regex(/^#[0-9a-f]{6}$/i),
	/** Absolute URL or app-relative path. Optional: most agents only have a color. */
	avatarUrl: z.string().optional(),
	/** Who publishes the agent, shown in the gallery. */
	publisher: z.string(),
	category: z.string(),
	version: z.number().int().positive(),
	/** ISO date-time of the latest version. */
	updatedAt: z.string(),
	installCount: z.number().int().nonnegative(),
	skills: z.array(AgentSkillSchema),
	tools: z.array(AgentToolSchema),
});

export type AgentSkill = z.infer<typeof AgentSkillSchema>;
export type AgentTool = z.infer<typeof AgentToolSchema>;
export type Agent = z.infer<typeof AgentSchema>;
