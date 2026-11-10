import {
	type ChatPersistence,
	memoryPersistence,
} from "@tanstack/ai-persistence";
import { SEED_TRANSCRIPTS } from "./sessions/seed-transcripts.server";

/*
 * TanStack AI's chat state, keyed by `threadId` (= session id): the transcript, runs
 * and pending interrupts. In memory for now; swap for a database adapter (Prisma,
 * Drizzle) later without touching the callers.
 *
 * Kept on `globalThis` so Vite's server HMR doesn't wipe conversations on every edit.
 */
const globalStore = globalThis as typeof globalThis & {
	__agenticUiPersistence?: ChatPersistence;
};

export const persistence: ChatPersistence =
	globalStore.__agenticUiPersistence ?? seededPersistence();

globalStore.__agenticUiPersistence = persistence;

/** A fresh in-memory store, with the dev sessions' history already in it. */
function seededPersistence(): ChatPersistence {
	const store = memoryPersistence();
	for (const [threadId, messages] of Object.entries(SEED_TRANSCRIPTS)) {
		// The memory store writes synchronously; nothing reads before this settles.
		void store.stores.messages.saveThread(threadId, messages);
	}
	return store;
}
