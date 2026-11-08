import type { SessionFile } from "@/lib/api/types/file";
import { SEED_FILES } from "./seed.server";

/*
 * Session files, in memory for now (like the sessions table). Every function is async
 * so moving to blob storage plus a table doesn't change the callers.
 */

type StoredFile = { record: SessionFile; bytes: Uint8Array<ArrayBuffer> };

/* On `globalThis` so Vite's server HMR doesn't wipe uploads on every edit. */
const globalStore = globalThis as typeof globalThis & {
	__agenticUiFiles?: Map<string, StoredFile>;
};

const files: Map<string, StoredFile> =
	globalStore.__agenticUiFiles ??
	new Map(
		SEED_FILES.map(({ content, ...record }) => {
			const bytes =
				typeof content === "string"
					? new TextEncoder().encode(content)
					: content;
			return [record.id, { record: { ...record, size: bytes.length }, bytes }];
		}),
	);

globalStore.__agenticUiFiles = files;

export const filesTable = {
	async get(id: string): Promise<StoredFile | null> {
		return files.get(id) ?? null;
	},
	/** Oldest first, so lists read in the order things happened. */
	async listBySession(sessionId: string): Promise<SessionFile[]> {
		return [...files.values()]
			.map((f) => f.record)
			.filter((r) => r.sessionId === sessionId)
			.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
	},
	async insert(file: StoredFile): Promise<void> {
		files.set(file.record.id, file);
	},
	async deleteForSession(sessionId: string): Promise<void> {
		for (const [id, file] of files) {
			if (file.record.sessionId === sessionId) files.delete(id);
		}
	},
};
