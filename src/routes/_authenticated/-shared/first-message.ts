/*
 * A message typed on Home or an agent page, waiting for its new session's view to
 * send it: only that view owns the session's chat stream. In memory on purpose:
 * it's taken a moment later, when the tab mounts.
 */
const pending = new Map<string, string>();

export function queueFirstMessage(sessionId: string, text: string): void {
	pending.set(sessionId, text);
}

/** Returns the message once, then forgets it, so it can't be sent twice. */
export function takeFirstMessage(sessionId: string): string | undefined {
	const text = pending.get(sessionId);
	pending.delete(sessionId);
	return text;
}
