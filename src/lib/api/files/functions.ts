import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getCurrentUserId } from "@/lib/api/auth.server";
import { SessionIdSchema } from "@/lib/api/types/session";
import { listSessionFiles } from "./service.server";

/*
 * Listing is a server function, like the sessions API. Uploads and downloads are
 * plain routes (`routes/api/...`): they move raw bytes, which a server function's
 * JSON payload isn't made for.
 */

/** `null` when the session doesn't exist or isn't the caller's. */
export const listSessionFilesFn = createServerFn({ method: "GET" })
	.validator(z.object({ sessionId: SessionIdSchema }))
	.handler(({ data }) => listSessionFiles(getCurrentUserId(), data.sessionId));
