/**
 * The signed-in user's id. A stand-in until Microsoft Entra ID: it must match the
 * mock user in `users/queries.ts`. Every session read and write is scoped by it.
 */
export function getCurrentUserId(): string {
	return "u-leonardo";
}
