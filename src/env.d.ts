/*
 * Types for environment variables. Keep in sync with `.env.example`.
 *
 * Server-only variables live on `process.env` and must never reach the browser.
 * Client variables need a `VITE_` prefix and are typed by adding an
 * `interface ImportMetaEnv { readonly VITE_X: string }` block here (none yet).
 */

declare namespace NodeJS {
	interface ProcessEnv {
		/** OpenRouter API key for the chat endpoint. Read through `env.server.ts`. */
		readonly OPENROUTER_API_KEY?: string;
		/** When the chat answers with a mock reply: `off`, `fallback` or `always`. */
		readonly MOCK_LLM?: "off" | "fallback" | "always";
	}
}
