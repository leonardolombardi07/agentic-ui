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

/** The views a session can show beside (or over) its chat. Display data lives in the SessionView registry. */
export const PaneIdSchema = z.enum(["files", "agent", "context", "activity"]);

/** Panes stack in columns of this many; a new column starts on the right. */
export const PANES_PER_COLUMN = 2;

/**
 * Share of the group's width the docked panes take, by number of columns. Opening a
 * pane that adds a column widens the panes to at least this; closing one shrinks them back.
 */
export const PANES_SIZE_BY_COLUMNS = [0.38, 0.55] as const;

export const PANES_SIZE = { min: 0.2, max: 0.75 } as const;

export const PanesSchema = z.object({
	/** Whether the panes are shown. Closing hides them but keeps `views` for next time. */
	open: z.boolean(),
	/** Open panes, in the order they were opened (the grid's order). */
	views: z.array(PaneIdSchema),
	/** Open panes, most recently used first: the sheet shows the first one. */
	recent: z.array(PaneIdSchema),
	/** Share of the group's width when docked. */
	size: z.number(),
	/** The file the Files pane previews; null shows the list. */
	selectedFileId: z.string().nullable().default(null),
});

const DEFAULT_PANES: Panes = {
	open: false,
	views: [],
	recent: [],
	size: PANES_SIZE_BY_COLUMNS[0],
	selectedFileId: null,
};

export const SessionTabSchema = TabBaseSchema.extend({
	/** Defaulted so tabs saved before agent tabs existed still load. */
	kind: z.literal("session").default("session"),
	sessionId: z.string(),
	/*
	 * Per tab, not per session: two tabs on one session can show different panes, like
	 * two editors on one file. `.catch` so a pane id dropped from the enum only resets
	 * this tab's panes instead of the whole saved workspace.
	 */
	panes: PanesSchema.catch(() => DEFAULT_PANES),
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
	/**
	 * Focus mode: this group takes the whole main area (the other group and the side
	 * panel hide), so its session has room for docked panes. Always the active group.
	 */
	maximizedGroupId: z.string().nullable().default(null),
});

