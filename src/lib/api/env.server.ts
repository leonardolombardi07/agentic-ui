import { z } from "zod";

/*
 * Server environment, validated when first read so a missing key fails with a clear
 * message instead of deep inside a provider call. Types: `src/env.d.ts`.
 */

/**
 * When the chat answers with a canned mock reply instead of calling OpenRouter:
 * - `off`: never (the default in production)
 * - `fallback`: when OpenRouter rate-limits a request (the default in dev)
 * - `always`: every request, without calling OpenRouter or needing a key
 */
export const MockLlmModeSchema = z.enum(["off", "fallback", "always"]);

export type MockLlmMode = z.infer<typeof MockLlmModeSchema>;

const ServerEnvSchema = z
	.object({
		OPENROUTER_API_KEY: z.string().trim().optional(),
		MOCK_LLM: MockLlmModeSchema.optional(),
		NODE_ENV: z.string().optional(),
	})
	.transform((env) => ({
		openRouterApiKey: env.OPENROUTER_API_KEY || null,
		mockLlm:
			env.MOCK_LLM ?? (env.NODE_ENV === "production" ? "off" : "fallback"),
	}))
	.refine((env) => env.mockLlm === "always" || env.openRouterApiKey !== null, {
		message:
			"OPENROUTER_API_KEY is not set. See .env.example (or set MOCK_LLM=always).",
	});

export type ServerEnv = z.infer<typeof ServerEnvSchema>;

export class MissingEnvError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "MissingEnvError";
	}
}

/** Read per call, not at import, so editing `.env` and restarting is all it takes. */
export function getServerEnv(): ServerEnv {
	const parsed = ServerEnvSchema.safeParse(process.env);
	if (!parsed.success) {
		throw new MissingEnvError(
			parsed.error.issues.map((issue) => issue.message).join(" "),
		);
	}
	return parsed.data;
}
