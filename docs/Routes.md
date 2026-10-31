# Workspace routing design — agentic-ui (TanStack Start)

Fits the repo as it is today: TanStack Start 1.169, Router 1.170, Query 5, zod 4, the `AGENTS.md` conventions (`route.tsx` / `index.tsx`, `-route/`, `-index/`, `-shared/`, `#/` alias). Covers TanStack only, so there are no Server Components: data loads through route `loader`s and Query.

---

## 0. Assumptions and where I disagree with the brief

**Assumptions**

1. Max 2 groups, side by side. There is always at least one group, and it can be empty.
2. The Workspace store is client state, persisted to `localStorage` for now. It's written as pure functions over a `Workspace` value, so syncing it to the backend later only changes the storage layer.
3. Sessions are server data in TanStack Query. Streaming is owned per **session**, outside React (§3).
4. The client can create a session id (UUID v7) and the server accepts it on first send (`PUT /sessions/:id`). This keeps "New session" from leaving empty sessions on the server. If the backend can't do that, "New" calls `POST /sessions` first and nothing else changes.
5. "Selected agent" belongs to the **session**, as in your type. Changing it in one tab's composer changes it in the other tab too, and it takes effect on the next turn.
6. You want the same code to run as an Electron app and as a website. That's a strong reason to run Start in **SPA mode** (`spa: { enabled: true }`), or at least to render the workspace client-only. §4.4 has the details.

**Where I disagree with the brief**

| Brief | My proposal | Why |
|---|---|---|
| The side panel's content comes from the route (`/agents` → agent cards, etc.) | The **side panel view is client state** (`sidebar.view`). The activity bar's *view* icons (Sessions, Agents) switch the panel **without navigating**. Its *link* icons (Home, Settings) navigate. | You want switching activity to leave the tabs alone, like VSCode. If clicking "Agents" navigated to `/agents`, it would replace the conversation you're reading. In VSCode, clicking Explorer never closes your editor. |
| `/agents` = side panel cards + an empty main area | `/agents` = a full **agent gallery page** (search, filters). This is where Home's "View all agents" goes. The side panel's Agents view stays a quick list with a "Browse all" link. | An empty main area is a dead end. A real deep-linkable target for "view all" and "search agents" is more useful. |
| `/settings`: categories in the side panel | Settings is a page with its **own category nav inside the main area**, like VSCode's Settings editor with its table of contents. | It keeps one rule everywhere: the side panel never depends on the route. |
| `/sessions` = list in the side panel | `/sessions` is the workspace with no tab focused. If a tab is active, it **redirects** to `/sessions/$activeSessionId`. | It keeps one invariant: on a workspace route, the URL is always the focused tab. |

---

## 1. File / folder tree

A route group `(x)` is only for organizing files. It can't own a layout: the generator rejects `(x).tsx`, and its own error message says to use a pathless route instead. So the shell goes in a **pathless layout**. I suggest renaming `(authenticated)` → `_authenticated`, which also gives the auth guard a home (`beforeLoad`).

