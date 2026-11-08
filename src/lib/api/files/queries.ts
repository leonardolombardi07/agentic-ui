import { mutationOptions, queryOptions } from "@tanstack/react-query";
import { isNotFound, notFound } from "@tanstack/react-router";
import { type SessionFile, SessionFileSchema } from "@/lib/api/types/file";
import { getFileFn, listSessionFilesFn } from "./functions";

/** A session's files, oldest first. Empty for a session that isn't on the server yet. */
export function sessionFilesQueryOptions(sessionId: string) {
	return queryOptions({
		queryKey: ["sessions", sessionId, "files"],
		queryFn: async () =>
			(await listSessionFilesFn({ data: { sessionId } })) ?? [],
	});
}

/** One file's record. Throws `notFound()` when it's missing, so routes can 404 on it. */
export function fileQueryOptions(fileId: string) {
	return queryOptions({
		queryKey: ["files", fileId],
		queryFn: async () => {
			const file = await getFileFn({ data: { fileId } });
			if (!file) throw notFound();
			return file;
		},
		// A file never changes: a new upload is a new id.
		staleTime: Number.POSITIVE_INFINITY,
		retry: (failureCount, error) => !isNotFound(error) && failureCount < 3,
	});
}

export type UploadFilesInput = {
	sessionId: string;
	/** The user message the files go with, if any. */
	messageId: string | null;
	files: File[];
};

/** Uploads files to a session and refreshes its list. */
export function uploadFilesMutationOptions() {
	return mutationOptions({
		mutationKey: ["files", "upload"],
		mutationFn: async ({
			sessionId,
			messageId,
			files,
		}: UploadFilesInput): Promise<SessionFile[]> => {
			const form = new FormData();
			for (const file of files) form.append("file", file);
			if (messageId) form.append("messageId", messageId);
			const response = await fetch(
				`/api/sessions/${encodeURIComponent(sessionId)}/files`,
				{ method: "POST", body: form },
			);
			if (!response.ok) {
				const reason = (await response.text().catch(() => "")).trim();
				throw new Error(reason || `Upload failed (${response.status}).`);
			}
			return SessionFileSchema.array().parse(await response.json());
		},
		onSuccess: (_data, { sessionId }, _onMutateResult, { client }) =>
			client.invalidateQueries({
				queryKey: sessionFilesQueryOptions(sessionId).queryKey,
			}),
	});
}
