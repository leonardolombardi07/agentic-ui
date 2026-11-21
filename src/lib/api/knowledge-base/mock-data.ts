import type {
	KnowledgeUser,
	Membership,
	Space,
} from "@/lib/api/types/knowledge-base";

/*
 * Mock data until the real API exists. Everything is static (no random ids, no "now"):
 * the server and the browser each seed their own copy and must render the same thing.
 */

const ORGANIZATION_ID = "org-acme";
export const ORGANIZATION_NAME = "Acme";

function user(
	id: string,
	name: string,
	title: string,
	isSuperadmin = false,
): KnowledgeUser {
	const email = `${name.split(" ")[0].toLowerCase()}@company.com`;
	return {
		id,
		name,
		email,
		title,
		organizationId: ORGANIZATION_ID,
		isSuperadmin,
	};
}

/** The first one matches the signed-in user of `users/queries.ts`. */
export const USERS: KnowledgeUser[] = [
	user("u-leonardo", "Leonardo Lombardi", "Platform administrator", true),
	user("u-marina", "Marina Costa", "Head of Engineering"),
	user("u-rafael", "Rafael Souza", "Platform team lead"),
	user("u-ana", "Ana Ribeiro", "Data scientist"),
	user("u-carla", "Carla Mendes", "Chief Financial Officer"),
	user("u-bruno", "Bruno Almeida", "Financial analyst"),
	user("u-diego", "Diego Farias", "People partner"),
	user("u-helena", "Helena Duarte", "Chief Executive Officer"),
];

function space(
	id: string,
	kind: Space["kind"],
	name: string,
	description: string,
	options: { parentId?: string; isRestricted?: boolean; ownerId?: string } = {},
): Space {
	return {
		id,
		kind,
		name,
		description,
		parentId: options.parentId ?? null,
		organizationId: ORGANIZATION_ID,
		isRestricted: options.isRestricted ?? false,
		ownerId: options.ownerId ?? null,
	};
}

export function personalSpaceId(userId: string) {
	return `sp-me-${userId}`;
}

export const SPACES: Space[] = [
	space(
		"sp-company",
		"company",
		ORGANIZATION_NAME,
		"Policies and references for the whole company.",
	),
	space(
		"sp-eng",
		"department",
		"Engineering",
		"Standards and decisions shared by every engineering team.",
	),
	space(
		"sp-eng-platform",
		"team",
		"Platform",
		"Runbooks and architecture of the internal platform.",
		{ parentId: "sp-eng" },
	),
	space(
		"sp-eng-data",
		"team",
		"Data Science",
		"Models, datasets and experiment reports.",
		{ parentId: "sp-eng" },
	),
	space(
		"sp-fin",
		"department",
		"Finance",
		"Budgets, closing calendars and reporting.",
	),
	space("sp-fin-treasury", "team", "Treasury", "Cash, banking and hedging.", {
		parentId: "sp-fin",
	}),
	space("sp-fin-mna", "team", "M&A", "Deal material. Need-to-know only.", {
		parentId: "sp-fin",
		isRestricted: true,
	}),
	space(
		"sp-people",
		"department",
		"People",
		"Hiring, onboarding and people policies.",
	),
	space(
		"sp-people-talent",
		"team",
		"Talent",
		"Recruiting pipelines and interview kits.",
		{ parentId: "sp-people" },
	),
	space(
		"sp-group-launch",
		"group",
		"Q4 Launch Taskforce",
		"Everyone working on the Q4 launch, across departments.",
	),
	space(
		"sp-group-board",
		"group",
		"Executive Board",
		"Board packs and executive decisions.",
		{ isRestricted: true },
	),
	...USERS.map((owner) =>
		space(personalSpaceId(owner.id), "personal", "My files", "", {
			ownerId: owner.id,
		}),
	),
];

export const MEMBERSHIPS: Membership[] = [
	// People runs the company-wide space: a manager role delegated by the superadmin.
	{ spaceId: "sp-company", userId: "u-diego", role: "manager" },

	{ spaceId: "sp-eng", userId: "u-marina", role: "manager" },
	{ spaceId: "sp-eng-platform", userId: "u-rafael", role: "manager" },
	{ spaceId: "sp-eng-data", userId: "u-ana", role: "viewer" },

	{ spaceId: "sp-fin", userId: "u-carla", role: "manager" },
	{ spaceId: "sp-fin-treasury", userId: "u-bruno", role: "viewer" },
	{ spaceId: "sp-fin-mna", userId: "u-carla", role: "manager" },
	{ spaceId: "sp-fin-mna", userId: "u-helena", role: "viewer" },

	{ spaceId: "sp-people", userId: "u-diego", role: "manager" },

	{ spaceId: "sp-group-launch", userId: "u-marina", role: "manager" },
	{ spaceId: "sp-group-launch", userId: "u-ana", role: "viewer" },
	{ spaceId: "sp-group-launch", userId: "u-bruno", role: "viewer" },

	{ spaceId: "sp-group-board", userId: "u-helena", role: "manager" },
	{ spaceId: "sp-group-board", userId: "u-carla", role: "viewer" },
];
