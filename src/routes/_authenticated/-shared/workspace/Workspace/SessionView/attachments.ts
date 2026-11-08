import type { UIMessage } from "@tanstack/ai-react";
import type { SessionFile } from "@/lib/api/types/file";

/*
 * How files travel with a user message. The files are uploaded first (tied to the
 * message id), then the message carries one extra text part that tells the model
 * about them. That part is marked in its metadata so the transcript shows file chips
 * instead of its text.
 */

const ATTACHMENTS_KIND = "attachments";

/*
 * Also how the part is recognised when its metadata doesn't come back: TanStack AI's
 * UI message type has no part metadata, so a store may not keep it.
 */
const ATTACHMENTS_PREFIX = "The user attached these files:\n";

/** Small text files go to the model inline, so it can actually read them. */
const MAX_INLINE_CHARS = 32_000;

type TextPartMetadata = { kind: typeof ATTACHMENTS_KIND; fileIds: string[] };

/** The text part announcing `uploaded` to the model. `originals` are the same files, as picked. */
export async function attachmentsPart(
	uploaded: SessionFile[],
	originals: File[],
): Promise<{ type: "text"; content: string; metadata: TextPartMetadata }> {
	const sections = await Promise.all(
		uploaded.map(async (record, index) => {
			const header = `- ${record.name} (${record.mediaType}, ${record.size} bytes)`;
			const original = originals[index];
			if (!original || !isInlineText(record)) return header;
			const text = await original.text();
			if (text.length > MAX_INLINE_CHARS)
				return `${header} - too long to include`;
			return `${header}:\n\`\`\`\n${text}\n\`\`\``;
		}),
	);
	return {
		type: "text",
		/*
		 * Starts on its own paragraph: stored transcripts join a message's text parts
		 * with no separator, and this keeps the user's text and the note apart.
		 */
		content: `\n\n${ATTACHMENTS_PREFIX}${sections.join("\n")}`,
		metadata: { kind: ATTACHMENTS_KIND, fileIds: uploaded.map((f) => f.id) },
	};
}

function isInlineText(file: SessionFile): boolean {
	return (
		file.mediaType.startsWith("text/") || file.mediaType === "application/json"
	);
}

type MessagePart = UIMessage["parts"][number];

/**
 * What the user typed, without the attachments announcement (shown as chips instead).
 * The announcement is its own part when sent, but the stored transcript comes back
 * with a message's text parts joined into one, so it's cut from wherever it starts.
 */
export function userVisibleText(message: UIMessage): string {
	const text = message.parts
		.filter((part) => part.type === "text")
		.filter((part) => readMetadata(partMetadata(part)) === null)
		.map((part) => part.content)
		.join("");
	const start = text.indexOf(ATTACHMENTS_PREFIX);
	// Only where a line starts, so a user quoting the phrase mid-sentence keeps it.
	if (start === -1 || (start > 0 && text[start - 1] !== "\n")) return text;
	return text.slice(0, start).trimEnd();
}

/** The files attached to `message`, in the order they were attached. */
export function messageFiles(
	message: UIMessage,
	files: ReadonlyArray<SessionFile>,
): SessionFile[] {
	const ids = new Set<string>();
	for (const part of message.parts) {
		if (part.type !== "text") continue;
		for (const id of readMetadata(partMetadata(part))?.fileIds ?? [])
			ids.add(id);
	}
	// The message id also links them, in case a store drops part metadata.
	return files.filter((f) => ids.has(f.id) || f.messageId === message.id);
}

function partMetadata(part: MessagePart): unknown {
	return "metadata" in part ? part.metadata : undefined;
}

function readMetadata(metadata: unknown): TextPartMetadata | null {
	if (
		typeof metadata === "object" &&
		metadata !== null &&
		"kind" in metadata &&
		metadata.kind === ATTACHMENTS_KIND &&
		"fileIds" in metadata &&
		Array.isArray(metadata.fileIds)
	) {
		return {
			kind: ATTACHMENTS_KIND,
			fileIds: metadata.fileIds.filter(
				(id): id is string => typeof id === "string",
			),
		};
	}
	return null;
}
