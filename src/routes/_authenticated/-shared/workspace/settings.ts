import { z } from "zod";
import { createPersistedStore } from "@/lib/store";

/*
 * Layout settings: how much the workspace lets you open at once. The workspace model
 * reads them as `Limits` (see model.ts), so its ops stay pure and testable.
 *
 * Every field `.catch`es its default, so a bad or outdated value resets that one
 * setting instead of the whole object.
 */

export const LAYOUT_LIMITS = {
	groups: { min: 1, max: 4 },
	tabs: { min: 1, max: 12 },
} as const;

export const WhenGroupFullSchema = z.enum([
	/** Closes the least recently used tab to make room, like VSCode's editor limit. */
	"replace",
	/** Refuses and explains; the user picks what to close. */
	"warn",
]);

export const SessionPanesSchema = z.enum([
	/** Docked beside the chat when there's room, an overlay when there isn't. */
	"auto",
	/** Always an overlay over the chat, one at a time: nothing shares the screen. */
	"overlay",
]);

export const LayoutSettingsSchema = z.object({
	maxGroups: z
		.number()
		.int()
		.min(LAYOUT_LIMITS.groups.min)
		.max(LAYOUT_LIMITS.groups.max)
		.catch(2),
	maxTabsPerGroup: z
		.number()
		.int()
		.min(LAYOUT_LIMITS.tabs.min)
		.max(LAYOUT_LIMITS.tabs.max)
		.catch(5),
	whenGroupFull: WhenGroupFullSchema.catch("warn"),
	sessionPanes: SessionPanesSchema.catch("auto"),
});

export type LayoutSettings = z.infer<typeof LayoutSettingsSchema>;
export type WhenGroupFull = z.infer<typeof WhenGroupFullSchema>;
export type SessionPanes = z.infer<typeof SessionPanesSchema>;

export const LayoutPresetIdSchema = z.enum(["simple", "standard", "advanced"]);
export type LayoutPresetId = z.infer<typeof LayoutPresetIdSchema>;

/** Named starting points. Changing any field afterwards makes the layout "custom". */
export const LAYOUT_PRESETS: Record<LayoutPresetId, LayoutSettings> = {
	/** One thing on screen at a time: no tabs, no splits, opening replaces. */
	simple: {
		maxGroups: 1,
		maxTabsPerGroup: 1,
		whenGroupFull: "replace",
		sessionPanes: "overlay",
	},
	standard: {
		maxGroups: 2,
		maxTabsPerGroup: 5,
		whenGroupFull: "warn",
		sessionPanes: "auto",
	},
	advanced: {
		maxGroups: 4,
		maxTabsPerGroup: 10,
		whenGroupFull: "replace",
		sessionPanes: "auto",
	},
};

export const DEFAULT_LAYOUT_SETTINGS = LAYOUT_PRESETS.standard;

/** The preset `settings` match exactly, or "custom". */
export function presetOf(settings: LayoutSettings): LayoutPresetId | "custom" {
	for (const id of LayoutPresetIdSchema.options) {
		const preset = LAYOUT_PRESETS[id];
		if (
			(Object.keys(preset) as (keyof LayoutSettings)[]).every(
				(key) => preset[key] === settings[key],
			)
		)
			return id;
	}
	return "custom";
}

/**
 * Simple mode hides the tab bar: with one group of one tab it only repeats the title
 * the view already shows, and its buttons (split, new tab) have nothing to do.
 */
export function showsTabBar(settings: LayoutSettings): boolean {
	return settings.maxGroups > 1 || settings.maxTabsPerGroup > 1;
}

const store = createPersistedStore({
	key: "agentic-ui:layout-settings:v1",
	schema: LayoutSettingsSchema,
	initialState: DEFAULT_LAYOUT_SETTINGS,
	debounceMs: 0,
});

export const layoutSettings = {
	getState: store.getState,
	subscribe: store.subscribe,
	set(patch: Partial<LayoutSettings>) {
		store.setState((prev) => {
			const next = LayoutSettingsSchema.parse({ ...prev, ...patch });
			const same = (Object.keys(next) as (keyof LayoutSettings)[]).every(
				(key) => next[key] === prev[key],
			);
			return same ? prev : next;
		});
	},
};

/** Whether "open to the side" can show something beside what's open. */
export function useCanOpenToSide(): boolean {
	return useLayoutSettings((s) => s.maxGroups > 1);
}

/** Read the layout settings in React. The selector must return a stable value. */
export function useLayoutSettings<S>(selector: (s: LayoutSettings) => S): S {
	return store.useStore(selector);
}