```
src/
├── routes/
│   ├── __root.tsx                         # (existing) <html>, providers, devtools. No UI chrome.
│   ├── -root/                             # (existing) devtools plugins, query context
│   │
│   └── _authenticated/
│       ├── route.tsx                      # PATHLESS LAYOUT: auth guard + <AppShell/>; prefetches side panel lists
│       ├── -route/                        # used only by route.tsx
│       │   ├── AppShell.tsx               # ActivityBar | SidePanel | MainArea
│       │   ├── ActivityBar.tsx            # view icons (sessions, agents) + link icons (home, settings)
│       │   ├── MainArea.tsx               # <Activity> Workspace (always mounted) + page <Outlet/>
│       │   ├── sidebar-store.ts           # { view, open, width } — persisted
│       │   └── SidePanel/
│       │       ├── index.tsx              # switches on sidebar.view; own Suspense boundary
│       │       ├── SessionsView.tsx       # all sessions, search, "New session"; highlights focused session
│       │       └── AgentsView.tsx         # agent cards; highlights the agent in the URL
│       │
│       ├── -shared/                       # used across this subtree (shell + sessions routes + home + agents)
│       │   ├── workspace/
│       │   │   ├── model.ts               # zod schemas + types + PURE ops (reveal, split, close, focus…)
│       │   │   ├── store.ts               # zustand + persist around model.ts
│       │   │   ├── commands.ts            # useWorkspaceCommands(): store op + navigate (the only writers of focus)
│       │   │   └── Workspace/
│       │   │       ├── index.tsx          # 1–2 <EditorGroup/>, resizable split, empty state
│       │   │       ├── EditorGroup.tsx    # tab bar + active <SessionView/>
│       │   │       ├── TabBar.tsx
│       │   │       └── SessionView/
│       │   │           ├── index.tsx      # header + messages + composer + right panel (per tab)
│       │   │           ├── Messages.tsx   # stick-to-bottom, per-tab scroll persistence
│       │   │           ├── Composer.tsx   # per-tab draft, agent picker, send disabled while running
│       │   │           └── RightPanel.tsx # files | agent | context
│       │   └── agents/AgentCard.tsx       # used by the side panel, the /agents gallery and Home
│       │
│       ├── (home)/
│       │   ├── index.tsx                  # "/" PAGE: action items, recent sessions, recent agents
│       │   └── -index/{ActionItems,RecentSessions,RecentAgents}.tsx
│       │
│       ├── sessions/
│       │   ├── route.tsx                  # staticData.main = "workspace"; renders <Outlet/> (children render null)
│       │   ├── index.tsx                  # /sessions — redirects to the active tab, else nothing (workspace empty state shows)
│       │   ├── new.tsx                    # /sessions/new?agentId&prompt&target — entry point: makes a draft, replaces the URL
│       │   └── $sessionId/
│       │       └── index.tsx              # /sessions/$id?messageId — loader validates; component reveals the tab
│       │
│       ├── agents/
│       │   ├── index.tsx                  # /agents?q&sort — gallery PAGE
│       │   └── $agentId/
│       │       ├── index.tsx              # /agents/$id?section — agent detail PAGE
│       │       └── -index/{AgentHeader,AgentSessions}.tsx
│       │
│       └── settings/
│           ├── route.tsx                  # settings layout PAGE: category nav + <Outlet/>
│           ├── index.tsx                  # redirect → /settings/general
│           └── $section/index.tsx         # params parsed with z.enum([...]); unknown → notFound()
│
└── lib/api/
    ├── types/session.ts, agent.ts         # zod schemas (per AGENTS.md)
    ├── sessions/
    │   ├── queries.ts                     # sessionQueryOptions, sessionMessagesQueryOptions, sessionsListQueryOptions
    │   ├── runs.ts                        # per-SESSION run registry (send, stream, resume, abort)
    │   └── drafts.ts                      # client-only "not yet created" sessions
    └── agents/queries.ts
```

### What each file renders and which layout it sits under

| Route | Layout chain | Main area | Side panel |
|---|---|---|---|
| `/` | root → `_authenticated` | **Page**: Home dashboard. Workspace hidden but still mounted. | unchanged (whatever view the user left) |
| `/sessions` | root → `_authenticated` → `sessions` | **Workspace** (empty state, or a redirect to the active tab) | unchanged |
| `/sessions/new` | same | Workspace. Renders `null`, creates a draft tab, replaces the URL. | unchanged |
| `/sessions/$sessionId` | same | **Workspace**. Renders `null`, reveals the tab. | unchanged; focused session highlighted |
| `/agents` | root → `_authenticated` | **Page**: gallery | unchanged |
| `/agents/$agentId` | root → `_authenticated` | **Page**: agent detail | unchanged; agent highlighted if the Agents view is open |
| `/settings/$section` | root → `_authenticated` → `settings` | **Page**: settings with in-page category nav | unchanged |

"Page" vs "workspace" is set per route with `staticData`, typed once:

```ts
// src/router.tsx (next to the Register declaration)
declare module "@tanstack/react-router" {
	interface StaticDataRouteOption {
		main?: "workspace" | "page"; // default: "page"
	}
	interface HistoryState {
		/** Which tab a history entry focused, so back/forward restore focus exactly (§4.2). */
		workspaceTab?: { groupId: string; tabId: string };
	}
}
```

---

## 2. Design questions

### Q1 — Non-workspace pages vs. the workspace: keep it mounted

**Facts about TanStack Router:** when you go from `/sessions/A` to `/agents/x`, the `sessions` route's component **unmounts** (its match leaves the tree). That's why the workspace must **not** be rendered by the `sessions` route. It is rendered by the **shell** (`_authenticated/route.tsx` → `MainArea`), which stays mounted for every authenticated route.

**Recommendation: keep the workspace mounted and hide it with React 19.2's `<Activity mode="hidden">`.** Page routes render through `<Outlet/>` on top of it.

