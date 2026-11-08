import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { CodeXmlIcon, ExternalLinkIcon } from "lucide-react";
import { useState } from "react";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import {
	addSkillMutationOptions,
	mySkillIdsQueryOptions,
	removeSkillMutationOptions,
	skillsListQueryOptions,
} from "@/lib/api/skills/queries";
import { seo } from "@/lib/seo";
import { Catalog, type CatalogItem } from "../-shared/customize/catalog";
import { CatalogSearchSchema } from "../-shared/customize/search";
import { Tile } from "../-shared/customize/tile";

export const Route = createFileRoute("/_authenticated/skills/")({
	validateSearch: CatalogSearchSchema,
	loader: ({ context: { queryClient } }) =>
		Promise.all([
			queryClient.ensureQueryData(skillsListQueryOptions()),
			queryClient.ensureQueryData(mySkillIdsQueryOptions()),
		]),
	head: () => ({
		meta: seo({
			title: "Skills",
			description:
				"Browse the skills your agents can use and add them to yours.",
		}),
	}),
	component: Skills,
});

function Skills() {
	const search = Route.useSearch();
	const navigate = Route.useNavigate();
	const { data: skills } = useSuspenseQuery(skillsListQueryOptions());
	const { data: myIds } = useSuspenseQuery(mySkillIdsQueryOptions());
	const add = useMutation(addSkillMutationOptions());
	const remove = useMutation(removeSkillMutationOptions());
	const [pendingId, setPendingId] = useState<string>();

	const added = new Set(myIds);
	const items: CatalogItem[] = skills.map((skill) => ({
		id: skill.id,
		name: skill.name,
		description: skill.description,
		byline: skill.publisher,
		category: skill.category,
		updatedAt: skill.updatedAt,
		icon: (
			<Tile className="size-14">
				<CodeXmlIcon />
			</Tile>
		),
		isAdded: added.has(skill.id),
		link: { to: "/skills/$skillId", params: { skillId: skill.id } },
	}));

	function toggle(item: CatalogItem) {
		setPendingId(item.id);
		const mutation = item.isAdded ? remove : add;
		mutation.mutate(item.id, { onSettled: () => setPendingId(undefined) });
	}

	return (
		<Catalog
			kind="skills"
			copy={{
				noun: "skills",
				discoverTitle: "New skills",
				addLabel: "Add to your skills",
				removeLabel: "Remove from your skills",
				emptyYours: "You haven't added any skills yet.",
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
						onClick={() =>
							void navigate({
								search: (prev) => ({ ...prev, view: "discover" }),
								replace: true,
							})
						}
						data-testid="customize-add-browse"
					>
						<CodeXmlIcon />
						Browse skills
					</DropdownMenuItem>
					<DropdownMenuItem disabled>
						<ExternalLinkIcon />
						Upload a skill (coming soon)
					</DropdownMenuItem>
				</>
			}
		/>
	);
}
