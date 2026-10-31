import { useSyncExternalStore } from "react";
import { z } from "zod";

/** `auto` follows the OS setting and keeps following it while the app is open. */
export const ThemeSchema = z.enum(["light", "dark", "auto"]);
export type Theme = z.infer<typeof ThemeSchema>;

/*
 * Stored as a raw string (not JSON) so the inline init script can read it with no
 * parsing. Keep STORAGE_KEY and DEFAULT_THEME in sync with THEME_INIT_SCRIPT below.
 */
const STORAGE_KEY = "theme";
/** Dark is the primary theme (see global.css). */
const DEFAULT_THEME: Theme = "dark";
const DARK_QUERY = "(prefers-color-scheme: dark)";

/**
 * Runs in <head> before first paint, so there's no flash of the wrong theme.
 * Mirrors `applyTheme`; it can't import it because it's inlined as a string.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var stored=window.localStorage.getItem('${STORAGE_KEY}');var mode=(stored==='light'||stored==='dark'||stored==='auto')?stored:'${DEFAULT_THEME}';var prefersDark=window.matchMedia('${DARK_QUERY}').matches;var resolved=mode==='auto'?(prefersDark?'dark':'light'):mode;var root=document.documentElement;root.classList.remove('light','dark');root.classList.add(resolved);if(mode==='auto'){root.removeAttribute('data-theme')}else{root.setAttribute('data-theme',mode)}root.style.colorScheme=resolved;}catch(e){}})();`;

const listeners = new Set<() => void>();

function readTheme(): Theme {
	try {
		const stored = window.localStorage.getItem(STORAGE_KEY);
		const parsed = ThemeSchema.safeParse(stored);
		return parsed.success ? parsed.data : DEFAULT_THEME;
	} catch {
		// Storage can throw (privacy modes, disabled cookies).
		return DEFAULT_THEME;
	}
}

function applyTheme(theme: Theme) {
	const prefersDark = window.matchMedia(DARK_QUERY).matches;
	const resolved = theme === "auto" ? (prefersDark ? "dark" : "light") : theme;
	const root = document.documentElement;
	root.classList.remove("light", "dark");
	root.classList.add(resolved);
	if (theme === "auto") {
		root.removeAttribute("data-theme");
	} else {
		root.setAttribute("data-theme", theme);
	}
	root.style.colorScheme = resolved;
}

export function setTheme(theme: Theme) {
	try {
		window.localStorage.setItem(STORAGE_KEY, theme);
	} catch {
		// Not persisted, but still applied for this page load.
	}
	applyTheme(theme);
	for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
}

if (typeof window !== "undefined") {
	// Another tab changed the theme.
	window.addEventListener("storage", (event) => {
		if (event.key !== STORAGE_KEY) return;
		applyTheme(readTheme());
		for (const listener of listeners) listener();
	});
	// The OS switched light/dark: only matters in `auto`.
	window.matchMedia(DARK_QUERY).addEventListener("change", () => {
		if (readTheme() === "auto") applyTheme("auto");
	});
}

/** The chosen theme (not the resolved one): `auto` stays `auto`. */
export function useTheme(): Theme {
	return useSyncExternalStore(subscribe, readTheme, () => DEFAULT_THEME);
}
