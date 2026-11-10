import type { ModelMessage } from "@tanstack/ai";

/* A code review: code blocks, a diff, a caution alert and a text-only table. */

export const AUTH_SESSION_ID = "s-auth-pr";

const REVIEW_ANSWER = `I reviewed \`auth-middleware.ts\`. The happy path is fine, but there are two issues worth fixing before merge.

> [!CAUTION]
> Expired tokens are accepted: \`verifyToken\` checks the signature only, and the \`exp\` check is still a TODO.

### Suggested change

\`\`\`diff
 	const claims = await verifyToken(token);
 	if (!claims) return new Response("Unauthorized", { status: 401 });
-	// TODO: check claims.exp against clock skew
+	const now = Math.floor(Date.now() / 1000);
+	if (claims.exp + CLOCK_SKEW_SECONDS < now) {
+		return new Response("Token expired", { status: 401 });
+	}
 	return next();
\`\`\`

### Full middleware, with both fixes

\`\`\`ts
import { verifyToken } from "./tokens";

/** Tolerated drift between our clock and the issuer's, in seconds. */
const CLOCK_SKEW_SECONDS = 30;

/** The scheme is case-insensitive (RFC 7235), so "bearer" must work too. */
const BEARER = /^bearer\\s+(.+)$/i;

/** Rejects requests without a valid, unexpired bearer token. */
export async function authMiddleware(
	request: Request,
	next: () => Promise<Response>,
): Promise<Response> {
	const header = request.headers.get("authorization") ?? "";
	const match = BEARER.exec(header);
	if (!match) {
		return unauthorized("Missing bearer token");
	}

	const claims = await verifyToken(match[1]);
	if (!claims) {
		return unauthorized("Invalid token");
	}

	const now = Math.floor(Date.now() / 1000);
	if (claims.exp + CLOCK_SKEW_SECONDS < now) {
		return unauthorized("Token expired");
	}

	return next();
}

function unauthorized(reason: string): Response {
	return new Response(reason, {
		status: 401,
		headers: { "WWW-Authenticate": 'Bearer error="invalid_token"' },
	});
}
\`\`\`

| Check | Before | After |
| --- | :---: | :---: |
| Rejects missing header | Yes | Yes |
| Accepts \`bearer\` (lowercase) | No | Yes |
| Rejects expired tokens | **No** | Yes |
| Sends \`WWW-Authenticate\` | No | Yes |
`;

export const AUTH_TRANSCRIPT: ModelMessage[] = [
	{
		id: "m-auth-1",
		role: "user",
		content: "Please review the auth middleware before I merge the PR.",
	},
	{ id: "m-auth-2", role: "assistant", content: REVIEW_ANSWER },
];
