import { createFileRoute } from "@tanstack/react-router";
import { getCurrentUserId } from "@/lib/api/auth.server";
import {
	UploadError,
	uploadSessionFiles,
} from "@/lib/api/files/service.server";

/**
 * Uploads files to a session: multipart form data with one or more `file` fields and
 * an optional `messageId` (the user message they're attached to). Answers with the
 * stored records.
 */
export const Route = createFileRoute("/api/sessions/$sessionId/files/")({
	server: {
		handlers: {
			POST: async ({ request, params }) => {
				let form: FormData;
				try {
					form = await request.formData();
				} catch {
					return new Response("Expected multipart form data", { status: 400 });
				}
				const files = form
					.getAll("file")
					.filter((value): value is File => value instanceof File);
				if (files.length === 0)
					return new Response("No files", { status: 400 });
				const messageId = form.get("messageId");
				try {
					const records = await uploadSessionFiles(
						getCurrentUserId(),
						params.sessionId,
						typeof messageId === "string" && messageId ? messageId : null,
						files,
					);
					if (!records)
						return new Response("Session not found", { status: 404 });
					return Response.json(records, { status: 201 });
				} catch (error) {
					if (error instanceof UploadError)
						return new Response(error.message, { status: 413 });
					throw error;
				}
			},
		},
	},
});
