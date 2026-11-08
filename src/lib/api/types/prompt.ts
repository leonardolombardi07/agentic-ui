import { z } from "zod";

/** Reusable text the user can attach to a message. */
export const PromptSchema = z.object({
	id: z.string(),
	name: z.string(),
	description: z.string(),
	/** The text that gets added to the message. */
	text: z.string(),
	publisher: z.string(),
	category: z.string(),
	/** ISO date-time of the last edit. */
	updatedAt: z.string(),
});

/** What the user fills in to create a prompt. */
export const PromptInputSchema = z.object({
	name: z.string().trim().min(1, "Give the prompt a name."),
	description: z.string().trim(),
	text: z.string().trim().min(1, "Write the prompt text."),
});

export type Prompt = z.infer<typeof PromptSchema>;
export type PromptInput = z.infer<typeof PromptInputSchema>;
