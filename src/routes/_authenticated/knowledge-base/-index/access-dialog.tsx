import { useMutation, useQuery } from "@tanstack/react-query";
import {
	BotIcon,
	CheckIcon,
	ChevronDownIcon,
	LockIcon,
	UserPlusIcon,
	UsersIcon,
} from "lucide-react";
import { type ReactNode, useEffect, useId, useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
	setMemberRoleMutationOptions,
	setRestrictedMutationOptions,
	spaceAccessQueryOptions,
} from "@/lib/api/knowledge-base/queries";
import type {
	AccessEntry,
	KnowledgeUser,
	SpaceAccess,
	SpaceRole,
} from "@/lib/api/types/knowledge-base";
import {
	describeRole,
	initialsOf,
	RestrictedBadge,
	ROLE_LABELS,
	SPACE_KIND_LABELS,
} from "./space-meta";

const ROLE_HINTS: Record<SpaceRole, string> = {
	manager: "Adds, moves and deletes content, and manages access",
	viewer: "Reads and searches",
};

type AccessDialogProps = {
	spaceId: string;
	onClose: () => void;
};

/**
 * Who can see a space and why. Managers add people, change roles and hand the manager
 * role on; viewers get the same list read-only, so they know who to ask. Access that
 * comes from elsewhere (a department's manager, everyone in the company) is listed too,
 * labelled with its origin, because a list of only the direct members would understate
 * who can read the space.
 */
export function AccessDialog({ spaceId, onClose }: AccessDialogProps) {
	const { data: access } = useQuery(spaceAccessQueryOptions(spaceId));
	const setRole = useMutation(setMemberRoleMutationOptions());
	const setRestricted = useMutation(setRestrictedMutationOptions());
	const [error, setError] = useState<string>();

	// The user removed themselves (or was removed) while the dialog was open.
	const lostAccess = access === null;
	useEffect(() => {
		if (lostAccess) onClose();
	}, [lostAccess, onClose]);

	function changeRole(userId: string, role: SpaceRole | null) {
		setError(undefined);
		setRole.mutate(
			{ spaceId, userId, role },
			{ onError: (cause) => setError(cause.message) },
		);
	}

	return (
		<Dialog
			open
			onOpenChange={(open) => {
				if (!open) onClose();
			}}
		>
			<DialogContent
				className="max-h-[min(720px,calc(100dvh-2rem))] w-[min(560px,calc(100vw-2rem))]"
				data-testid="kb-access-dialog"
			>
				{access ? (
					<div className="flex min-h-0 flex-col">
						<div className="flex flex-col gap-1 p-6 pb-4">
							<DialogTitle className="flex items-center gap-2 pr-8">
								<span className="truncate">Access to {access.space.name}</span>
								{access.space.isRestricted ? (
									<RestrictedBadge variant="pill" />
								) : null}
							</DialogTitle>
							<DialogDescription>
								{SPACE_KIND_LABELS[access.space.kind]}
								{" - "}
								{describeRole(access.space)}
							</DialogDescription>
						</div>

						<div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-6 pb-6">
							{access.space.role === "manager" ? (
								<AddPeople
									candidates={access.candidates}
									isPending={setRole.isPending}
									onAdd={changeRole}
								/>
							) : null}

							{error ? (
								<p
									role="alert"
									className="text-sm text-destructive-foreground"
									data-testid="kb-access-error"
								>
									{error}
								</p>
							) : null}

							<section className="flex flex-col gap-1">
								<h3 className="text-xs font-semibold text-muted-foreground">
									People with access
								</h3>
								<ul className="flex flex-col" data-testid="kb-access-list">
									{access.entries.map((entry) => (
										<EntryRow
											key={`${entry.type}:${entry.type === "audience" ? entry.id : entry.user.id}`}
											entry={entry}
											canManage={access.space.role === "manager"}
											isPending={setRole.isPending}
											onChangeRole={changeRole}
										/>
									))}
								</ul>
							</section>

							<RestrictedSetting
								access={access}
								isPending={setRestricted.isPending}
								onChange={(isRestricted) => {
									setError(undefined);
									setRestricted.mutate(
										{ spaceId, isRestricted },
										{ onError: (cause) => setError(cause.message) },
									);
								}}
							/>

							<p className="flex gap-2.5 rounded-lg bg-accent p-3 text-sm text-muted-foreground">
								<BotIcon className="mt-0.5 size-4 shrink-0" />
								Agents have no access of their own. An agent reads this space
								only while working for someone listed here.
							</p>
						</div>
					</div>
				) : (
					<div className="flex flex-col gap-3 p-6">
						{/* Kept for screen readers: a dialog needs a title while it loads too. */}
						<DialogTitle>Access</DialogTitle>
						<Skeleton className="h-9 w-full" />
						<Skeleton className="h-12 w-full" />
						<Skeleton className="h-12 w-full" />
					</div>
				)}
			</DialogContent>
		</Dialog>
	);
}

