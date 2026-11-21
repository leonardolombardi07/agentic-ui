import {
	mutationOptions,
	type QueryClient,
	queryOptions,
} from "@tanstack/react-query";
import type {
	AccessEntry,
	Destination,
	FolderContents,
	GroupInput,
	KnowledgeNode,
	KnowledgeSession,
	KnowledgeUser,
	Membership,
	MoveTarget,
	OpenFile,
	Passage,
	SearchHit,
	Space,
	SpaceAccess,
	SpaceRole,
	UploadEntry,
	VisibleSpace,
} from "@/lib/api/types/knowledge-base";
import { MEMBERSHIPS, ORGANIZATION_NAME, SPACES, USERS } from "./mock-data";
import {
	NODES,
	passagesOfText,
	SEED_CONTENT,
	SEED_PASSAGES,
} from "./mock-files";

/*
 * Mock backend until the real API exists. Only the query/mutation options are public.
 *
 * Authorization lives here, as it will on the server: every query returns only what the
 * acting user may see, each space already carrying their role, and every mutation checks
 * the role again. The UI never works out permissions on its own.
 */

const ROOT_KEY = "knowledge-base";

const spaces: Space[] = [...SPACES];
let memberships: Membership[] = [...MEMBERSHIPS];
let nodes: KnowledgeNode[] = [...NODES];

/** "View as": who the mock answers for. In memory only, so a reload is the signed-in user again. */
let actingUserId = USERS[0].id;

/** Upload id -> time its indexing ends. Uploads are not searchable until then. */
const indexingUntil = new Map<string, number>();
const INDEXING_MS = 5000;

/** The index: node id -> the file's passages. Uploads of text files are added as they come. */
const passages = new Map<string, Passage[]>(SEED_PASSAGES);

/** How many passages a search result shows, and how long each excerpt is. */
const PASSAGES_PER_HIT = 2;
const EXCERPT_LENGTH = 220;

/** The part of a passage around its first match, so a long passage shows why it matched. */
function excerpt(text: string, terms: string[]): string {
	if (text.length <= EXCERPT_LENGTH) return text;
	const lower = text.toLowerCase();
	const first = Math.min(
		...terms.map((term) => lower.indexOf(term)).filter((at) => at >= 0),
	);
	const start = Math.max(0, Math.min(first - 60, text.length - EXCERPT_LENGTH));
	const end = start + EXCERPT_LENGTH;
	return `${start > 0 ? "..." : ""}${text.slice(start, end).trim()}${end < text.length ? "..." : ""}`;
}

/** Upload id -> the uploaded file, kept in memory so it can be previewed. */
const uploads = new Map<string, File>();

/** Node id -> `blob:` URL of its content. Never revoked: the mock lives as long as the tab. */
const blobUrls = new Map<string, string>();

/**
 * Where a file's bytes are served. The real API will answer with a signed URL; the mock
 * hands out sample assets and `blob:` URLs, which only exist in the browser.
 */
function contentUrl(nodeId: string): { url: string; mimeType: string } {
	const seed = SEED_CONTENT.get(nodeId);
	if (seed?.type === "asset") return { url: seed.url, mimeType: "" };
	const upload = uploads.get(nodeId);
	const blob =
		upload ??
		new Blob([seed?.text ?? ""], { type: seed?.mimeType ?? "text/plain" });
	let url = blobUrls.get(nodeId);
	if (!url) {
		url = URL.createObjectURL(blob);
		blobUrls.set(nodeId, url);
	}
	return { url, mimeType: blob.type };
}

