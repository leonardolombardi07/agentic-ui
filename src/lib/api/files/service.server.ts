import { getOwnedRecord } from "@/lib/api/sessions/service.server";
import {
	MAX_UPLOAD_BYTES,
	type SessionFile,
	SessionFileSchema,
} from "@/lib/api/types/file";
import { filesTable } from "./store.server";

/*
 * File use cases. Like sessions, every function takes the caller's id and treats a
 * file in someone else's session as missing.
 */

/** `null` when the session doesn't exist or isn't the caller's. */
export async function listSessionFiles(
	ownerId: string,
	sessionId: string,
): Promise<SessionFile[] | null> {
	if (!(await getOwnedRecord(ownerId, sessionId))) return null;
	return filesTable.listBySession(sessionId);
}

/** A file's record. `null` when it doesn't exist or isn't the caller's. */
export async function getFile(
	ownerId: string,
	fileId: string,
): Promise<SessionFile | null> {
	return (await getOwnedFile(ownerId, fileId))?.record ?? null;
}

export async function getOwnedFile(ownerId: string, fileId: string) {
	const file = await filesTable.get(fileId);
	if (!file) return null;
	return (await getOwnedRecord(ownerId, file.record.sessionId)) ? file : null;
}

export class UploadError extends Error {}

/** Stores `files` as uploads, optionally tied to the user message they came with. */
export async function uploadSessionFiles(
	ownerId: string,
	sessionId: string,
	messageId: string | null,
	files: File[],
): Promise<SessionFile[] | null> {
	if (!(await getOwnedRecord(ownerId, sessionId))) return null;
	const records: SessionFile[] = [];
	for (const file of files) {
		if (file.size > MAX_UPLOAD_BYTES) {
			throw new UploadError(
				`${file.name} is larger than ${MAX_UPLOAD_BYTES / (1024 * 1024)} MB.`,
			);
		}
		const record = SessionFileSchema.parse({
			id: crypto.randomUUID(),
			sessionId,
			name: file.name,
			mediaType: mediaTypeOf(file),
			size: file.size,
			origin: "uploaded",
			messageId,
			createdAt: new Date().toISOString(),
		});
		const bytes = new Uint8Array(await file.arrayBuffer());
		await filesTable.insert({ record, bytes });
		records.push(record);
	}
	return records;
}

/* Browsers leave `type` empty for many text formats; the preview needs one. */
const TYPES_BY_EXTENSION: Record<string, string> = {
	md: "text/markdown",
	markdown: "text/markdown",
	txt: "text/plain",
	log: "text/plain",
	csv: "text/csv",
	json: "application/json",
	ts: "text/typescript",
	tsx: "text/typescript",
	js: "text/javascript",
	jsx: "text/javascript",
	py: "text/x-python",
	sql: "text/x-sql",
	yaml: "text/yaml",
	yml: "text/yaml",
	html: "text/html",
	css: "text/css",
	svg: "image/svg+xml",
	pdf: "application/pdf",
};

/*
 * A file the browser has no type for arrives as `application/octet-stream` in the
 * multipart body (not empty), so that counts as unknown too.
 */
function mediaTypeOf(file: File): string {
	return file.type && file.type !== "application/octet-stream"
		? file.type
		: mediaTypeFromName(file.name);
}

function mediaTypeFromName(name: string): string {
	const extension = name.split(".").pop()?.toLowerCase() ?? "";
	return TYPES_BY_EXTENSION[extension] ?? "application/octet-stream";
}