/** Search the people who can still be added, and add one with a role. */
function AddPeople({
	candidates,
	isPending,
	onAdd,
}: {
	candidates: KnowledgeUser[];
	isPending: boolean;
	onAdd: (userId: string, role: SpaceRole) => void;
}) {
	const inputId = useId();
	const [filter, setFilter] = useState("");
	const [role, setRole] = useState<SpaceRole>("viewer");
	const terms = filter.toLowerCase().split(/\s+/).filter(Boolean);
	const matches =
		terms.length === 0
			? []
			: candidates.filter((user) => {
					const haystack =
						`${user.name} ${user.email} ${user.title}`.toLowerCase();
					return terms.every((term) => haystack.includes(term));
				});

	return (
		<section className="flex flex-col gap-2">
			<label
				htmlFor={inputId}
				className="text-xs font-semibold text-muted-foreground"
			>
				Add people
			</label>
			<div className="flex items-center gap-2">
				<div className="relative min-w-0 flex-1">
					<UserPlusIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
					<Input
						id={inputId}
						value={filter}
						onChange={(event) => setFilter(event.target.value)}
						placeholder="Search by name, email or title"
						className="pl-8"
						autoComplete="off"
						data-testid="kb-access-add-input"
					/>
				</div>
				<RoleMenu
					label={`Add as ${ROLE_LABELS[role].toLowerCase()}`}
					role={role}
					onChange={(next) => {
						if (next) setRole(next);
					}}
					testId="kb-access-add-role"
				/>
			</div>
			{terms.length > 0 ? (
				<ul
					className="flex flex-col rounded-lg border border-border p-1"
					data-testid="kb-access-candidates"
				>
					{matches.length === 0 ? (
						<li className="px-2 py-1.5 text-sm text-muted-foreground">
							Nobody else matches. People already listed below have access.
						</li>
					) : (
						matches.map((user) => (
							<li key={user.id}>
								<button
									type="button"
									disabled={isPending}
									onClick={() => {
										onAdd(user.id, role);
										setFilter("");
									}}
									className="flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-left outline-none transition-colors duration-120 hover:bg-accent focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
									data-testid="kb-access-candidate"
									data-user-id={user.id}
								>
									<Person user={user} />
									<span className="shrink-0 text-xs text-muted-foreground">
										Add as {ROLE_LABELS[role].toLowerCase()}
									</span>
								</button>
							</li>
						))
					)}
				</ul>
			) : null}
		</section>
	);
}

function EntryRow({
	entry,
	canManage,
	isPending,
	onChangeRole,
}: {
	entry: AccessEntry;
	canManage: boolean;
	isPending: boolean;
	onChangeRole: (userId: string, role: SpaceRole | null) => void;
}) {
	let who: ReactNode;
	if (entry.type === "audience") {
		who = (
			<div className="flex min-w-0 flex-1 items-center gap-3">
				<span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent text-muted-foreground">
					<UsersIcon className="size-4" />
				</span>
				<div className="flex min-w-0 flex-col">
					<span className="truncate text-sm">{entry.label}</span>
					<span className="truncate text-xs text-muted-foreground">
						{entry.description}
					</span>
				</div>
			</div>
		);
	} else {
		who = (
			<Person
				user={entry.user}
				note={
					entry.type === "inherited"
						? `Manages ${entry.fromSpaceName}, so manages its teams`
						: undefined
				}
			/>
		);
	}

	return (
		<li
			className="flex items-center gap-3 border-b border-border py-2 last:border-b-0"
			data-testid="kb-access-entry"
			data-entry-type={entry.type}
		>
			{who}
			{entry.type === "member" && canManage ? (
				<RoleMenu
					label={`Role of ${entry.user.name}`}
					role={entry.role}
					isDisabled={isPending}
					canRemove
					onChange={(role) => onChangeRole(entry.user.id, role)}
					testId="kb-access-role"
				/>
			) : (
				<span className="shrink-0 px-2.5 text-sm text-muted-foreground">
					{ROLE_LABELS[entry.role]}
				</span>
			)}
		</li>
	);
}

