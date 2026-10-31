import { z } from "zod";

export const UserSchema = z.object({
	id: z.string(),
	/** Shown in greetings, e.g. "Hello, Leonardo". */
	firstName: z.string(),
	lastName: z.string(),
	email: z.string(),
});

export type User = z.infer<typeof UserSchema>;
