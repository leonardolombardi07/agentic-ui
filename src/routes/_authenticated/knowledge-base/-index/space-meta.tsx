import { cn } from "cn";
import {
	Building2Icon,
	GlobeIcon,
	HandshakeIcon,
	LockIcon,
	type LucideIcon,
	UserIcon,
	UsersIcon,
} from "lucide-react";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import type { SpaceKind, VisibleSpace } from "@/lib/api/types/knowledge-base";

export const SPACE_KIND_ICONS: Record<SpaceKind, LucideIcon> = {
	company: GlobeIcon,
	department: Building2Icon,
	team: UsersIcon,
	group: HandshakeIcon,
	personal: UserIcon,
};

export const SPACE_KIND_LABELS: Record<SpaceKind, string> = {
	company: "Company space",
	department: "Department",
	team: "Team",
	group: "Group",
	personal: "Personal space",
};

export const ROLE_LABELS = { manager: "Manager", viewer: "Viewer" } as const;

const RESTRICTED_HINT =
	"Restricted: kept in the secure environment. Only people added directly can see it.";

/** The lock that follows a restricted space everywhere it is named. */
export function RestrictedBadge({
	variant = "icon",
	className,
}: {
	/** `icon` for tight spots (tree, breadcrumb, results); `pill` where there is room for the word. */
	variant?: "icon" | "pill";
	className?: string;
}) {
	return (
		<Tooltip>
			<TooltipTrigger
				render={
					<span
						role="img"
						aria-label="Restricted space"
						className={cn(
							"inline-flex shrink-0 items-center gap-1 text-warning",
							variant === "pill" &&
								"rounded-full bg-warning-soft px-2 py-0.5 text-xs font-medium",
							className,
						)}
						data-testid="kb-restricted-badge"
					/>
				}
			>
				<LockIcon className="size-3.5" />
				{variant === "pill" ? "Restricted" : null}
			</TooltipTrigger>
			<TooltipContent className="max-w-64">{RESTRICTED_HINT}</TooltipContent>
		</Tooltip>
	);
}

/** One sentence on what the user can do in the space and why. */
export function describeRole(space: VisibleSpace): string {
	const source = space.roleSource;
	switch (source.type) {
		case "owner":
			return "Only you can see your files.";
		case "superadmin":
			return "As a superadmin you manage every space.";
		case "inherited":
			return `You manage this space because you manage ${source.fromSpaceName}.`;
		case "implicit":
			return space.kind === "company"
				? "Everyone in the company can read this space."
				: "You can read this space because you belong to one of its teams.";
		case "direct":
			return space.role === "manager"
				? "You manage this space: you add content and decide who has access."
				: "You can read and search this space. Its managers decide what goes in it.";
	}
}

/** The user's role in the space; the tooltip says where it comes from. */
export function RoleChip({ space }: { space: VisibleSpace }) {
	return (
		<Tooltip>
			<TooltipTrigger
				render={
					<span
						className={cn(
							"inline-flex shrink-0 cursor-default items-center rounded-full px-2 py-0.5 text-xs font-medium",
							space.role === "manager"
								? "bg-brand-soft text-brand-text"
								: "bg-accent text-muted-foreground",
						)}
						data-testid="kb-role-chip"
					/>
				}
			>
				{space.roleSource.type === "owner"
					? "Private"
					: ROLE_LABELS[space.role]}
			</TooltipTrigger>
			<TooltipContent className="max-w-64">
				{describeRole(space)}
			</TooltipContent>
		</Tooltip>
	);
}

/** "Marina Costa" -> "MC". */
export function initialsOf(name: string): string {
	const words = name.split(/\s+/).filter(Boolean);
	const first = words[0]?.[0] ?? "";
	const last = words.length > 1 ? (words[words.length - 1]?.[0] ?? "") : "";
	return `${first}${last}`.toUpperCase();
}

const dateFormat = new Intl.DateTimeFormat("en", {
	dateStyle: "medium",
	// Fixed, so the server and the browser render the same text.
	timeZone: "UTC",
});

/** "Nov 14, 2026". */
export function formatDate(iso: string): string {
	return dateFormat.format(new Date(iso));
}
