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

/** A session file opened as an editor, to read it big or next to another session. */
export const FileTabSchema = TabBaseSchema.extend({
	kind: z.literal("file"),
	fileId: z.string(),
});

/*
 * A plain union, not a discriminated one: old session tabs have no `kind` to
 * discriminate on. Session last, since it accepts a missing `kind`.
 */
export const TabSchema = z.union([
	AgentTabSchema,
	FileTabSchema,
	SessionTabSchema,
]);

export const EditorGroupSchema = z.object({
	id: z.string(),
	tabs: z.array(TabSchema),
	activeTabId: z.string().nullable(),
	/** Tab ids, most recently focused first: picks which tab a full group gives up. */
	recent: z.array(z.string()).catch([]),
});

/**
 * How much the workspace may hold. They come from the user's layout settings
 * (settings.ts); ops take them as an argument so the model stays pure.
 */
export type Limits = {
	maxGroups: number;
	maxTabsPerGroup: number;
	/** "replace": a full group closes its least recently used tab. "warn": it refuses. */
	whenGroupFull: "replace" | "warn";
};

/** Narrowest a group gets, as a share of the workspace. */
export const MIN_GROUP_SIZE = 0.1;

export const WorkspaceSchema = z.object({
	groups: z.array(EditorGroupSchema).min(1),
	activeGroupId: z.string(),
	/**
	 * Each group's share of the workspace width, in group order. Anything that doesn't
	 * line up with `groups` (older saves, a bad value) reads as an even split.
	 */
	sizes: z.array(z.number()).catch([]),
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
export type FileTab = z.infer<typeof FileTabSchema>;
export type Tab = z.infer<typeof TabSchema>;
export type EditorGroup = z.infer<typeof EditorGroupSchema>;
export type Workspace = z.infer<typeof WorkspaceSchema>;
export type TabRef = { groupId: string; tabId: string };
/** What a tab shows. Two tabs with the same target show the same thing. */
export type TabTarget =
	| { kind: "session"; sessionId: string }
	| { kind: "agent"; agentId: string }
	| { kind: "file"; fileId: string };
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
		groups: [{ id: "main", tabs: [], activeTabId: null, recent: [] }],
		activeGroupId: "main",
		sizes: [1],
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
	if (target.kind === "file") {
		return { ...base, kind: "file", fileId: target.fileId };
	}
	return {
		...base,
		kind: "session",
		sessionId: target.sessionId,
		panes: init?.panes ?? DEFAULT_PANES,
	};
}

export function getTabTarget(tab: Tab): TabTarget {
	switch (tab.kind) {
		case "agent":
			return { kind: "agent", agentId: tab.agentId };
		case "file":
			return { kind: "file", fileId: tab.fileId };
		case "session":
			return { kind: "session", sessionId: tab.sessionId };
	}
}

export function isTabFor(tab: Tab, target: TabTarget): boolean {
	switch (target.kind) {
		case "agent":
			return tab.kind === "agent" && tab.agentId === target.agentId;
		case "file":
			return tab.kind === "file" && tab.fileId === target.fileId;
		case "session":
			return tab.kind === "session" && tab.sessionId === target.sessionId;
	}
}

export function getActiveGroup(ws: Workspace): EditorGroup {
	return ws.groups.find((g) => g.id === ws.activeGroupId) ?? ws.groups[0];
}

/** Each group's share of the width, summing to 1 (an even split if `sizes` is off). */
export function groupSizes(ws: Workspace): number[] {
	const n = ws.groups.length;
	const sizes = ws.sizes;
	if (sizes.length !== n || sizes.some((s) => !(s > 0))) {
		return ws.groups.map(() => 1 / n);
	}
	const total = sizes.reduce((a, b) => a + b, 0);
	return sizes.map((s) => s / total);
}

/**
 * Whether `group` can show `target`: it already has a tab for it, has room for one more,
 * or makes room by closing its least recently used tab. No `target` = a brand-new tab
 * (a new session). No `group` = a group that doesn't exist yet, so it will start empty.
 */
export function hasRoomFor(
	group: EditorGroup | undefined,
	target: TabTarget | undefined,
	limits: Limits,
): boolean {
	if (!group) return true;
	if (target && group.tabs.some((t) => isTabFor(t, target))) return true;
	return (
		group.tabs.length < limits.maxTabsPerGroup ||
		limits.whenGroupFull === "replace"
	);
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

/** Makes `tabId` the group's active tab and its most recent one. */
function activate(group: EditorGroup, tabId: string | null): EditorGroup {
	if (tabId === null) return { ...group, activeTabId: null };
	const recent =
		group.recent[0] === tabId
			? group.recent
			: [tabId, ...group.recent.filter((id) => id !== tabId)];
	return { ...group, activeTabId: tabId, recent };
}

function withoutTab(group: EditorGroup, tabId: string): EditorGroup {
	return {
		...group,
		tabs: group.tabs.filter((t) => t.id !== tabId),
		recent: group.recent.filter((id) => id !== tabId),
	};
}

/**
 * The tab a full group gives up: the least recently focused one, preferring tabs
 * without a composer draft (closing those loses nothing), never `keep`.
 */
function leastRecentTab(
	group: EditorGroup,
	keep?: string | null,
): Tab | undefined {
	const age = (t: Tab) => {
		const index = group.recent.indexOf(t.id);
		return index === -1 ? Number.POSITIVE_INFINITY : index;
	};
	const candidates = group.tabs.filter((t) => t.id !== keep);
	const clean = candidates.filter((t) => t.composerDraft.trim() === "");
	const pool = clean.length > 0 ? clean : candidates;
	// Oldest first; ties (never focused) go to the leftmost.
	return pool.reduce<Tab | undefined>(
		(oldest, t) => (oldest === undefined || age(t) > age(oldest) ? t : oldest),
		undefined,
	);
}

/**
 * Adds `tab` right after the active one and focuses it. A full group first closes its
 * least recently used tab; when that's the active tab (a one-tab group), the new tab
 * simply takes its place.
 */
function insertTab(group: EditorGroup, tab: Tab, limits: Limits): EditorGroup {
	let g = group;
	if (g.tabs.length >= limits.maxTabsPerGroup) {
		const victim = leastRecentTab(g);
		if (victim && victim.id === g.activeTabId) {
			const tabs = g.tabs.map((t) => (t.id === victim.id ? tab : t));
			return activate({ ...withoutTab(g, victim.id), tabs }, tab.id);
		}
		if (victim) g = withoutTab(g, victim.id);
	}
	const index = g.tabs.findIndex((t) => t.id === g.activeTabId);
	const tabs = [...g.tabs];
	tabs.splice(index + 1, 0, tab); // index === -1 -> front
	return activate({ ...g, tabs }, tab.id);
}

export function focusTab(ws: Workspace, { groupId, tabId }: TabRef): Workspace {
	const group = ws.groups.find((g) => g.id === groupId);
	if (!group?.tabs.some((t) => t.id === tabId)) return ws;
	if (ws.activeGroupId === groupId && group.activeTabId === tabId) return ws;
	return {
		...mapGroup(ws, groupId, (g) => activate(g, tabId)),
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
 *    A full group closes its least recently used tab first ("replace"), or nothing
 *    changes ("warn"): callers check `isShowing` and tell the user.
 */
export function reveal(
	ws: Workspace,
	target: TabTarget,
	hint: TabRef | undefined,
	init: TabInit | undefined,
	limits: Limits,
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
	if (!hasRoomFor(group, target, limits)) return ws;
	return mapGroup(ws, group.id, (g) =>
		insertTab(g, newTab(target, init), limits),
	);
}

/**
 * Where "open to the side" lands: the group right of the active one; else undefined
 * while a new group fits (it will be created); else the group to the left; with a
 * single group allowed, the active group itself.
 */
export function getSideGroup(
	ws: Workspace,
	limits: Limits,
): EditorGroup | undefined {
	const index = ws.groups.findIndex((g) => g.id === ws.activeGroupId);
	const right = ws.groups[index + 1];
	if (right) return right;
	if (ws.groups.length < limits.maxGroups) return undefined;
	return ws.groups[index - 1] ?? ws.groups[index];
}

/**
 * "Open to the side", as in VSCode: the group to the right of the active one. With no
 * group there, a new one splits off the active group while under `maxGroups`, else the
 * group to the left takes it. With one group allowed, it just opens here.
 * No-op if the target group is full (and doesn't replace).
 */
export function openToSide(
	ws: Workspace,
	target: TabTarget,
	init: TabInit | undefined,
	limits: Limits,
): Workspace {
	const index = ws.groups.findIndex((g) => g.id === ws.activeGroupId);
	let side = getSideGroup(ws, limits);
	let next = ws;
	if (!side) {
		side = { id: uid(), tabs: [], activeTabId: null, recent: [] };
		/*
		 * VSCode's "auto" split sizing: even groups stay even (all of them share the
		 * width again); once the user has resized, the new group halves the one it
		 * splits off and leaves the others alone.
		 */
		const sizes = groupSizes(ws);
		const isEven = sizes.every((s) => Math.abs(s - 1 / sizes.length) < 0.01);
		const half = sizes[index] / 2;
		next = {
			...ws,
			groups: spliced(ws.groups, index + 1, 0, side),
			sizes: isEven
				? [...sizes, 0].map(() => 1 / (sizes.length + 1))
				: spliced(sizes, index, 1, half, half),
		};
	}
	if (side.id === ws.activeGroupId)
		return reveal(ws, target, undefined, init, limits);
	if (!hasRoomFor(side, target, limits)) return ws;
	// Opening to the side means wanting both groups on screen: leave focus mode.
	return reveal(
		{ ...next, activeGroupId: side.id, maximizedGroupId: null },
		target,
		undefined,
		init,
		limits,
	);
}

export function splitActiveTab(ws: Workspace, limits: Limits): Workspace {
	const tab = getActiveTab(ws);
	if (!tab || limits.maxGroups <= 1) return ws;
	// Copy view state like VSCode, but not the draft: two composers with the same text is confusing.
	return openToSide(
		ws,
		getTabTarget(tab),
		{
			scrollTop: tab.scrollTop,
			panes: tab.kind === "session" ? tab.panes : undefined,
		},
		limits,
	);
}

export function closeTab(ws: Workspace, { groupId, tabId }: TabRef): Workspace {
	const group = ws.groups.find((g) => g.id === groupId);
	if (!group) return ws;
	const index = group.tabs.findIndex((t) => t.id === tabId);
	if (index === -1) return ws;
	const rest = withoutTab(group, tabId);

	if (rest.tabs.length === 0 && ws.groups.length > 1) {
		// An empty group closes; its width goes to its neighbour (left, else right).
		const groupIndex = ws.groups.indexOf(group);
		const neighbour = groupIndex > 0 ? groupIndex - 1 : 1;
		const sizes = groupSizes(ws);
		sizes[neighbour] += sizes[groupIndex];
		return {
			...ws,
			groups: spliced(ws.groups, groupIndex, 1),
			sizes: spliced(sizes, groupIndex, 1),
			activeGroupId:
				ws.activeGroupId === groupId
					? ws.groups[neighbour].id
					: ws.activeGroupId,
			maximizedGroupId:
				ws.maximizedGroupId === groupId ? null : ws.maximizedGroupId,
		};
	}
	// The neighbour takes focus; `recent` only decides what a full group gives up.
	const activeTabId =
		group.activeTabId === tabId
			? (rest.tabs[index]?.id ?? rest.tabs[index - 1]?.id ?? null)
			: group.activeTabId;
	return mapGroup(ws, groupId, () => activate(rest, activeTabId));
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

/**
 * Moves the divider after group `boundary`: that group gets `size` (a share of the
 * workspace) and the next one the rest of the pair's width. Other groups don't move.
 */
export function resizeGroups(
	ws: Workspace,
	boundary: number,
	size: number,
): Workspace {
	const sizes = groupSizes(ws);
	if (boundary < 0 || boundary >= sizes.length - 1) return ws;
	const pair = sizes[boundary] + sizes[boundary + 1];
	const left = Math.min(pair - MIN_GROUP_SIZE, Math.max(MIN_GROUP_SIZE, size));
	if (left === sizes[boundary] && ws.sizes.length === sizes.length) return ws;
	sizes[boundary] = left;
	sizes[boundary + 1] = pair - left;
	return { ...ws, sizes };
}

/** Evens out the two groups beside the divider after `boundary` (double-click). */
export function resetGroupSize(ws: Workspace, boundary: number): Workspace {
	const sizes = groupSizes(ws);
	if (boundary < 0 || boundary >= sizes.length - 1) return ws;
	return resizeGroups(
		ws,
		boundary,
		(sizes[boundary] + sizes[boundary + 1]) / 2,
	);
}

/**
 * Brings a workspace within `limits`, when the user lowers them (or on load, if the
 * saved workspace is bigger than they allow). Extra groups fold into the one on their
 * left, without duplicating tabs open there; then each group closes its least
 * recently used tabs, never its active one. Returns `ws` itself when it already fits.
 */
export function fitToLimits(ws: Workspace, limits: Limits): Workspace {
	let groups = ws.groups;
	let activeGroupId = ws.activeGroupId;
	while (groups.length > Math.max(1, limits.maxGroups)) {
		const last = groups[groups.length - 1];
		const into = groups[groups.length - 2];
		const moved = last.tabs.filter(
			(t) => !into.tabs.some((u) => isTabFor(u, getTabTarget(t))),
		);
		let merged: EditorGroup = {
			...into,
			tabs: [...into.tabs, ...moved],
			recent: [...into.recent, ...last.recent],
		};
		if (activeGroupId === last.id) {
			// Keep what the user was looking at on screen.
			const active = last.tabs.find((t) => t.id === last.activeTabId);
			const shown =
				active && merged.tabs.find((t) => isTabFor(t, getTabTarget(active)));
			if (shown) merged = activate(merged, shown.id);
			activeGroupId = into.id;
		}
		groups = [...groups.slice(0, -2), merged];
	}
	groups = groups.map((group) => {
		let g = group;
		while (g.tabs.length > Math.max(1, limits.maxTabsPerGroup)) {
			const victim = leastRecentTab(g, g.activeTabId);
			if (!victim) break;
			g = withoutTab(g, victim.id);
		}
		return g;
	});
	const unchanged =
		groups.length === ws.groups.length &&
		groups.every((g, i) => g === ws.groups[i]);
	if (unchanged) return ws;
	return {
		...ws,
		groups,
		activeGroupId,
		sizes: groups.length === ws.groups.length ? ws.sizes : [],
		maximizedGroupId: groups.some((g) => g.id === ws.maximizedGroupId)
			? ws.maximizedGroupId
			: null,
	};
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

/** `Array.prototype.toSpliced`, which our TS lib target doesn't include yet. */
function spliced<T>(
	array: readonly T[],
	start: number,
	deleteCount: number,
	...items: T[]
): T[] {
	const copy = [...array];
	copy.splice(start, deleteCount, ...items);
	return copy;
}