function Person({ user, note }: { user: KnowledgeUser; note?: string }) {
	return (
		<div className="flex min-w-0 flex-1 items-center gap-3">
			<Avatar>
				<AvatarFallback>{initialsOf(user.name)}</AvatarFallback>
			</Avatar>
			<div className="flex min-w-0 flex-col">
				<span className="flex items-center gap-1.5 truncate text-sm">
					{user.name}
					{user.isSuperadmin ? (
						<span className="rounded-full bg-accent px-1.5 text-[11px] text-muted-foreground">
							Superadmin
						</span>
					) : null}
				</span>
				<span className="truncate text-xs text-muted-foreground">
					{note ?? `${user.title} - ${user.email}`}
				</span>
			</div>
		</div>
	);
}

/** Picks a role; with `canRemove` it also offers taking the person out. */
function RoleMenu({
	label,
	role,
	isDisabled = false,
	canRemove = false,
	onChange,
	testId,
}: {
	/** For screen readers: what the role belongs to. */
	label: string;
	role: SpaceRole;
	isDisabled?: boolean;
	canRemove?: boolean;
	/** Null means remove. */
	onChange: (role: SpaceRole | null) => void;
	testId: string;
}) {
	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				disabled={isDisabled}
				render={
					<Button
						variant="ghost"
						aria-label={`${label}: ${ROLE_LABELS[role]}`}
						className="shrink-0 text-foreground"
						data-testid={testId}
					/>
				}
			>
				{ROLE_LABELS[role]}
				<ChevronDownIcon className="text-muted-foreground" />
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-72">
				{(["manager", "viewer"] as const).map((option) => (
					<DropdownMenuItem
						key={option}
						className="h-auto items-start py-1.5"
						onClick={() => {
							if (option !== role) onChange(option);
						}}
						data-testid={`${testId}-${option}`}
					>
						<CheckIcon
							className={option === role ? "mt-0.5" : "invisible mt-0.5"}
						/>
						<span className="flex flex-col">
							<span>{ROLE_LABELS[option]}</span>
							<span className="text-xs text-muted-foreground">
								{ROLE_HINTS[option]}
							</span>
						</span>
					</DropdownMenuItem>
				))}
				{canRemove ? (
					<>
						<DropdownMenuSeparator />
						<DropdownMenuItem
							variant="destructive"
							onClick={() => onChange(null)}
							data-testid={`${testId}-remove`}
						>
							Remove access
						</DropdownMenuItem>
					</>
				) : null}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

/**
 * The restricted state of the space. Everyone who sees a restricted space is told what it
 * means; only superadmins get the switch.
 */
function RestrictedSetting({
	access,
	isPending,
	onChange,
}: {
	access: SpaceAccess;
	isPending: boolean;
	onChange: (isRestricted: boolean) => void;
}) {
	const switchId = useId();
	const { space, canSetRestricted } = access;
	if (space.kind === "personal") return null;
	if (!space.isRestricted && !canSetRestricted) return null;

	return (
		<section
			className="flex items-start gap-3 rounded-lg border border-border p-3"
			data-testid="kb-restricted-setting"
		>
			<LockIcon className="mt-0.5 size-4 shrink-0 text-warning" />
			<div className="flex min-w-0 flex-1 flex-col gap-0.5">
				<label htmlFor={switchId} className="text-sm font-medium">
					Restricted space
				</label>
				<p className="text-sm text-muted-foreground">
					Kept in the secure environment. Only people added here by name can see
					it: nobody gets in through a department, and moving a file out asks
					for confirmation.
				</p>
			</div>
			{canSetRestricted ? (
				<Switch
					id={switchId}
					checked={space.isRestricted}
					disabled={isPending}
					onCheckedChange={onChange}
					data-testid="kb-restricted-switch"
				/>
			) : null}
		</section>
	);
}
