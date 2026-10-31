/** Product name: the whole title on the home page, the suffix everywhere else. */
export const APP_NAME = "Agentic UI";

/** Fallback for pages without a more specific description. */
export const APP_DESCRIPTION =
	"Work with AI agents: start sessions, approve their actions and browse the agent gallery.";

type SeoOptions = {
	/** Page name, without the app suffix. Omit for the app name alone. */
	title?: string;
	/** Omit to inherit the nearest parent route's description. */
	description?: string;
};

/**
 * Meta tags for a route's `head`. TanStack dedupes `title` and meta by `name`/`property`
 * with the deepest route winning, so a child route only overrides what it passes.
 */
export function seo({ title, description }: SeoOptions) {
	const fullTitle = title ? `${title} | ${APP_NAME}` : APP_NAME;
	return [
		{ title: fullTitle },
		{ property: "og:title", content: fullTitle },
		...(description
			? [
					{ name: "description", content: description },
					{ property: "og:description", content: description },
				]
			: []),
	];
}
