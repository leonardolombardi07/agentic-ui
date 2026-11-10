import type * as React from "react";
import type { HighlighterCore, ThemedToken } from "shiki/core";

/**
 * One shared Shiki highlighter (file previews and chat markdown both use it).
 * Fine-grained build: the JavaScript regex engine (no WASM), a light and a dark theme, and
 * grammars loaded on first use, each its own chunk.
 *
 * Tokens carry both colours as CSS variables (`--shiki-light`, `--shiki-dark`); global.css
 * picks one under `[data-shiki]` from the app theme, so switching theme never re-tokenizes.
 */
const THEMES = { light: "github-light", dark: "github-dark" } as const;
let highlighter: Promise<HighlighterCore> | undefined;

function getHighlighter() {
	highlighter ??= (async () => {
		const [
			{ createHighlighterCore },
			{ createJavaScriptRegexEngine },
			{ bundledThemes },
		] = await Promise.all([
			import("shiki/core"),
			import("shiki/engine/javascript"),
			import("shiki/themes"),
		]);
		return createHighlighterCore({
			themes: [bundledThemes[THEMES.light](), bundledThemes[THEMES.dark]()],
			langs: [],
			engine: createJavaScriptRegexEngine(),
		});
	})();
	highlighter.catch(() => (highlighter = undefined)); // let a later call retry after a failed chunk load
	return highlighter;
}

export type Highlighted = { tokens: ThemedToken[][] };

/** Tokenises `code`. Resolves to null for languages Shiki doesn't know: callers render plain text. */
export async function highlight(
	code: string,
	lang: string,
): Promise<Highlighted | null> {
	const [h, { bundledLanguages }] = await Promise.all([
		getHighlighter(),
		import("shiki/langs"),
	]);
	const id = resolveLanguage(lang, bundledLanguages);
	if (!id) return null;
	if (!h.getLoadedLanguages().includes(id))
		await h.loadLanguage(bundledLanguages[id as keyof typeof bundledLanguages]);
	const { tokens } = h.codeToTokens(code, {
		lang: id,
		themes: THEMES,
		defaultColor: false,
	});
	return { tokens };
}

function resolveLanguage(
	lang: string,
	known: Record<string, unknown>,
): string | null {
	const l = lang.toLowerCase();
	const id = EXTENSION_TO_LANG[l] ?? l;
	return id in known ? id : null;
}

/** Extensions whose Shiki language id differs (most are already ids or aliases: ts, py, rs, yml…). */
const EXTENSION_TO_LANG: Record<string, string> = {
	h: "c",
	hh: "cpp",
	hpp: "cpp",
	cc: "cpp",
	cxx: "cpp",
	mjs: "javascript",
	cjs: "javascript",
	mts: "typescript",
	cts: "typescript",
	kts: "kotlin",
	pyw: "python",
	ps1: "powershell",
	psm1: "powershell",
	bash: "shellscript",
	zsh: "shellscript",
	sh: "shellscript",
	env: "dotenv",
	tf: "hcl",
	gql: "graphql",
	svelte: "svelte",
	vue: "vue",
	csproj: "xml",
	plist: "xml",
	xsd: "xml",
	dockerfile: "docker",
	makefile: "make",
	gradle: "groovy",
	ipynb: "json",
	jsonc: "jsonc",
	json5: "json5",
};

/** One line of tokens, coloured by the `[data-shiki]` rules in global.css. */
export function Tokens({ line }: { line: ThemedToken[] }) {
	return line.map((t, i) => (
		// biome-ignore lint/suspicious/noArrayIndexKey: tokens have no id and never reorder
		<span key={i} style={tokenStyle(t)}>
			{t.content}
		</span>
	));
}

// Colours are `--shiki-light` / `--shiki-dark` variables (see lib/shiki.ts); fontStyle is Shiki's bit flags.
const tokenStyle = ({
	htmlStyle,
	fontStyle = 0,
}: ThemedToken): React.CSSProperties => ({
	...(htmlStyle as React.CSSProperties),
	fontStyle: fontStyle & 1 ? "italic" : undefined,
	fontWeight: fontStyle & 2 ? 600 : undefined,
	textDecoration:
		[fontStyle & 4 && "underline", fontStyle & 8 && "line-through"]
			.filter(Boolean)
			.join(" ") || undefined,
});