- Kept while hidden: React state, DOM, the composer's undo history, and an open in-progress tool-call UI.
- `<Activity>` **runs effect cleanups while hidden**. So **nothing that must keep running can live in a component effect**, and streaming especially. That's why streams are owned by the run registry (§3), not by tabs. Once you design it this way, unmounting and remounting is also safe. Keeping the workspace mounted is a UX choice (no flash, no re-measuring), not something correctness depends on.
- Inside the workspace, **only each group's active tab is mounted**. Inactive tabs are just records in the store. Their scroll position and draft live in the store (they have to anyway, to survive a reload), so remounting restores them. This matches VSCode, which disposes editor widgets but keeps their view state. If tab switching ever feels slow, you can keep the last N tabs inside their own `<Activity>`.
- Scroll position: browsers don't reliably keep `scrollTop` for `display:none` subtrees, and lists virtualized while hidden measure 0. So `Messages` saves `scrollTop` per tab (throttled, `null` = stuck to bottom) and restores it in a layout effect when it becomes visible again. Skip any measuring or auto-scroll while hidden.
- Not-found and error: if the leaf match is `notFound` or `error`, `MainArea` switches to page mode so the error UI can be seen, even under `/sessions/*`.

### Q2 — Agent page: a page, not a tab (your instinct is right, with one caveat)

Options: (a) a page that replaces the main area, (b) a non-session tab in the workspace, (c) a panel or drawer.

**Recommend (a).**
- Your `Tab` is a view of a session. A polymorphic tab (`{kind:"session"} | {kind:"agent"}`) spreads into every op, the tab bar, split, "open to the side", persistence and URL sync, which would then need to know about `/agents/*` too. That's a lot of cost for a screen you browse briefly.
- The agent page is a **launchpad**: you read about the agent, look at its past sessions, and click "New session with this agent" → `/sessions/new?agentId=…`. Since the workspace stays mounted (Q1), going back to your chats is instant and loses nothing.
- Back/forward work naturally across pages and tabs.

**Caveat, and the case for (b):** VSCode's own "Extension details" opens *as an editor tab*. If users will want an agent's page **next to** a running session, that's the signal to move to (b). To keep that option cheap, the model's ops take a `Tab` without caring what's inside it except `sessionId`, and `Tab` is a zod schema you can turn into a discriminated union later.

### Q3 — Same session in two groups: yes, the shared cache keeps it simple

- `["sessions", id]` → session metadata (title, agentId, `runStatus`, pending approvals).
- `["sessions", id, "messages"]` → **committed** messages.
- Both tabs call `useQuery` with the same keys and so read one cache entry. Messages stay in sync for free.
- **Run status** = `session.runStatus === "running"` **or** a send mutation is pending for that session (`useIsMutating({ mutationKey: ["sessions", id, "send"] })`). Every tab showing the session disables Send. Keep a server-side 409 as the real lock.

**Pitfalls and how to handle them**

