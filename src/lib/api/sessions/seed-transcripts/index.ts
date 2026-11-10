import type { ModelMessage } from "@tanstack/ai";
import { AUTH_SESSION_ID, AUTH_TRANSCRIPT } from "./auth-review";
import { BUDGET_SESSION_ID, BUDGET_TRANSCRIPT } from "./budget";
import { EARNINGS_SESSION_ID, EARNINGS_TRANSCRIPT } from "./earnings";
import { PIPELINE_SESSION_ID, PIPELINE_TRANSCRIPT } from "./pipeline";
import { SUPPORT_SESSION_ID, SUPPORT_TRANSCRIPT } from "./support";

/*
 * Transcripts for the seeded sessions (`../store.server.ts`), so the chat has
 * history to show in dev. Together they exercise the markdown renderer
 * (`@/lib/markdown`): tables from two rows to sixty, plain to financial, plus
 * code blocks, alerts, task lists and footnotes. Stored as TanStack AI keeps
 * them: `ModelMessage`s per thread.
 */

export { PIPELINE_SESSION_ID, SUPPORT_SESSION_ID };

export const SEED_TRANSCRIPTS: Record<string, ModelMessage[]> = {
	[PIPELINE_SESSION_ID]: PIPELINE_TRANSCRIPT,
	[SUPPORT_SESSION_ID]: SUPPORT_TRANSCRIPT,
	[EARNINGS_SESSION_ID]: EARNINGS_TRANSCRIPT,
	[BUDGET_SESSION_ID]: BUDGET_TRANSCRIPT,
	[AUTH_SESSION_ID]: AUTH_TRANSCRIPT,
};
