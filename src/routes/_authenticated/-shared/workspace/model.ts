import { z } from "zod";

/*
 * Pure workspace model: no React, no storage, no router. Every op returns the SAME
 * object when nothing changes, which is what keeps URL <-> store sync loop-free.
 */

const TabBaseSchema = z.object({
	id: z.string(),
	composerDraft: z.string(),
	/** null = stick to bottom (sessions) or top (agent pages). */
	scrollTop: z.number().nullable(),
});

export const SessionTabSchema = TabBaseSchema.extend({
	/** Defaulted so tabs saved before agent tabs existed still load. */
	kind: z.literal("session").default("session"),
	sessionId: z.string(),
	rightPanel: z.object({
		open: z.boolean(),
		section: z.enum(["files", "agent", "context"]).optional(),
	}),
});

/** An agent's page opened as an editor, like VSCode's extension details. */
export const AgentTabSchema = TabBaseSchema.extend({
	kind: z.literal("agent"),
	agentId: z.string(),
});

/* A plain union, not a discriminated one: old session tabs have no `kind` to discriminate on. */
export const TabSchema = z.union([AgentTabSchema, SessionTabSchema]);

export const EditorGroupSchema = z.object({
	id: z.string(),
	tabs: z.array(TabSchema),
	activeTabId: z.string().nullable(),
});

/** Keeps groups focused, and lets the tab bar fit its tabs without scrolling. */
export const MAX_TABS_PER_GROUP = 5;

export const SPLIT_RATIO = { min: 0.2, max: 0.8, default: 0.5 } as const;

export const WorkspaceSchema = z.object({
	groups: z.array(EditorGroupSchema).min(1).max(2),
	activeGroupId: z.string(),
	/** Width of the first group as a fraction of the workspace, when split. */
	splitRatio: z.number().default(SPLIT_RATIO.default),
});

export type SessionTab = z.infer<typeof SessionTabSchema>;
export type AgentTab = z.infer<typeof AgentTabSchema>;
export type Tab = z.infer<typeof TabSchema>;
export type EditorGroup = z.infer<typeof EditorGroupSchema>;
export type Workspace = z.infer<typeof WorkspaceSchema>;
export type TabRef = { groupId: string; tabId: string };
/** What a tab shows. Two tabs with the same target show the same thing. */
export type TabTarget =
	| { kind: "session"; sessionId: string }
	| { kind: "agent"; agentId: string };
export type TabInit = {
	composerDraft?: string;
	scrollTop?: number | null;
	/** Ignored by agent tabs. */
	rightPanel?: SessionTab["rightPanel"];
};
/** The fields every kind of tab has, so callers can update them without narrowing. */
export type TabPatch = { composerDraft?: string; scrollTop?: number | null };

function uid() {
	return crypto.randomUUID();
}

/** Deterministic id: this is also the server snapshot, so it must match on hydration. */
export function emptyWorkspace(): Workspace {
	return {
		groups: [{ id: "main", tabs: [], activeTabId: null }],
		activeGroupId: "main",
		splitRatio: SPLIT_RATIO.default,
	};
}

function newTab(target: TabTarget, init?: TabInit): Tab {
	const base = {
		id: uid(),
		composerDraft: init?.composerDraft ?? "",
		scrollTop: init?.scrollTop ?? null,
	};
	if (target.kind === "agent") {
		return { ...base, kind: "agent", agentId: target.agentId };
	}
	return {
		...base,
		kind: "session",
		sessionId: target.sessionId,
		rightPanel: init?.rightPanel ?? { open: false },
	};
}

export function getTabTarget(tab: Tab): TabTarget {
	return tab.kind === "agent"
		? { kind: "agent", agentId: tab.agentId }
		: { kind: "session", sessionId: tab.sessionId };
}

export function isTabFor(tab: Tab, target: TabTarget): boolean {
	if (target.kind === "agent") {
		return tab.kind === "agent" && tab.agentId === target.agentId;
	}
	return tab.kind === "session" && tab.sessionId === target.sessionId;
}

export function getActiveGroup(ws: Workspace): EditorGroup {
	return ws.groups.find((g) => g.id === ws.activeGroupId) ?? ws.groups[0];
}

/** The group that isn't active, if the workspace is split. */
export function getSideGroup(ws: Workspace): EditorGroup | undefined {
	return ws.groups.find((g) => g.id !== ws.activeGroupId);
}

/**
 * Whether `group` can show `target` without going over MAX_TABS_PER_GROUP: it already
 * has a tab for it, or has room for one more. No `target` = a brand-new tab (a new
 * session). No `group` = a side group that doesn't exist yet, so it will start empty.
 */
export function hasRoomFor(
	group: EditorGroup | undefined,
	target?: TabTarget,
): boolean {
	if (!group) return true;
	if (target && group.tabs.some((t) => isTabFor(t, target))) return true;
	return group.tabs.length < MAX_TABS_PER_GROUP;
}

export function getActiveTab(ws: Workspace): Tab | null {
	const group = getActiveGroup(ws);
	return group.tabs.find((t) => t.id === group.activeTabId) ?? null;
}

/** Whether the focused tab shows `target`, i.e. a `reveal` of it went through. */
export function isShowing(ws: Workspace, target: TabTarget): boolean {
	const tab = getActiveTab(ws);
	return tab !== null && isTabFor(tab, target);
}

