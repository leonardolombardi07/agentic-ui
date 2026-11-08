import type { HighlighterCore, ThemedToken } from "shiki/core";
import { extensionOf } from "./format";

/**
 * One shared Shiki highlighter (code, text and markdown previews all use it).
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

/** Language id for a file name, e.g. "report.py" → "py", "Dockerfile" → "dockerfile". */
export const languageForFile = (name: string) =>
	extensionOf(name) || name.toLowerCase();

/** File extensions the code previewer claims. Kept explicit so plain-text formats stay with the text previewer. */
export const CODE_EXTENSIONS = [
	"js",
	"mjs",
	"cjs",
	"jsx",
	"ts",
	"mts",
	"cts",
	"tsx",
	"py",
	"pyw",
	"rb",
	"php",
	"java",
	"kt",
	"kts",
	"scala",
	"go",
	"rs",
	"c",
	"h",
	"cc",
	"cpp",
	"cxx",
	"hh",
	"hpp",
	"cs",
	"fs",
	"swift",
	"m",
	"mm",
	"dart",
	"lua",
	"r",
	"jl",
	"pl",
	"sh",
	"bash",
	"zsh",
	"ps1",
	"psm1",
	"bat",
	"sql",
	"graphql",
	"gql",
	"html",
	"htm",
	"css",
	"scss",
	"sass",
	"less",
	"vue",
	"svelte",
	"astro",
	"json",
	"jsonc",
	"json5",
	"yaml",
	"yml",
	"toml",
	"ini",
	"xml",
	"xsd",
	"plist",
	"csproj",
	"tf",
	"hcl",
	"proto",
	"dockerfile",
	"makefile",
	"gradle",
	"groovy",
	"ex",
	"exs",
	"erl",
	"hs",
	"clj",
	"elm",
	"vb",
	"sol",
	"zig",
	"nim",
	"diff",
	"patch",
] as const;
