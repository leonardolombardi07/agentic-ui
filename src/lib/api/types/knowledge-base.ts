import { z } from "zod";

/*
 * The Knowledge Base is a file store indexed for search (RAG). Files live in folders, and
 * folders live in a space. Access is decided per space, never per folder or file, so
 * "who can see this?" always has a one-line answer: whoever can see the space.
 */

/**
 * Where a space sits in the organization. Departments own teams; groups sit outside that
 * tree and gather people from anywhere; a personal space belongs to one user.
 */
export const SpaceKindSchema = z.enum([
	"company",
	"department",
	"team",
	"group",
	"personal",
]);

/** A manager adds, moves and deletes content and decides who has access. A viewer reads and searches. */
export const SpaceRoleSchema = z.enum(["manager", "viewer"]);

export const KnowledgeUserSchema = z.object({
	id: z.string(),
	name: z.string(),
	email: z.string(),
	/** Job title, shown next to the name when picking people. */
	title: z.string(),
	/** Users of another organization can only be reached through groups (not built yet). */
	organizationId: z.string(),
	/** Manages every space of the organization, restricted ones included. */
	isSuperadmin: z.boolean(),
});

export const SpaceSchema = z.object({
	id: z.string(),
	kind: SpaceKindSchema,
	name: z.string(),
	description: z.string(),
	/** The department of a team. Null for every other kind. */
	parentId: z.string().nullable(),
	organizationId: z.string(),
	/**
	 * Kept in the secure environment. Only people added directly can see it: managers of
	 * the parent department do not inherit access.
	 */
	isRestricted: z.boolean(),
	/** The user a personal space belongs to. Null for every other kind. */
	ownerId: z.string().nullable(),
});

/** Why the user has their role, so the UI can explain it instead of just stating it. */
export const RoleSourceSchema = z.discriminatedUnion("type", [
	/** Added to the space by name. */
	z.object({ type: z.literal("direct") }),
	/** Manager of the department the team belongs to. */
	z.object({ type: z.literal("inherited"), fromSpaceName: z.string() }),
	/** Comes with belonging: everyone reads the company space, team members read their department. */
	z.object({ type: z.literal("implicit") }),
	z.object({ type: z.literal("superadmin") }),
	/** Their own personal space. */
	z.object({ type: z.literal("owner") }),
]);

/** A space the user can see, with the role they have in it. The API never returns any other space. */
export const VisibleSpaceSchema = SpaceSchema.extend({
	role: SpaceRoleSchema,
	roleSource: RoleSourceSchema,
});

const nodeBase = {
	id: z.string(),
	spaceId: z.string(),
	/** The folder it is in. Null at the root of the space. */
	parentId: z.string().nullable(),
	name: z.string(),
	/** ISO date-time of the last change. */
	updatedAt: z.string(),
	/** Name of who made the last change. */
	updatedBy: z.string(),
};

export const FolderNodeSchema = z.object({
	...nodeBase,
	kind: z.literal("folder"),
});

export const FileNodeSchema = z.object({
	...nodeBase,
	kind: z.literal("file"),
	/** Bytes. */
	size: z.number(),
	/** A file is only found by search, and by agents, once it is indexed. */
	indexStatus: z.enum(["indexing", "indexed"]),
	/** What the index knows about the content. Search matches it and shows it as the excerpt. */
	summary: z.string(),
});

export const KnowledgeNodeSchema = z.discriminatedUnion("kind", [
	FolderNodeSchema,
	FileNodeSchema,
]);

/** What a folder (or the root of a space) shows. */
export const FolderContentsSchema = z.object({
	space: VisibleSpaceSchema,
	/** The open folder's ancestors and itself, outermost first. Empty at the root. */
	path: z.array(z.object({ id: z.string(), name: z.string() })),
	nodes: z.array(KnowledgeNodeSchema),
});

/**
 * A piece of a file as the index stores it. Search matches passages, and agents quote
 * them, so a result can point at the place in the file rather than at the file.
 */
export const PassageSchema = z.object({
	id: z.string(),
	text: z.string(),
	/** Where it is, in words: "Page 2", "Summary, B11", "Time off". */
	label: z.string(),
	/*
	 * Where the preview can land. All absent for files with no addressable place
	 * (Markdown, Word): those open at the top.
	 */
	/** PDF: 1-based page. */
	page: z.number().optional(),
	/** Spreadsheet: sheet name. */
	sheet: z.string().optional(),
	/** Spreadsheet: A1-style cell. */
	cell: z.string().optional(),
});

export const SearchHitSchema = z.object({
	node: KnowledgeNodeSchema,
	space: VisibleSpaceSchema,
	/** Names of the folders above the node, outermost first. */
	path: z.array(z.string()),
	/**
	 * The best passages that match, each cut to an excerpt around the match. Empty when
	 * only the name or summary matched, and for folders.
	 */
	passages: z.array(PassageSchema),
});