function delay(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

function actingUser(): KnowledgeUser {
	const user = USERS.find((u) => u.id === actingUserId);
	if (!user) throw new Error("Unknown user.");
	return user;
}

function directRole(userId: string, spaceId: string): SpaceRole | undefined {
	return memberships.find((m) => m.userId === userId && m.spaceId === spaceId)
		?.role;
}

/**
 * THE permission rule. The role a user has in a space and why, or undefined when they
 * must not even know the space exists.
 *
 * - A personal space is its owner's alone; not even superadmins see it.
 * - Superadmins manage everything else.
 * - Managers flow down: a department's manager manages its teams. Viewers do not flow
 *   down: reading a department does not open its teams.
 * - Belonging flows up: a member of a team reads its department, and everyone in the
 *   organization reads the company space.
 * - A restricted space stops every flow: only people added directly (and superadmins) get in.
 */
function resolveAccess(
	user: KnowledgeUser,
	space: Space,
): Pick<VisibleSpace, "role" | "roleSource"> | undefined {
	if (space.kind === "personal") {
		return space.ownerId === user.id
			? { role: "manager", roleSource: { type: "owner" } }
			: undefined;
	}
	if (user.organizationId !== space.organizationId) return undefined;
	if (user.isSuperadmin) {
		return { role: "manager", roleSource: { type: "superadmin" } };
	}

	const direct = directRole(user.id, space.id);
	if (direct === "manager") {
		return { role: "manager", roleSource: { type: "direct" } };
	}
	if (space.isRestricted) {
		return direct
			? { role: direct, roleSource: { type: "direct" } }
			: undefined;
	}

	const parent = space.parentId
		? spaces.find((s) => s.id === space.parentId)
		: undefined;
	if (parent && directRole(user.id, parent.id) === "manager") {
		return {
			role: "manager",
			roleSource: { type: "inherited", fromSpaceName: parent.name },
		};
	}
	if (direct) return { role: direct, roleSource: { type: "direct" } };

	if (space.kind === "company") {
		return { role: "viewer", roleSource: { type: "implicit" } };
	}
	if (space.kind === "department") {
		const isInATeam = spaces.some(
			(s) => s.parentId === space.id && directRole(user.id, s.id) !== undefined,
		);
		if (isInATeam) return { role: "viewer", roleSource: { type: "implicit" } };
	}
	return undefined;
}

function toVisible(
	space: Space,
	user: KnowledgeUser,
): VisibleSpace | undefined {
	const access = resolveAccess(user, space);
	return access ? { ...space, ...access } : undefined;
}

function visibleSpaces(): VisibleSpace[] {
	const user = actingUser();
	return spaces.flatMap((space) => toVisible(space, user) ?? []);
}

/** The space, if the acting user may see it. */
function findVisible(spaceId: string): VisibleSpace | undefined {
	const space = spaces.find((s) => s.id === spaceId);
	return space ? toVisible(space, actingUser()) : undefined;
}

/** For mutations. An invisible space reads as missing, so its existence never leaks. */
function requireManager(spaceId: string): VisibleSpace {
	const space = findVisible(spaceId);
	if (!space) throw new Error("That space doesn't exist or you can't see it.");
	if (space.role !== "manager") {
		throw new Error(`Only managers of ${space.name} can do that.`);
	}
	return space;
}

function canCreateGroups(user: KnowledgeUser): boolean {
	return (
		user.isSuperadmin ||
		spaces.some(
			(s) => s.kind === "department" && directRole(user.id, s.id) === "manager",
		)
	);
}

/** Reads the live index status: an upload is "indexing" for a few seconds. */
function withIndexStatus(node: KnowledgeNode): KnowledgeNode {
	if (node.kind === "folder") return node;
	const until = indexingUntil.get(node.id);
	return {
		...node,
		indexStatus:
			until !== undefined && until > Date.now() ? "indexing" : "indexed",
	};
}

/** Folders first, then by name. */
function compareNodes(a: KnowledgeNode, b: KnowledgeNode) {
	if (a.kind !== b.kind) return a.kind === "folder" ? -1 : 1;
	return a.name.localeCompare(b.name, undefined, { numeric: true });
}

/** The folder's ancestors and itself, outermost first. */
function pathOf(folderId: string | null): KnowledgeNode[] {
	const path: KnowledgeNode[] = [];
	let current = folderId ? nodes.find((n) => n.id === folderId) : undefined;
	while (current) {
		path.unshift(current);
		const parentId: string | null = current.parentId;
		current = parentId ? nodes.find((n) => n.id === parentId) : undefined;
	}
	return path;
}

/** The node and everything inside it. */
function subtreeIds(nodeId: string): Set<string> {
	const ids = new Set([nodeId]);
	let grew = true;
	while (grew) {
		grew = false;
		for (const node of nodes) {
			if (node.parentId && ids.has(node.parentId) && !ids.has(node.id)) {
				ids.add(node.id);
				grew = true;
			}
		}
	}
	return ids;
}

/** "Report.pdf" -> "Report (2).pdf" when the folder already has one. */
function freeName(destination: Destination, name: string, ignoreId?: string) {
	const taken = new Set(
		nodes
			.filter(
				(n) =>
					n.spaceId === destination.spaceId &&
					n.parentId === destination.parentId &&
					n.id !== ignoreId,
			)
			.map((n) => n.name.toLowerCase()),
	);
	if (!taken.has(name.toLowerCase())) return name;
	const dot = name.lastIndexOf(".");
	const stem = dot > 0 ? name.slice(0, dot) : name;
	const extension = dot > 0 ? name.slice(dot) : "";
	for (let i = 2; ; i += 1) {
		const candidate = `${stem} (${i})${extension}`;
		if (!taken.has(candidate.toLowerCase())) return candidate;
	}
}

/** A folder id only counts if it is a folder of that space; anything else means the root. */
function folderIn(spaceId: string, folderId: string | null): string | null {
	const folder = folderId
		? nodes.find(
				(n) =>
					n.id === folderId && n.spaceId === spaceId && n.kind === "folder",
			)
		: undefined;
	return folder ? folder.id : null;
}

/** Who is using the Knowledge Base. */
export function knowledgeSessionQueryOptions() {
	return queryOptions({
		queryKey: [ROOT_KEY, "session"],
		queryFn: async (): Promise<KnowledgeSession> => {
			await delay(80);
			const user = actingUser();
			return { user, canCreateGroups: canCreateGroups(user), personas: USERS };
		},
	});
}

/** Every space the user can see, each with their role. The company space comes first. */
export function spacesQueryOptions() {
	return queryOptions({
		queryKey: [ROOT_KEY, "spaces"],
		queryFn: async () => {
			await delay(120);
			return visibleSpaces();
		},
	});
}

/**
 * What a folder shows; `folderId` null is the root of the space. Resolves to null when the
 * user can't see the space (e.g. they were just removed from it), so the page can fall
 * back to another space instead of crashing. An unknown folder shows the root.
 */
export function folderQueryOptions(spaceId: string, folderId: string | null) {
	return queryOptions({
		queryKey: [ROOT_KEY, "folder", spaceId, folderId],
		queryFn: async (): Promise<FolderContents | null> => {
			await delay(150);
			const space = findVisible(spaceId);
			if (!space) return null;
			const parentId = folderIn(spaceId, folderId);
			return {
				space,
				path: pathOf(parentId).map((n) => ({ id: n.id, name: n.name })),
				nodes: nodes
					.filter((n) => n.spaceId === spaceId && n.parentId === parentId)
					.map(withIndexStatus)
					.sort(compareNodes),
			};
		},
		// Poll while an upload is being indexed, so its status flips without a reload.
		refetchInterval: (query) =>
			query.state.data?.nodes.some(
				(n) => n.kind === "file" && n.indexStatus === "indexing",
			)
				? 1500
				: false,
	});
}

/**
 * Search by name and content, across the spaces the user can see or inside one of them.
 * A file matches by its name and summary or by any one passage, and comes back with the
 * passages that matched. Files still being indexed are not found yet, exactly as agents
 * would not find them.
 */
export function knowledgeSearchQueryOptions(q: string, spaceId?: string) {
	return queryOptions({
		queryKey: [ROOT_KEY, "search", q, spaceId ?? null],
		queryFn: async (): Promise<SearchHit[]> => {
			await delay(200);
			const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
			if (terms.length === 0) return [];
			const visible = new Map(visibleSpaces().map((s) => [s.id, s]));
			const hits: SearchHit[] = [];
			for (const stored of nodes) {
				const space = visible.get(stored.spaceId);
				if (!space || (spaceId && space.id !== spaceId)) continue;
				const node = withIndexStatus(stored);
				if (node.kind === "file" && node.indexStatus === "indexing") continue;
				const haystack =
					`${node.name} ${node.kind === "file" ? node.summary : ""}`.toLowerCase();
				const matched = (passages.get(node.id) ?? []).filter((passage) => {
					const text = passage.text.toLowerCase();
					return terms.every((term) => text.includes(term));
				});
				const matchesByName = terms.every((term) => haystack.includes(term));
				if (!matchesByName && matched.length === 0) continue;
				hits.push({
					node,
					space,
					path: pathOf(node.parentId).map((n) => n.name),
					passages: matched.slice(0, PASSAGES_PER_HIT).map((passage) => ({
						...passage,
						text: excerpt(passage.text, terms),
					})),
				});
			}
			// Name matches read as more relevant than content matches.
			function nameScore(hit: SearchHit) {
				const name = hit.node.name.toLowerCase();
				return terms.filter((term) => name.includes(term)).length;
			}
			return hits.sort(
				(a, b) =>
					nameScore(b) - nameScore(a) ||
					b.node.updatedAt.localeCompare(a.node.updatedAt),
			);
		},
	});
}

/**
 * A file to open, with the URL of its bytes. Null when it doesn't exist or the user can't
 * see its space: the two are indistinguishable on purpose.
 */
export function openFileQueryOptions(nodeId: string) {
	return queryOptions({
		queryKey: [ROOT_KEY, "file", nodeId],
		queryFn: async (): Promise<OpenFile | null> => {
			await delay(120);
			const stored = nodes.find((n) => n.id === nodeId);
			if (!stored || stored.kind !== "file") return null;
			const space = findVisible(stored.spaceId);
			if (!space) return null;
			const node = withIndexStatus(stored);
			if (node.kind !== "file") return null;
			return {
				node,
				space,
				path: pathOf(node.parentId).map((n) => n.name),
				...contentUrl(node.id),
			};
		},
		// Poll while it is being indexed, like the folder it is in.
		refetchInterval: (query) =>
			query.state.data?.node.indexStatus === "indexing" ? 1500 : false,
	});
}

/** Who has access to a space and why. Null when the user can't see the space. */
export function spaceAccessQueryOptions(spaceId: string) {
	return queryOptions({
		queryKey: [ROOT_KEY, "access", spaceId],
		queryFn: async (): Promise<SpaceAccess | null> => {
			await delay(150);
			const space = findVisible(spaceId);
			if (!space) return null;
			const user = actingUser();
			if (space.kind === "personal") {
				return {
					space,
					entries: [{ type: "member", user, role: "manager" }],
					candidates: [],
					canSetRestricted: false,
				};
			}

			const entries: AccessEntry[] = [];
			const direct = memberships.filter((m) => m.spaceId === space.id);
			const directIds = new Set(direct.map((m) => m.userId));
			for (const role of ["manager", "viewer"] as const) {
				for (const membership of direct) {
					const member = USERS.find((u) => u.id === membership.userId);
					if (member && membership.role === role) {
						entries.push({ type: "member", user: member, role });
					}
				}
			}

			const parent = space.parentId
				? spaces.find((s) => s.id === space.parentId)
				: undefined;
			if (parent && !space.isRestricted) {
				for (const membership of memberships) {
					const manager = USERS.find((u) => u.id === membership.userId);
					if (
						manager &&
						membership.spaceId === parent.id &&
						membership.role === "manager" &&
						directRole(manager.id, space.id) !== "manager"
					) {
						entries.push({
							type: "inherited",
							user: manager,
							role: "manager",
							fromSpaceName: parent.name,
						});
					}
				}
			}

			if (!space.isRestricted && space.kind === "company") {
				entries.push({
					type: "audience",
					id: "everyone",
					label: `Everyone at ${ORGANIZATION_NAME}`,
					description: "All employees can read the company space",
					role: "viewer",
				});
			}
			if (
				!space.isRestricted &&
				space.kind === "department" &&
				spaces.some((s) => s.parentId === space.id)
			) {
				entries.push({
					type: "audience",
					id: "team-members",
					label: `Members of ${space.name} teams`,
					description: "Belonging to a team includes reading its department",
					role: "viewer",
				});
			}
			entries.push({
				type: "audience",
				id: "superadmins",
				label: "Superadmins",
				description: "Manage every space of the organization",
				role: "manager",
			});

			return {
				space,
				entries,
				candidates:
					space.role === "manager"
						? USERS.filter(
								(u) =>
									!directIds.has(u.id) &&
									u.organizationId === space.organizationId,
							)
						: [],
				canSetRestricted: user.isSuperadmin,
			};
		},
	});
}

/** The spaces the user manages, with their folders: everywhere content can be moved to. */
export function moveTargetsQueryOptions() {
	return queryOptions({
		queryKey: [ROOT_KEY, "move-targets"],
		queryFn: async (): Promise<MoveTarget[]> => {
			await delay(120);
			return visibleSpaces()
				.filter((space) => space.role === "manager")
				.map((space) => ({
					space,
					folders: nodes
						.filter((n) => n.spaceId === space.id && n.kind === "folder")
						.sort(compareNodes)
						.map((n) => ({ id: n.id, parentId: n.parentId, name: n.name })),
				}));
		},
	});
}

/*
 * Mutations. Every one refreshes the whole Knowledge Base: the mock is tiny, and a change
 * of access can change what any other query returns.
 */

function invalidateAll({ client }: { client: QueryClient }) {
	return client.invalidateQueries({ queryKey: [ROOT_KEY] });
}

/** Mock only: answer as another person, to see the Knowledge Base with their access. */
export function viewAsMutationOptions() {
	return mutationOptions({
		mutationKey: [ROOT_KEY, "view-as"],
		mutationFn: async (userId: string) => {
			await delay(100);
			if (!USERS.some((u) => u.id === userId)) throw new Error("Unknown user.");
			actingUserId = userId;
		},
		onSuccess: (_data, _userId, _onMutateResult, context) =>
			invalidateAll(context),
	});
}

export function createFolderMutationOptions() {
	return mutationOptions({
		mutationKey: [ROOT_KEY, "create-folder"],
		mutationFn: async (input: Destination & { name: string }) => {
			await delay(200);
			requireManager(input.spaceId);
			const destination = {
				spaceId: input.spaceId,
				parentId: folderIn(input.spaceId, input.parentId),
			};
			nodes.push({
				kind: "folder",
				id: crypto.randomUUID(),
				...destination,
				name: freeName(destination, input.name),
				updatedAt: new Date().toISOString(),
				updatedBy: actingUser().name,
			});
		},
		onSuccess: (_data, _input, _onMutateResult, context) =>
			invalidateAll(context),
	});
}

/** Adds files, recreating the folders they were dropped in. Resolves to how many were added. */
export function uploadMutationOptions() {
	return mutationOptions({
		mutationKey: [ROOT_KEY, "upload"],
		mutationFn: async (input: Destination & { entries: UploadEntry[] }) => {
			await delay(400);
			requireManager(input.spaceId);
			const root = folderIn(input.spaceId, input.parentId);
			const now = new Date().toISOString();
			const updatedBy = actingUser().name;

			for (const entry of input.entries) {
				let parentId = root;
				for (const folderName of entry.path) {
					const currentParentId = parentId;
					let folder = nodes.find(
						(n) =>
							n.kind === "folder" &&
							n.spaceId === input.spaceId &&
							n.parentId === currentParentId &&
							n.name === folderName,
					);
					if (!folder) {
						folder = {
							kind: "folder",
							id: crypto.randomUUID(),
							spaceId: input.spaceId,
							parentId,
							name: folderName,
							updatedAt: now,
							updatedBy,
						};
						nodes.push(folder);
					}
					parentId = folder.id;
				}
				const destination = { spaceId: input.spaceId, parentId };
				const id = crypto.randomUUID();
				nodes.push({
					kind: "file",
					id,
					...destination,
					name: freeName(destination, entry.name),
					size: entry.size,
					updatedAt: now,
					updatedBy,
					summary: "",
					indexStatus: "indexing",
				});
				indexingUntil.set(id, Date.now() + INDEXING_MS);
				uploads.set(id, entry.file);
				// The mock can only read plain text; the real indexer reads PDFs and Office files too.
				if (/\.(md|csv|txt)$/i.test(entry.name) && entry.size < 1024 * 1024) {
					passages.set(
						id,
						passagesOfText(id, entry.name, await entry.file.text()),
					);
				}
			}
			return input.entries.length;
		},
		onSuccess: (_count, _input, _onMutateResult, context) =>
			invalidateAll(context),
	});
}

/** Moves a file or folder. Crossing spaces needs the manager role on both sides. */
export function moveNodeMutationOptions() {
	return mutationOptions({
		mutationKey: [ROOT_KEY, "move"],
		mutationFn: async (input: Destination & { nodeId: string }) => {
			await delay(250);
			const node = nodes.find((n) => n.id === input.nodeId);
			if (!node) throw new Error("That item no longer exists.");
			requireManager(node.spaceId);
			requireManager(input.spaceId);
			const destination = {
				spaceId: input.spaceId,
				parentId: folderIn(input.spaceId, input.parentId),
			};
			const moved = subtreeIds(node.id);
			if (destination.parentId && moved.has(destination.parentId)) {
				throw new Error("A folder can't be moved into itself.");
			}
			const name = freeName(destination, node.name, node.id);
			nodes = nodes.map((n) => {
				if (n.id === node.id) return { ...n, ...destination, name };
				// What is inside a moved folder changes space with it.
				return moved.has(n.id) ? { ...n, spaceId: destination.spaceId } : n;
			});
		},
		onSuccess: (_data, _input, _onMutateResult, context) =>
			invalidateAll(context),
	});
}

export function renameNodeMutationOptions() {
	return mutationOptions({
		mutationKey: [ROOT_KEY, "rename"],
		mutationFn: async (input: { nodeId: string; name: string }) => {
			await delay(200);
			const node = nodes.find((n) => n.id === input.nodeId);
			if (!node) throw new Error("That item no longer exists.");
			requireManager(node.spaceId);
			const name = freeName(node, input.name, node.id);
			nodes = nodes.map((n) =>
				n.id === node.id
					? {
							...n,
							name,
							updatedAt: new Date().toISOString(),
							updatedBy: actingUser().name,
						}
					: n,
			);
		},
		onSuccess: (_data, _input, _onMutateResult, context) =>
			invalidateAll(context),
	});
}

/** Deletes a file, or a folder with everything in it. The variable is the node id. */
export function deleteNodeMutationOptions() {
	return mutationOptions({
		mutationKey: [ROOT_KEY, "delete"],
		mutationFn: async (nodeId: string) => {
			await delay(250);
			const node = nodes.find((n) => n.id === nodeId);
			if (!node) return;
			requireManager(node.spaceId);
			const removed = subtreeIds(node.id);
			nodes = nodes.filter((n) => !removed.has(n.id));
		},
		onSuccess: (_data, _nodeId, _onMutateResult, context) =>
			invalidateAll(context),
	});
}

/**
 * Adds a person to a space or changes their role; `role` null removes them. This is also
 * how managing is delegated: a manager makes someone else a manager.
 */
export function setMemberRoleMutationOptions() {
	return mutationOptions({
		mutationKey: [ROOT_KEY, "set-member-role"],
		mutationFn: async (input: {
			spaceId: string;
			userId: string;
			role: SpaceRole | null;
		}) => {
			await delay(200);
			const space = requireManager(input.spaceId);
			if (space.kind === "personal") {
				throw new Error("Personal files can't be shared.");
			}
			const others = memberships.filter(
				(m) => !(m.spaceId === space.id && m.userId === input.userId),
			);
			/*
			 * A group has no department above it, so without a manager of its own nobody
			 * but a superadmin could ever fix its access.
			 */
			const hasManager =
				input.role === "manager" ||
				others.some((m) => m.spaceId === space.id && m.role === "manager");
			if (space.kind === "group" && !hasManager) {
				throw new Error("A group needs at least one manager.");
			}
			memberships = input.role
				? [
						...others,
						{ spaceId: space.id, userId: input.userId, role: input.role },
					]
				: others;
		},
		onSuccess: (_data, _input, _onMutateResult, context) =>
			invalidateAll(context),
	});
}

/** Moves a space in or out of the secure environment. Superadmins only. */
export function setRestrictedMutationOptions() {
	return mutationOptions({
		mutationKey: [ROOT_KEY, "set-restricted"],
		mutationFn: async (input: { spaceId: string; isRestricted: boolean }) => {
			await delay(200);
			if (!actingUser().isSuperadmin) {
				throw new Error("Only superadmins can restrict a space.");
			}
			const space = spaces.find((s) => s.id === input.spaceId);
			if (!space || space.kind === "personal") {
				throw new Error("That space can't be restricted.");
			}
			space.isRestricted = input.isRestricted;
		},
		onSuccess: (_data, _input, _onMutateResult, context) =>
			invalidateAll(context),
	});
}

/** Creates a group managed by its creator. Resolves to its id, so the caller can open it. */
export function createGroupMutationOptions() {
	return mutationOptions({
		mutationKey: [ROOT_KEY, "create-group"],
		mutationFn: async (input: GroupInput): Promise<string> => {
			await delay(250);
			const user = actingUser();
			if (!canCreateGroups(user)) {
				throw new Error(
					"Only department managers and superadmins can create groups.",
				);
			}
			const id = crypto.randomUUID();
			spaces.push({
				id,
				kind: "group",
				name: input.name,
				description: input.description,
				parentId: null,
				organizationId: user.organizationId,
				isRestricted: false,
				ownerId: null,
			});
			memberships = [
				...memberships,
				{ spaceId: id, userId: user.id, role: "manager" },
			];
			return id;
		},
		onSuccess: (_id, _input, _onMutateResult, context) =>
			invalidateAll(context),
	});
}
