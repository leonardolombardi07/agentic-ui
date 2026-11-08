import { z } from "zod";

/** A packaged set of instructions an agent loads for one kind of task. */
export const SkillSchema = z.object({
	id: z.string(),
	name: z.string(),
	description: z.string(),
	/** Where it comes from, e.g. `Anthropic Directory`. */
	publisher: z.string(),
	category: z.string(),
	version: z.number().int().positive(),
	/** ISO date-time of the latest version. */
	updatedAt: z.string(),
	/** The skill's SKILL.md body, shown on its page so users know what it will do. */
	instructions: z.string(),
	/** Files the skill ships with, besides SKILL.md. */
	files: z.array(z.string()),
});

export type Skill = z.infer<typeof SkillSchema>;
