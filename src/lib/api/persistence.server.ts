import {
	type ChatPersistence,
	memoryPersistence,
} from "@tanstack/ai-persistence";

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
	globalStore.__agenticUiPersistence ?? memoryPersistence();

globalStore.__agenticUiPersistence = persistence;
