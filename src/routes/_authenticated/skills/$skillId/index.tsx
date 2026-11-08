import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { CodeXmlIcon, FileTextIcon } from "lucide-react";
import {
	addSkillMutationOptions,
	mySkillIdsQueryOptions,
	removeSkillMutationOptions,
	skillQueryOptions,
} from "@/lib/api/skills/queries";
import { Markdown } from "@/lib/markdown";
import { seo } from "@/lib/seo";
import { Detail, DetailSection, Facts } from "../../-shared/customize/detail";
import { Tile } from "../../-shared/customize/tile";
import { ToggleButton } from "../../-shared/customize/toggle-button";

export const Route = createFileRoute("/_authenticated/skills/$skillId/")({
	// Validates the skill (404 -> notFound()) and warms the cache.
	loader: ({ context: { queryClient }, params }) =>
		Promise.all([
			queryClient.ensureQueryData(skillQueryOptions(params.skillId)),
			queryClient.ensureQueryData(mySkillIdsQueryOptions()),
		]),
	head: ({ loaderData }) => ({
		meta: loaderData
			? seo({
					title: loaderData[0].name,
					description: loaderData[0].description,
				})
			: seo({ title: "Skill not found" }),
	}),
	component: SkillPage,
});

const dateFormat = new Intl.DateTimeFormat("en", { dateStyle: "medium" });

function SkillPage() {
	const { skillId } = Route.useParams();
	const { data: skill } = useSuspenseQuery(skillQueryOptions(skillId));
	const { data: myIds } = useSuspenseQuery(mySkillIdsQueryOptions());
	const add = useMutation(addSkillMutationOptions());
	const remove = useMutation(removeSkillMutationOptions());
	const isAdded = myIds.includes(skill.id);

	return (
		<Detail
			kind="skill"
			back={{ to: "/skills", label: "Skills" }}
			icon={
				<Tile className="size-14">
					<CodeXmlIcon />
				</Tile>
			}
			title={skill.name}
			subtitle={skill.publisher}
			actions={
				<ToggleButton
					name={skill.name}
					isAdded={isAdded}
					isPending={add.isPending || remove.isPending}
					onToggle={() => (isAdded ? remove : add).mutate(skill.id)}
					addLabel="Add to your skills"
					removeLabel="Remove from your skills"
					variant="page"
					testId="skill-toggle"
				/>
			}
		>
			<p className="text-[15px]" data-testid="skill-description">
				{skill.description}
			</p>
			<Facts
				facts={[
					{ label: "Version", value: `v${skill.version}` },
					{ label: "Category", value: skill.category },
					{
						label: "Updated",
						value: dateFormat.format(new Date(skill.updatedAt)),
					},
					{ label: "Files", value: String(skill.files.length) },
				]}
			/>
			<DetailSection title="Instructions">
				<div className="prose prose-sm max-w-none rounded-card border border-border bg-card p-5 dark:prose-invert">
					<Markdown>{skill.instructions}</Markdown>
				</div>
			</DetailSection>
			<DetailSection title="Files">
				<ul className="flex flex-col divide-y divide-border rounded-card border border-border bg-card text-sm">
					{skill.files.map((file) => (
						<li key={file} className="flex items-center gap-2 px-4 py-2.5">
							<FileTextIcon className="size-4 text-muted-foreground" />
							<code>{file}</code>
						</li>
					))}
				</ul>
			</DetailSection>
		</Detail>
	);
}
