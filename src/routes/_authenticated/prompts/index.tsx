import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
	LibraryIcon,
	MessageSquareTextIcon,
	PencilLineIcon,
} from "lucide-react";
import { useState } from "react";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import {
	addPromptMutationOptions,
	myPromptIdsQueryOptions,
	promptsListQueryOptions,
	removePromptMutationOptions,
} from "@/lib/api/prompts/queries";
import { seo } from "@/lib/seo";
import { Catalog, type CatalogItem } from "../-shared/customize/catalog";
import { CatalogSearchSchema } from "../-shared/customize/search";
import { Tile } from "../-shared/customize/tile";
import { CreateDialog } from "./-index/create-dialog";

export const Route = createFileRoute("/_authenticated/prompts/")({
	validateSearch: CatalogSearchSchema,
	loader: ({ context: { queryClient } }) =>
		Promise.all([
			queryClient.ensureQueryData(promptsListQueryOptions()),
			queryClient.ensureQueryData(myPromptIdsQueryOptions()),
		]),
	head: () => ({
		meta: seo({
			title: "Prompts",
			description: "Text you can attach to a message in one click.",
		}),
	}),
	component: Prompts,
});

function Prompts() {
	const search = Route.useSearch();
	const navigate = Route.useNavigate();
	const { data: prompts } = useSuspenseQuery(promptsListQueryOptions());
	const { data: myIds } = useSuspenseQuery(myPromptIdsQueryOptions());
	const add = useMutation(addPromptMutationOptions());
	const remove = useMutation(removePromptMutationOptions());
	const [pendingId, setPendingId] = useState<string>();
	const [isCreating, setIsCreating] = useState(false);

	const added = new Set(myIds);
	const items: CatalogItem[] = prompts.map((prompt) => ({
		id: prompt.id,
		name: prompt.name,
		description: prompt.description || prompt.text,
		byline: prompt.publisher,
		category: prompt.category,
		updatedAt: prompt.updatedAt,
		icon: (
			<Tile className="size-14">
				<MessageSquareTextIcon />
			</Tile>
		),
		isAdded: added.has(prompt.id),
		link: { to: "/prompts/$promptId", params: { promptId: prompt.id } },
	}));

	function toggle(item: CatalogItem) {
		setPendingId(item.id);
		const mutation = item.isAdded ? remove : add;
		mutation.mutate(item.id, { onSettled: () => setPendingId(undefined) });
	}

	return (
		<>
			<Catalog
				kind="prompts"
				copy={{
					noun: "prompts",
					discoverTitle: "Popular prompts",
					addLabel: "Add to your prompts",
					removeLabel: "Remove from your prompts",
					emptyYours: "You haven't saved any prompts yet.",
				}}
				items={items}
				search={search}
				onSearchChange={(patch) =>
					void navigate({
						search: (prev) => ({ ...prev, ...patch }),
						replace: true,
					})
				}
				onToggle={toggle}
				pendingId={pendingId}
				addMenu={
					<>
						<DropdownMenuItem
							onClick={() => setIsCreating(true)}
							data-testid="customize-add-write"
						>
							<PencilLineIcon />
							Write a prompt
						</DropdownMenuItem>
						<DropdownMenuItem
							onClick={() =>
								void navigate({
									search: (prev) => ({ ...prev, view: "discover" }),
									replace: true,
								})
							}
							data-testid="customize-add-browse"
						>
							<LibraryIcon />
							Browse prompts
						</DropdownMenuItem>
					</>
				}
			/>
			{isCreating ? (
				<CreateDialog onClose={() => setIsCreating(false)} />
			) : null}
		</>
	);
}