export function getActiveTabRef(ws: Workspace): TabRef | null {
	const group = getActiveGroup(ws);
	const tab = getActiveTab(ws);
	return tab ? { groupId: group.id, tabId: tab.id } : null;
}

function mapGroup(
	ws: Workspace,
	groupId: string,
	fn: (g: EditorGroup) => EditorGroup,
): Workspace {
	return {
		...ws,
		groups: ws.groups.map((g) => (g.id === groupId ? fn(g) : g)),
	};
}

function insertAfterActive(group: EditorGroup, tab: Tab): EditorGroup {
	const index = group.tabs.findIndex((t) => t.id === group.activeTabId);
	const tabs = [...group.tabs];
	tabs.splice(index + 1, 0, tab); // index === -1 -> front
	return { ...group, tabs, activeTabId: tab.id };
}

export function focusTab(ws: Workspace, { groupId, tabId }: TabRef): Workspace {
	const group = ws.groups.find((g) => g.id === groupId);
	if (!group?.tabs.some((t) => t.id === tabId)) return ws;
	if (ws.activeGroupId === groupId && group.activeTabId === tabId) return ws;
	return {
		...mapGroup(ws, groupId, (g) => ({ ...g, activeTabId: tabId })),
		activeGroupId: groupId,
	};
}

/**
 * URL -> store. Must stay idempotent: it's what prevents sync loops.
 * 1. `hint` (history state) points at a live tab showing `target` -> focus exactly that.
 * 2. The active tab already shows it -> no-op.
 * 3. The active group has a tab for it -> focus it.
 * 4. Otherwise open a new tab in the active group, right after the current one.
 *    If the group is full, nothing changes: callers check `isShowing` and warn the user.
 */
export function reveal(
	ws: Workspace,
	target: TabTarget,
	hint?: TabRef,
	init?: TabInit,
): Workspace {
	if (hint) {
		const tab = ws.groups
			.find((g) => g.id === hint.groupId)
			?.tabs.find((t) => t.id === hint.tabId);
		if (tab && isTabFor(tab, target)) return focusTab(ws, hint);
	}
	const active = getActiveTab(ws);
	if (active && isTabFor(active, target)) return ws;
	const group = getActiveGroup(ws);
	const existing = group.tabs.find((t) => isTabFor(t, target));
	if (existing) return focusTab(ws, { groupId: group.id, tabId: existing.id });
	if (!hasRoomFor(group)) return ws;
	return mapGroup(ws, group.id, (g) =>
		insertAfterActive(g, newTab(target, init)),
	);
}

/** "Open to the side": target the other group, creating it if needed (max 2). No-op if it's full. */
export function openToSide(
	ws: Workspace,
	target: TabTarget,
	init?: TabInit,
): Workspace {
	let side = getSideGroup(ws);
	if (!hasRoomFor(side, target)) return ws;
	let next = ws;
	if (!side) {
		side = { id: uid(), tabs: [], activeTabId: null };
		// A new split starts even, like VSCode.
		next = {
			...ws,
			groups: [...ws.groups, side],
			splitRatio: SPLIT_RATIO.default,
		};
	}
	return reveal({ ...next, activeGroupId: side.id }, target, undefined, init);
}

export function splitActiveTab(ws: Workspace): Workspace {
	const tab = getActiveTab(ws);
	if (!tab) return ws;
	// Copy view state like VSCode, but not the draft: two composers with the same text is confusing.
	return openToSide(ws, getTabTarget(tab), {
		scrollTop: tab.scrollTop,
		rightPanel: tab.kind === "session" ? tab.rightPanel : undefined,
	});
}

export function closeTab(ws: Workspace, { groupId, tabId }: TabRef): Workspace {
	const group = ws.groups.find((g) => g.id === groupId);
	if (!group) return ws;
	const index = group.tabs.findIndex((t) => t.id === tabId);
	if (index === -1) return ws;
	const tabs = group.tabs.filter((t) => t.id !== tabId);

	if (tabs.length === 0 && ws.groups.length === 2) {
		const remaining = ws.groups.filter((g) => g.id !== groupId);
		return { ...ws, groups: remaining, activeGroupId: remaining[0].id };
	}
	// Neighbour for now; MRU order later.
	const activeTabId =
		group.activeTabId === tabId
			? (tabs[index]?.id ?? tabs[index - 1]?.id ?? null)
			: group.activeTabId;
	return mapGroup(ws, groupId, () => ({ ...group, tabs, activeTabId }));
}

export function focusGroup(ws: Workspace, groupId: string): Workspace {
	if (ws.activeGroupId === groupId || !ws.groups.some((g) => g.id === groupId))
		return ws;
	return { ...ws, activeGroupId: groupId };
}

export function updateTab(
	ws: Workspace,
	{ groupId, tabId }: TabRef,
	patch: TabPatch,
): Workspace {
	return mapGroup(ws, groupId, (g) => ({
		...g,
		tabs: g.tabs.map((t) => (t.id === tabId ? { ...t, ...patch } : t)),
	}));
}

export function setSplitRatio(ws: Workspace, ratio: number): Workspace {
	const next = Math.min(SPLIT_RATIO.max, Math.max(SPLIT_RATIO.min, ratio));
	return next === ws.splitRatio ? ws : { ...ws, splitRatio: next };
}
