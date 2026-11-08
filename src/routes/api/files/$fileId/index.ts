import { createFileRoute } from "@tanstack/react-router";
import { getCurrentUserId } from "@/lib/api/auth.server";
import { getOwnedFile } from "@/lib/api/files/service.server";

/** A file's bytes. Inline by default so images and PDFs render; `?download=1` saves. */
export const Route = createFileRoute("/api/files/$fileId/")({
	server: {
		handlers: {
			GET: async ({ request, params }) => {
				const file = await getOwnedFile(getCurrentUserId(), params.fileId);
				if (!file) return new Response("File not found", { status: 404 });
				const download = new URL(request.url).searchParams.has("download");
				const name = encodeURIComponent(file.record.name);
				return new Response(file.bytes, {
					headers: {
						"Content-Type": file.record.mediaType,
						"Content-Length": String(file.bytes.byteLength),
						"Content-Disposition": `${download ? "attachment" : "inline"}; filename*=UTF-8''${name}`,
						...contentSecurityPolicy(file.record.mediaType),
						"X-Content-Type-Options": "nosniff",
						"Cache-Control": "private, max-age=3600",
					},
				});
			},
		},
	},
});

/**
 * Uploaded files must never run as part of this app. `default-src 'none'` blocks
 * scripts in an SVG or HTML opened directly; `sandbox` also isolates HTML. Images
 * get no `sandbox` (Chromium then refuses to load them in an <img>, where scripts
 * can't run anyway), and PDFs no CSP at all (it stops the browser's PDF viewer).
 */
function contentSecurityPolicy(mediaType: string): Record<string, string> {
	if (mediaType === "application/pdf") return {};
	const base =
		"default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'";
	return {
		"Content-Security-Policy": mediaType.startsWith("image/")
			? base
			: `sandbox; ${base}`,
	};
}