/** A file opened to be read: where it lives, who it is shared with, and its bytes. */
export const OpenFileSchema = z.object({
	node: FileNodeSchema,
	space: VisibleSpaceSchema,
	/** Names of the folders above it, outermost first. */
	path: z.array(z.string()),
	/** Where the bytes are served from, for the previewer and for downloading. */
	url: z.string(),
	/** e.g. `text/markdown`. Empty when unknown: the previewer then goes by the extension. */
	mimeType: z.string(),
});

/** One line of "who has access" to a space. */
export const AccessEntrySchema = z.discriminatedUnion("type", [
	/** Added by name: the only kind a manager can change or remove. */
	z.object({
		type: z.literal("member"),
		user: KnowledgeUserSchema,
		role: SpaceRoleSchema,
	}),
	/** Has the role because of another space. Changed there, not here. */
	z.object({
		type: z.literal("inherited"),
		user: KnowledgeUserSchema,
		role: SpaceRoleSchema,
		fromSpaceName: z.string(),
	}),
	/** A set of people rather than one, e.g. "Everyone at Acme". */
	z.object({
		type: z.literal("audience"),
		id: z.string(),
		label: z.string(),
		description: z.string(),
		role: SpaceRoleSchema,
	}),
]);

export const SpaceAccessSchema = z.object({
	space: VisibleSpaceSchema,
	entries: z.array(AccessEntrySchema),
	/** People who can still be added. Empty unless the user manages the space. */
	candidates: z.array(KnowledgeUserSchema),
	/** Only superadmins move a space in or out of the secure environment. */
	canSetRestricted: z.boolean(),
});

/** A space the user can move content into, with its folders. */
export const MoveTargetSchema = z.object({
	space: VisibleSpaceSchema,
	folders: z.array(
		z.object({
			id: z.string(),
			parentId: z.string().nullable(),
			name: z.string(),
		}),
	),
});

/** Who is using the Knowledge Base, and what they may do outside any one space. */
export const KnowledgeSessionSchema = z.object({
	user: KnowledgeUserSchema,
	/** Groups are created by superadmins and department managers only. */
	canCreateGroups: z.boolean(),
	/** Mock only: the people the "View as" switcher offers. */
	personas: z.array(KnowledgeUserSchema),
});

/** A file picked or dropped for upload. */
export const UploadEntrySchema = z.object({
	name: z.string(),
	size: z.number(),
	/** Folders it came in, outermost first, when a whole folder was dropped. They are recreated. */
	path: z.array(z.string()),
	/** The bytes. */
	file: z.instanceof(File),
});

/** A folder or file name. */
export const NodeNameSchema = z
	.string()
	.trim()
	.min(1, "Give it a name.")
	.max(120, "Keep the name under 120 characters.")
	.regex(/^[^/\\]+$/, "A name can't contain slashes.");

/** What the user fills in to create a group. */
export const GroupInputSchema = z.object({
	name: z
		.string()
		.trim()
		.min(1, "Give the group a name.")
		.max(60, "Keep the name under 60 characters."),
	description: z.string().trim(),
});

export type SpaceKind = z.infer<typeof SpaceKindSchema>;
export type SpaceRole = z.infer<typeof SpaceRoleSchema>;
export type KnowledgeUser = z.infer<typeof KnowledgeUserSchema>;
export type Space = z.infer<typeof SpaceSchema>;
export type RoleSource = z.infer<typeof RoleSourceSchema>;
export type VisibleSpace = z.infer<typeof VisibleSpaceSchema>;
export type FolderNode = z.infer<typeof FolderNodeSchema>;
export type FileNode = z.infer<typeof FileNodeSchema>;
export type KnowledgeNode = z.infer<typeof KnowledgeNodeSchema>;
export type FolderContents = z.infer<typeof FolderContentsSchema>;
export type Passage = z.infer<typeof PassageSchema>;
export type SearchHit = z.infer<typeof SearchHitSchema>;
export type OpenFile = z.infer<typeof OpenFileSchema>;
export type AccessEntry = z.infer<typeof AccessEntrySchema>;
export type SpaceAccess = z.infer<typeof SpaceAccessSchema>;
export type MoveTarget = z.infer<typeof MoveTargetSchema>;
export type KnowledgeSession = z.infer<typeof KnowledgeSessionSchema>;
export type UploadEntry = z.infer<typeof UploadEntrySchema>;
export type GroupInput = z.infer<typeof GroupInputSchema>;

/** A space member as stored: one user, one space, one role. */
export type Membership = {
	spaceId: string;
	userId: string;
	role: SpaceRole;
};

/** Where content is moved or uploaded to. */
export type Destination = {
	spaceId: string;
	/** Null for the root of the space. */
	parentId: string | null;
};