export type PaneId = z.infer<typeof PaneIdSchema>;
export type Panes = z.infer<typeof PanesSchema>;
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
	panes?: Panes;
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
		maximizedGroupId: null,
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
		panes: init?.panes ?? DEFAULT_PANES,
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
		maximizedGroupId: followFocus(ws, groupId),
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
	// Opening to the side means wanting both groups on screen: leave focus mode.
	let next: Workspace = { ...ws, maximizedGroupId: null };
	if (!side) {
		side = { id: uid(), tabs: [], activeTabId: null };
		// A new split starts even, like VSCode.
		next = {
			...next,
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
		panes: tab.kind === "session" ? tab.panes : undefined,
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
		return {
			...ws,
			groups: remaining,
			activeGroupId: remaining[0].id,
			maximizedGroupId:
				ws.maximizedGroupId === groupId ? null : ws.maximizedGroupId,
		};
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
	return {
		...ws,
		activeGroupId: groupId,
		maximizedGroupId: followFocus(ws, groupId),
	};
}

/**
 * Focus mode follows focus: a hidden group can't be the active one, so focusing it
 * (e.g. Back to a tab in it) maximizes it instead.
 */
function followFocus(ws: Workspace, groupId: string): string | null {
	return ws.maximizedGroupId === null ? null : groupId;
}

/** Enters focus mode on `groupId` (making it active), or leaves it. */
export function toggleMaximized(ws: Workspace, groupId: string): Workspace {
	if (!ws.groups.some((g) => g.id === groupId)) return ws;
	if (ws.maximizedGroupId === groupId) return { ...ws, maximizedGroupId: null };
	return { ...ws, activeGroupId: groupId, maximizedGroupId: groupId };
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

/* -------------------------------------------------------------------------- */
/* Panes: the views a session tab shows beside (or over) its chat.             */
/* -------------------------------------------------------------------------- */

/** How many columns `count` panes fill. */
export function paneColumnCount(count: number): number {
	return Math.ceil(count / PANES_PER_COLUMN);
}

/** The docked panes' starting share of the group for `columns` columns. */
export function defaultPanesSize(columns: number): number {
	const index = Math.min(columns, PANES_SIZE_BY_COLUMNS.length) - 1;
	return PANES_SIZE_BY_COLUMNS[Math.max(index, 0)];
}

function mapSessionTab(
	ws: Workspace,
	{ groupId, tabId }: TabRef,
	fn: (tab: SessionTab) => SessionTab,
): Workspace {
	const group = ws.groups.find((g) => g.id === groupId);
	const tab = group?.tabs.find((t) => t.id === tabId);
	if (!tab || tab.kind !== "session") return ws;
	const next = fn(tab);
	if (next === tab) return ws;
	return mapGroup(ws, groupId, (g) => ({
		...g,
		tabs: g.tabs.map((t) => (t.id === tabId ? next : t)),
	}));
}

function withPanes(tab: SessionTab, panes: Panes): SessionTab {
	return panes === tab.panes ? tab : { ...tab, panes };
}

function toFront(recent: PaneId[], id: PaneId): PaneId[] {
	return recent[0] === id ? recent : [id, ...recent.filter((v) => v !== id)];
}

/** Shows `id` (opening it if needed) and makes it the most recent. */
export function openPane(ws: Workspace, ref: TabRef, id: PaneId): Workspace {
	return mapSessionTab(ws, ref, (tab) => {
		const p = tab.panes;
		const isOpen = p.views.includes(id);
		const recent = toFront(p.recent, id);
		if (isOpen && p.open && recent === p.recent) return tab;
		const views = isOpen ? p.views : [...p.views, id];
		const columns = paneColumnCount(views.length);
		// A new column needs room: widen to its default, but never shrink what the user set.
		const size =
			columns > paneColumnCount(p.views.length)
				? Math.max(p.size, defaultPanesSize(columns))
				: p.size;
		return withPanes(tab, { ...p, open: true, views, recent, size });
	});
}

/** Removes `id`. Closing the last pane hides the panes. */
export function closePane(ws: Workspace, ref: TabRef, id: PaneId): Workspace {
	return mapSessionTab(ws, ref, (tab) => {
		const p = tab.panes;
		if (!p.views.includes(id)) return tab;
		const views = p.views.filter((v) => v !== id);
		const columns = paneColumnCount(views.length);
		// Losing a column gives its room back to the chat.
		const size =
			columns < paneColumnCount(p.views.length) && columns > 0
				? Math.min(p.size, defaultPanesSize(columns))
				: p.size;
		return withPanes(tab, {
			...p,
			open: views.length > 0 && p.open,
			views,
			recent: p.recent.filter((v) => v !== id),
			size,
		});
	});
}

/** Shows or hides all panes. Showing with none open opens `fallback`. */
export function setPanesOpen(
	ws: Workspace,
	ref: TabRef,
	open: boolean,
	fallback: PaneId,
): Workspace {
	const tab = findSessionTab(ws, ref);
	if (!tab) return ws;
	if (open && tab.panes.views.length === 0) return openPane(ws, ref, fallback);
	return mapSessionTab(ws, ref, (t) =>
		t.panes.open === open ? t : withPanes(t, { ...t.panes, open }),
	);
}

/** Using a pane (pointer or focus inside it) makes it the most recent. */
export function touchPane(ws: Workspace, ref: TabRef, id: PaneId): Workspace {
	return mapSessionTab(ws, ref, (tab) => {
		if (!tab.panes.views.includes(id)) return tab;
		const recent = toFront(tab.panes.recent, id);
		return recent === tab.panes.recent
			? tab
			: withPanes(tab, { ...tab.panes, recent });
	});
}

export function setPanesSize(
	ws: Workspace,
	ref: TabRef,
	size: number,
): Workspace {
	const next = Math.min(PANES_SIZE.max, Math.max(PANES_SIZE.min, size));
	return mapSessionTab(ws, ref, (tab) =>
		tab.panes.size === next
			? tab
			: withPanes(tab, { ...tab.panes, size: next }),
	);
}

function findSessionTab(ws: Workspace, ref: TabRef): SessionTab | undefined {
	const tab = ws.groups
		.find((g) => g.id === ref.groupId)
		?.tabs.find((t) => t.id === ref.tabId);
	return tab?.kind === "session" ? tab : undefined;
}

/** Shows `fileId` in the Files pane, opening the pane if needed. Null goes back to the list. */
export function selectFile(
	ws: Workspace,
	ref: TabRef,
	fileId: string | null,
): Workspace {
	const next = fileId === null ? ws : openPane(ws, ref, "files");
	return mapSessionTab(next, ref, (tab) =>
		tab.panes.selectedFileId === fileId
			? tab
			: withPanes(tab, { ...tab.panes, selectedFileId: fileId }),
	);
}
