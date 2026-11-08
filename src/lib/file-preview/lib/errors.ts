import { formatBytes } from "./format";

/**
 * Errors a previewer throws on purpose. `kind` drives the message the user sees;
 * `message` stays technical and only appears under "Technical details".
 */
export type PreviewErrorKind =
	| "network" // the download failed
	| "too-large" // bigger than the type allows
	| "corrupt" // not a valid file of this type
	| "protected" // password-protected / encrypted
	| "unsupported"; // valid, but this browser or previewer can't show it

export class PreviewError extends Error {
	readonly kind: PreviewErrorKind;
	readonly retryable: boolean;
	readonly status?: number;

	constructor(
		kind: PreviewErrorKind,
		message: string,
		opts: { retryable?: boolean; status?: number; cause?: unknown } = {},
	) {
		super(message, { cause: opts.cause });
		this.name = "PreviewError";
		this.kind = kind;
		this.retryable = opts.retryable ?? kind === "network";
		this.status = opts.status;
	}
}

export const tooLarge = (size: number, limit: number) =>
	new PreviewError(
		"too-large",
		`File is ${formatBytes(size)}; the preview limit is ${formatBytes(limit)}.`,
	);

export const isAbort = (e: unknown) =>
	e instanceof DOMException && e.name === "AbortError";

/** Only network failures are worth retrying: parsing the same bytes again fails the same way. */
export const isRetryable = (e: unknown) =>
	!(e instanceof PreviewError) || e.retryable;

export type ErrorDescription = {
	title: string;
	description: string;
	retryable: boolean;
};

/** Turns anything thrown while previewing into words for the user. */
export function describePreviewError(
	error: unknown,
	typeLabel: string,
): ErrorDescription {
	const what = typeLabel.toLowerCase();
	if (error instanceof PreviewError) {
		switch (error.kind) {
			case "network":
				return {
					title: "Couldn't download this file",
					description:
						error.status === 404
							? "The file is no longer available. It may have been moved or deleted."
							: error.status === 401 || error.status === 403
								? "You don't have access to this file anymore."
								: "Check your connection and try again.",
					retryable: error.retryable,
				};
			case "too-large":
				return {
					title: "Too large to preview",
					description: `${error.message} Download it to open it on your computer.`,
					retryable: false,
				};
			case "corrupt":
				return {
					title: "This file looks damaged",
					description: `It isn't a valid ${what} file, or it was only partly uploaded. Try downloading it, or ask for a new copy.`,
					retryable: false,
				};
			case "protected":
				return {
					title: "This file is protected",
					description:
						"It's password-protected or encrypted, so it can't be previewed here. Download it and open it with the password.",
					retryable: false,
				};
			case "unsupported":
				return {
					title: "Preview not available",
					description: error.message,
					retryable: false,
				};
		}
	}
	return {
		title: "Something went wrong showing this preview",
		description:
			"The file itself is probably fine. Try again, or download it to open it on your computer.",
		retryable: true,
	};
}