1. **Duplicate subscriptions.** Never open the stream in a tab's `useEffect`: two tabs would mean two streams, and `<Activity>` hiding a tab would kill it. A module-level **run registry** `Map<sessionId, Run>` owns the stream. `send()` starts it, and it runs until it finishes no matter which tabs are open. On cold load, if `runStatus === "running"`, the first observer calls `runs.resume(id)`, which does nothing if a stream is already attached.
2. **Token-rate writes into Query.** Calling `setQueryData` on every token re-runs structural sharing on the whole message array, and every observer re-renders. Keep the **in-flight assistant message in a small per-session external store** (`runs.get(id).partial`, read with `useSyncExternalStore`, batched per animation frame). Only when the stream ends, commit to the messages cache once (or invalidate).
3. **A refetch overwriting the stream.** A refetch on window focus or remount during a run can replace optimistic or partial state with an older server snapshot. While a run is active, `cancelQueries` before you write, and turn off refetch for that key (`enabled`/`refetchOnWindowFocus` driven by run status).
4. **Optimistic updates.** Tab A sends: insert the user message with a **client-generated message id** into the shared cache, so tab B sees it too, which is correct. Reconcile by id. Clear **only tab A's** draft, and only after the mutation is accepted, so a failed send keeps the text.
5. **Garbage collection.** If both tabs close mid-run, there are no observers and `gcTime` can evict the cache. The registry writes through `queryClient`, and on finish it invalidates. If nobody is observing by then, the data just refetches the next time someone opens the session.
6. **Scroll-to-bottom.** "Stick to bottom" is **per tab** (it's view state). Each tab auto-scrolls on new tokens only if *that* tab was at the bottom. Hidden tabs don't scroll.
7. **Agent change mid-session.** It's session data, so changing it in tab A changes tab B's picker too. Show it as a session event in the message list so it doesn't surprise anyone. If you'd rather choose the agent per message, put `pendingAgentId` in `Tab` next to `composerDraft`.

> If you later use the AI SDK's React hooks on the frontend: a registry of one `Chat` instance per `sessionId`, passed to `useChat({ chat })` in each tab, does the same job (shared messages and status, one stream). The rule stays the same: **one owner per session, many views.**

### Q4 — URL ↔ Workspace sync without loops

**Rule: focus changes only through two idempotent paths that meet in the middle.**

```
user action (click tab, open to side, split, close)
   └─► commands.ts: 1) apply store op   2) navigate to the *resulting* focused session
                                              (with history state {groupId, tabId})
URL change (link, back/forward, deep link, cold load)
   └─► /sessions/$id component: workspace.reveal(id, location.state.workspaceTab)
                                     └─ if already focused → NO-OP (returns the same state)
```

- **The store never navigates. The route never navigates** (except the `/sessions` and `/sessions/new` redirects, which use `replace`). So there's no loop: after a command has updated the store, the route's `reveal` finds the target already focused and does nothing.
- **`reveal(id, hint)`**:
  1. If `hint` (history state) points to a tab that still exists and shows `id` → focus exactly that group and tab. This makes back/forward restore the right **group**. Without it, Back to `/sessions/A` while group 2 is focused would open a second copy of A in group 2.
  2. If the active group's active tab is `id` → no-op.
  3. If the active group has a tab for `id` → focus it.
  4. Otherwise → open a new tab in the active group, after the current tab. (That's your rule.)
- **Where to call it:** in the leaf route **component** (`useLayoutEffect` keyed on `sessionId`). **Don't** call it from `beforeLoad` or `loader`: with `defaultPreload: "intent"` (already in your `router.tsx`) those run **on hover**, which would open tabs on mouse-over, and they also run on the server. Route `onEnter`/`onStay` also work in SPA mode, because they only fire for committed navigations.
- **Push vs replace:** explicit opens and tab clicks **push**, so Back walks your focus history the way VSCode's "Go Back" does. Derived changes **replace**: closing the focused tab, a group being removed, `/sessions` → active tab, `/sessions/new` → `/sessions/$id`.
- **Close tab while on a page route** (e.g. from the side panel's context menu while on `/agents/x`): apply the store op and don't navigate. The command only navigates when the current match is in workspace mode.
- **Back to a session whose tab was closed:** `reveal` reopens it in the active group, much like VSCode reopening an editor from history. That's acceptable and predictable.

**Cold load of `/sessions/X` when the persisted workspace doesn't have X**
1. On the client, zustand `persist` rehydrates **synchronously** from `localStorage` when the store is created, and the result is validated with zod (bad data → fresh workspace).
2. The loader runs `ensureQueryData(sessionQueryOptions(X))` (local drafts first, then the server). A 404 → `notFound()` → the main area shows a page-mode "Session not found". **No tab is created.**
3. If X exists, the component runs `reveal(X)` → appends a tab to the persisted active group and focuses it. The other persisted tabs come back exactly as they were.
4. Persisted tabs pointing at sessions that were deleted elsewhere load lazily and show an inline "Session not found · Close tab" message. Don't validate every tab up front.

### Q5 — Layouts and independent data loading

- **Shell** = `_authenticated/route.tsx`. It renders `ActivityBar`, `SidePanel` and `MainArea`, and its `loader` fires `prefetchQuery` (not awaited) for the side panel lists, so navigation is never blocked on them.
- **Side panel** is outside the `<Outlet/>`. It reads its own queries (`useSuspenseQuery`) behind **its own Suspense boundary**. It doesn't depend on route loaders, and navigation never re-suspends it.
- **Main area:**
  - Page routes load their data in their `loader` (`ensureQueryData` for what the page needs to show at all, `prefetchQuery` for secondary sections) and read it with `useSuspenseQuery`. Home gives each of its three sections its own Suspense, so they arrive independently.
  - Workspace tabs **aren't routes**, so they fetch inside `SessionView` (`useQuery`/`useSuspenseQuery`). The `$sessionId` loader only warms and validates the **focused** session.
- **Highlighting** without coupling: `SessionsView` highlights `getActiveTab(workspace)?.sessionId`. `AgentsView` highlights `useParams({ strict: false }).agentId`.

---

## 3. Search params and params (zod 4 = Standard Schema, so pass it straight to `validateSearch`)

| Route | Schema | Purpose |
|---|---|---|
| `/sessions/new` | `{ agentId?: string; prompt?: string; target?: "active" \| "side" }` | Entry point used by Home, agent pages and external deep links. Read once, then **replaced away**. |
| `/sessions/$sessionId` | `{ messageId?: string }` | Deep link to a message (e.g. an action item → the pending approval). The tab scrolls to it once, then the param is replaced away. |
| `/agents` | `{ q?: string; sort?: "recent" \| "name" }` with `.catch()` defaults | Shareable gallery search |
| `/agents/$agentId` | `{ section?: "overview" \| "sessions" }`, default `"overview"` | Detail sections |
| `/settings/$section` | `params.parse: z.enum(["general","models","appearance","shortcuts"])` | Unknown section → `notFound()` |

Don't put workspace state in search params. Only one-shot *commands* (`target`, `prompt`, `messageId`) go there, and they're removed right after they run, so reloading or sharing a URL can't run them twice.

```ts
// routes/_authenticated/sessions/new.tsx
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useLayoutEffect } from "react";
import { z } from "zod";
import { createDraftSession } from "#/lib/api/sessions/drafts";
import { useWorkspace } from "../-shared/workspace/store";

export const Route = createFileRoute("/_authenticated/sessions/new")({
	validateSearch: z.object({
		agentId: z.string().optional(),
		prompt: z.string().optional(),
		target: z.enum(["active", "side"]).default("active"),
	}),
	component: NewSession, // NOT beforeLoad: preload-on-hover would create drafts
});

function NewSession() {
	const search = Route.useSearch();
	const navigate = useNavigate();
	useLayoutEffect(() => {
		const sessionId = createDraftSession({ agentId: search.agentId });
		const { open, openToSide } = useWorkspace.getState();
		search.target === "side"
			? openToSide(sessionId, { draft: search.prompt })
			: open(sessionId, { draft: search.prompt });
		navigate({ to: "/sessions/$sessionId", params: { sessionId }, replace: true });
	}, []); // runs once per entry
	return null;
}
```

---

## 4. Code sketches

### 4.1 App shell

```tsx
// routes/_authenticated/route.tsx
import { createFileRoute } from "@tanstack/react-router";
import { agentsListQueryOptions } from "#/lib/api/agents/queries";
import { sessionsListQueryOptions } from "#/lib/api/sessions/queries";
import { AppShell } from "./-route/AppShell";

export const Route = createFileRoute("/_authenticated")({
	beforeLoad: ({ context, location }) => {
		// auth guard goes here, e.g. throw redirect({ to: "/login", search: { redirect: location.href } })
	},
	loader: ({ context: { queryClient } }) => {
		// fire-and-forget: the side panel suspends on its own, navigation never waits for it
		void queryClient.prefetchQuery(sessionsListQueryOptions());
		void queryClient.prefetchQuery(agentsListQueryOptions());
	},
	component: AppShell,
});
```

```tsx
// routes/_authenticated/-route/AppShell.tsx
import { ActivityBar } from "./ActivityBar";
import { MainArea } from "./MainArea";
import { SidePanel } from "./SidePanel";

export function AppShell() {
	return (
		<div className="flex h-dvh overflow-hidden">
			<ActivityBar />
			<SidePanel />
			<MainArea />
		</div>
	);
}
```

```tsx
// routes/_authenticated/-route/MainArea.tsx
import { ClientOnly, Outlet, useMatches } from "@tanstack/react-router";
import { Activity } from "react";
import { Workspace } from "../-shared/workspace/Workspace";

export function MainArea() {
	const mode = useMatches({
		select: (matches) => {
			const leaf = matches.at(-1);
			if (leaf?.status === "notFound" || leaf?.status === "error") return "page";
			return matches.some((m) => m.staticData.main === "workspace") ? "workspace" : "page";
		},
	});

	return (
		<main className="relative min-w-0 flex-1">
			{/* Always mounted: survives /, /agents/*, /settings/*. Client-only because it lives in localStorage. */}
			<ClientOnly>
				<Activity mode={mode === "workspace" ? "visible" : "hidden"}>
					<Workspace />
				</Activity>
			</ClientOnly>

			{/* Workspace routes render null here (they only sync); page routes render their page on top. */}
			{mode === "page" ? (
				<div className="absolute inset-0 overflow-auto bg-background">
					<Outlet />
				</div>
			) : (
				<Outlet />
			)}
		</main>
	);
}
```

```tsx
// routes/_authenticated/-route/ActivityBar.tsx (gist)
// "view" items switch the side panel (client state, no navigation). Clicking the active one collapses it, as in VSCode.
// "link" items navigate.
const items = [
	{ kind: "link", id: "home", to: "/", icon: HomeIcon, label: "Home" },
	{ kind: "view", id: "sessions", icon: MessagesIcon, label: "Sessions" },
	{ kind: "view", id: "agents", icon: BotIcon, label: "Agents" },
	{ kind: "link", id: "settings", to: "/settings", icon: SettingsIcon, label: "Settings" },
] as const;
// view onClick: sidebar.toggleView(id)   → open + set view, or collapse if already the active view
// every icon button is wrapped in a Tooltip (AGENTS.md UX rule)
```

```tsx
// routes/_authenticated/sessions/route.tsx
export const Route = createFileRoute("/_authenticated/sessions")({
	staticData: { main: "workspace" },
	// no component: renders <Outlet/> by default, and the children render null
});

// routes/_authenticated/sessions/$sessionId/index.tsx
export const Route = createFileRoute("/_authenticated/sessions/$sessionId/")({
	validateSearch: z.object({ messageId: z.string().optional() }),
	loader: ({ context: { queryClient }, params }) =>
		queryClient.ensureQueryData(sessionQueryOptions(params.sessionId)), // queryFn throws notFound() on 404
	component: RevealSession,
});

function RevealSession() {
	const { sessionId } = Route.useParams();
	const hint = useRouterState({ select: (s) => s.location.state.workspaceTab });
	useLayoutEffect(() => {
		useWorkspace.getState().reveal(sessionId, hint); // idempotent: the loop breaker
	}, [sessionId, hint]);
	return null;
}

// routes/_authenticated/sessions/index.tsx — keep "URL = focused tab"
function SessionsIndex() {
	const navigate = useNavigate();
	const active = useWorkspace((s) => getActiveTab(s)?.sessionId);
	useLayoutEffect(() => {
		if (active) navigate({ to: "/sessions/$sessionId", params: { sessionId: active }, replace: true });
	}, [active, navigate]);
	return null; // the Workspace shows its own empty state
}
```

### 4.2 Workspace store

**Pure model** (easy to unit test, and doesn't depend on where it's stored):

```ts
// routes/_authenticated/-shared/workspace/model.ts
import { z } from "zod";

export const TabSchema = z.object({
	id: z.string(),
	sessionId: z.string(),
	composerDraft: z.string(),
	rightPanel: z.object({
		open: z.boolean(),
		section: z.enum(["files", "agent", "context"]).optional(),
	}),
	scrollTop: z.number().nullable(), // null = stick to bottom
});
export const EditorGroupSchema = z.object({
	id: z.string(),
	tabs: z.array(TabSchema),
	activeTabId: z.string().nullable(),
});
export const WorkspaceSchema = z.object({
	groups: z.array(EditorGroupSchema).min(1).max(2),
	activeGroupId: z.string(),
});

export type Tab = z.infer<typeof TabSchema>;
export type EditorGroup = z.infer<typeof EditorGroupSchema>;
export type Workspace = z.infer<typeof WorkspaceSchema>;
export type TabRef = { groupId: string; tabId: string };

const uid = () => crypto.randomUUID();

export const emptyWorkspace = (): Workspace => {
	const id = uid();
	return { groups: [{ id, tabs: [], activeTabId: null }], activeGroupId: id };
};

const newTab = (sessionId: string, from?: Partial<Tab>): Tab => ({
	id: uid(),
	sessionId,
	composerDraft: from?.composerDraft ?? "",
	rightPanel: from?.rightPanel ?? { open: false },
	scrollTop: from?.scrollTop ?? null,
});

export const getActiveGroup = (ws: Workspace): EditorGroup =>
	ws.groups.find((g) => g.id === ws.activeGroupId) ?? ws.groups[0];

export const getActiveTab = (ws: Workspace): Tab | null => {
	const g = getActiveGroup(ws);
	return g.tabs.find((t) => t.id === g.activeTabId) ?? null;
};

const mapGroup = (ws: Workspace, groupId: string, fn: (g: EditorGroup) => EditorGroup): Workspace => ({
	...ws,
	groups: ws.groups.map((g) => (g.id === groupId ? fn(g) : g)),
});

const insertAfterActive = (g: EditorGroup, tab: Tab): EditorGroup => {
	const i = g.tabs.findIndex((t) => t.id === g.activeTabId);
	const tabs = [...g.tabs];
	tabs.splice(i + 1, 0, tab); // i === -1 → front; append instead if you prefer
	return { ...g, tabs, activeTabId: tab.id };
};

export function focusTab(ws: Workspace, { groupId, tabId }: TabRef): Workspace {
	const g = ws.groups.find((x) => x.id === groupId);
	if (!g?.tabs.some((t) => t.id === tabId)) return ws;
	if (ws.activeGroupId === groupId && g.activeTabId === tabId) return ws;
	return { ...mapGroup(ws, groupId, (x) => ({ ...x, activeTabId: tabId })), activeGroupId: groupId };
}

/** URL → store. Must stay idempotent: it's what prevents sync loops. */
export function reveal(ws: Workspace, sessionId: string, hint?: TabRef, init?: Partial<Tab>): Workspace {
	if (hint) {
		const t = ws.groups.find((g) => g.id === hint.groupId)?.tabs.find((x) => x.id === hint.tabId);
		if (t?.sessionId === sessionId) return focusTab(ws, hint);
	}
	if (getActiveTab(ws)?.sessionId === sessionId) return ws;
	const group = getActiveGroup(ws);
	const existing = group.tabs.find((t) => t.sessionId === sessionId);
	if (existing) return focusTab(ws, { groupId: group.id, tabId: existing.id });
	return mapGroup(ws, group.id, (g) => insertAfterActive(g, newTab(sessionId, init)));
}

/** "Open to the side" and "Split": target the other group, creating it if needed (max 2). */
export function openToSide(ws: Workspace, sessionId: string, init?: Partial<Tab>): Workspace {
	let side = ws.groups.find((g) => g.id !== ws.activeGroupId);
	let next = ws;
	if (!side) {
		side = { id: uid(), tabs: [], activeTabId: null };
		next = { ...ws, groups: [...ws.groups, side] }; // to the right
	}
	return reveal({ ...next, activeGroupId: side.id }, sessionId, undefined, init);
}

export function splitActiveTab(ws: Workspace): Workspace {
	const tab = getActiveTab(ws);
	if (!tab) return ws;
	// Copy the view state the way VSCode does. The draft does NOT copy: two composers holding the same text is confusing.
	return openToSide(ws, tab.sessionId, { rightPanel: tab.rightPanel, scrollTop: tab.scrollTop });
}

export function closeTab(ws: Workspace, { groupId, tabId }: TabRef): Workspace {
	const g = ws.groups.find((x) => x.id === groupId);
	if (!g) return ws;
	const i = g.tabs.findIndex((t) => t.id === tabId);
	if (i === -1) return ws;
	const tabs = g.tabs.filter((t) => t.id !== tabId);

	if (tabs.length === 0 && ws.groups.length === 2) {
		const remaining = ws.groups.filter((x) => x.id !== groupId);
		return { groups: remaining, activeGroupId: remaining[0].id }; // the group is removed
	}
	const activeTabId =
		g.activeTabId === tabId ? (tabs[i]?.id ?? tabs[i - 1]?.id ?? null) : g.activeTabId; // neighbour (MRU later)
	return mapGroup(ws, groupId, () => ({ ...g, tabs, activeTabId }));
}

export const focusGroup = (ws: Workspace, groupId: string): Workspace =>
	ws.activeGroupId === groupId || !ws.groups.some((g) => g.id === groupId) ? ws : { ...ws, activeGroupId: groupId };

export const updateTab = (ws: Workspace, { groupId, tabId }: TabRef, patch: Partial<Omit<Tab, "id" | "sessionId">>): Workspace =>
	mapGroup(ws, groupId, (g) => ({ ...g, tabs: g.tabs.map((t) => (t.id === tabId ? { ...t, ...patch } : t)) }));
```

**Store** (zustand + persist. It's a new dependency, so it needs a reason under your `AGENTS.md`: persist + `getState()` outside React is exactly the hard part here, and `@tanstack/store` has no persistence):

```ts
// routes/_authenticated/-shared/workspace/store.ts
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import * as M from "./model";

type Actions = {
	reveal: (sessionId: string, hint?: M.TabRef) => void;
	open: (sessionId: string, init?: { draft?: string }) => void;
	openToSide: (sessionId: string, init?: { draft?: string }) => void;
	splitActiveTab: () => void;
	closeTab: (ref: M.TabRef) => void;
	focusTab: (ref: M.TabRef) => void;
	focusGroup: (groupId: string) => void;
	updateTab: (ref: M.TabRef, patch: Partial<Omit<M.Tab, "id" | "sessionId">>) => void;
};

// Each op returns the SAME object when nothing changed → zustand skips notifying → no re-render, no loop.
const apply = (fn: (ws: M.Workspace) => M.Workspace) => (s: M.Workspace & Actions) => {
	const next = fn(s);
	return next === s ? s : { groups: next.groups, activeGroupId: next.activeGroupId };
};

export const useWorkspace = create<M.Workspace & Actions>()(
	persist(
		(set) => ({
			...M.emptyWorkspace(),
			reveal: (id, hint) => set(apply((ws) => M.reveal(ws, id, hint))),
			open: (id, init) => set(apply((ws) => M.reveal(ws, id, undefined, { composerDraft: init?.draft }))),
			openToSide: (id, init) => set(apply((ws) => M.openToSide(ws, id, { composerDraft: init?.draft }))),
			splitActiveTab: () => set(apply(M.splitActiveTab)),
			closeTab: (ref) => set(apply((ws) => M.closeTab(ws, ref))),
			focusTab: (ref) => set(apply((ws) => M.focusTab(ws, ref))),
			focusGroup: (id) => set(apply((ws) => M.focusGroup(ws, id))),
			updateTab: (ref, patch) => set(apply((ws) => M.updateTab(ws, ref, patch))),
		}),
		{
			name: "agentic-ui:workspace",
			version: 1,
			storage: createJSONStorage(() => localStorage), // swap for a debounced or backend storage later
			partialize: ({ groups, activeGroupId }) => ({ groups, activeGroupId }),
			merge: (persisted, current) => {
				const parsed = M.WorkspaceSchema.safeParse(persisted);
				return parsed.success ? { ...current, ...parsed.data } : current; // bad data → fresh workspace
			},
		},
	),
);
```

> Drafts change on every keystroke, and `persist` serializes the whole state on every `set`. Either wrap the storage with a ~300 ms debounced `setItem`, or keep the draft in `Composer`'s local state and flush it to the store on a debounce and on unmount.

**Commands** (the only place user actions change focus: store op first, then navigate):

```ts
// routes/_authenticated/-shared/workspace/commands.ts
import { useRouter } from "@tanstack/react-router";
import { getActiveGroup, getActiveTab, type TabRef } from "./model";
import { useWorkspace } from "./store";

export function useWorkspaceCommands() {
	const router = useRouter();

	const isWorkspaceRoute = () =>
		router.state.matches.some((m) => m.staticData.main === "workspace");

	/** Point the URL at whatever is now focused. The route's reveal() will then be a no-op. */
	const syncUrl = (replace: boolean) => {
		const ws = useWorkspace.getState();
		const tab = getActiveTab(ws);
		if (!tab) return router.navigate({ to: "/sessions", replace });
		return router.navigate({
			to: "/sessions/$sessionId",
			params: { sessionId: tab.sessionId },
			state: (prev) => ({ ...prev, workspaceTab: { groupId: getActiveGroup(ws).id, tabId: tab.id } }),
			replace,
		});
	};

	const ws = useWorkspace.getState;
	return {
		/** Side panel, Home, search: just navigate. The route applies your rule (focus in the active group, else open). */
		openSession: (sessionId: string) =>
			router.navigate({ to: "/sessions/$sessionId", params: { sessionId } }),
		openToSide: (sessionId: string) => { ws().openToSide(sessionId); syncUrl(false); },
		splitActiveTab: () => { ws().splitActiveTab(); syncUrl(false); },
		focusTab: (ref: TabRef) => { ws().focusTab(ref); syncUrl(false); },
		focusGroup: (groupId: string) => { ws().focusGroup(groupId); syncUrl(true); },
		closeTab: (ref: TabRef) => {
			const before = getActiveTab(ws())?.id;
			ws().closeTab(ref);
			// Only fix the URL if focus actually moved and the workspace is what's on screen.
			if (isWorkspaceRoute() && getActiveTab(ws())?.id !== before) syncUrl(true);
		},
	};
}
```

Side panel items render `<Link to="/sessions/$sessionId" params={{ sessionId }}>`. You get preload-on-intent (the loader warms the cache when you hover) and normal link semantics. Ctrl/Cmd-click → `openToSide` (VSCode uses Ctrl+Enter or Alt-click).

### 4.3 Per-session runs (gist)

```ts
// lib/api/sessions/runs.ts
// One owner per session, many views.
type Run = { abort: AbortController; partial: PartialMessageStore };
const runs = new Map<string, Run>();

export const sessionRuns = {
	/** Starts the stream once. Writes partial tokens to `partial` (rAF-batched), commits to the Query cache on finish. */
	start(queryClient: QueryClient, sessionId: string, body: SendBody): void { /* … */ },
	resume(queryClient: QueryClient, sessionId: string): void { if (runs.has(sessionId)) return; /* … */ },
	abort(sessionId: string): void { runs.get(sessionId)?.abort.abort(); },
	subscribePartial(sessionId: string, cb: () => void): () => void { /* … */ },
};

export function useIsSessionRunning(sessionId: string) {
	const running = useQuery({ ...sessionQueryOptions(sessionId), select: (s) => s.runStatus === "running" }).data;
	const sending = useIsMutating({ mutationKey: ["sessions", sessionId, "send"] }) > 0;
	return Boolean(running) || sending; // disables Send in EVERY tab showing this session
}
```

### 4.4 SSR / Electron note

- Anything read from `localStorage` (workspace, sidebar open/width) differs between the server render and the client, and a module-level zustand store **on the server would be shared across requests**. So: the `Workspace` sits inside `<ClientOnly>` (as above), and the sidebar's open/width state either goes in a cookie (the way the shadcn sidebar does it) or is client-only too.
- Because the same code also ships inside Electron, where there's no server, **SPA mode** is the simplest overall. The routing design above doesn't change. You only lose SSR for marketing-style pages, which this app doesn't have.

---

## 5. Things I'd add later (not needed now)

- MRU tab order per group, so closing a tab focuses the previously used one instead of the neighbour.
- Drag tabs between groups (`moveTab(from, toGroupId, index)`, which is another pure op).
- A full-page session browser (`/sessions/browse?q&agentId&status`) if the side panel list stops being enough. It would be a page route, not a workspace route.
- Syncing the workspace to the backend (cross-device): replace the `persist` storage. The model and the commands stay the same.