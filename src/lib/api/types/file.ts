import { z } from "zod";
import { SessionIdSchema } from "./session";

/** Where a file came from: the user attached it, or the agent made it. */
export const FileOriginSchema = z.enum(["uploaded", "generated"]);

export type FileOrigin = z.infer<typeof FileOriginSchema>;

/** A file that belongs to a session. The bytes are served from `/api/files/:id`. */
export const SessionFileSchema = z.object({
	id: z.string(),
	sessionId: SessionIdSchema,
	name: z.string().min(1).max(255),
	/** e.g. `image/png`, `text/markdown`. `application/octet-stream` when unknown. */
	mediaType: z.string(),
	/** Bytes. */
	size: z.number().int().nonnegative(),
	origin: FileOriginSchema,
	/** The user message it was attached to, for uploads sent with a message. */
	messageId: z.string().nullable(),
	createdAt: z.iso.datetime(),
});

export type SessionFile = z.infer<typeof SessionFileSchema>;

/** Largest upload the API accepts, per file. */
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

/** Where a file's bytes are served (inline, so images and PDFs render in place). */
export function fileUrl(fileId: string): string {
	return `/api/files/${encodeURIComponent(fileId)}`;
}

/** The download variant of `fileUrl`. */
export function fileDownloadUrl(fileId: string): string {
	return `${fileUrl(fileId)}?download=1`;
}
