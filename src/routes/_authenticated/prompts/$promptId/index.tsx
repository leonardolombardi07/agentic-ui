import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
	CheckIcon,
	CopyIcon,
	MessageSquareTextIcon,
	SendIcon,
} from "lucide-react";
import { useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import {
	addPromptMutationOptions,
	myPromptIdsQueryOptions,
	promptQueryOptions,
	removePromptMutationOptions,
} from "@/lib/api/prompts/queries";
import { seo } from "@/lib/seo";
import { Detail, DetailSection, Facts } from "../../-shared/customize/detail";
import { Tile } from "../../-shared/customize/tile";
import { ToggleButton } from "../../-shared/customize/toggle-button";

export const Route = createFileRoute("/_authenticated/prompts/$promptId/")({
	// Validates the prompt (404 -> notFound()) and warms the cache.
	loader: ({ context: { queryClient }, params }) =>
		Promise.all([
			queryClient.ensureQueryData(promptQueryOptions(params.promptId)),
			queryClient.ensureQueryData(myPromptIdsQueryOptions()),
		]),
	head: ({ loaderData }) => ({
		meta: loaderData
			? seo({
					title: loaderData[0].name,
					description: loaderData[0].description || undefined,
				})
			: seo({ title: "Prompt not found" }),
	}),
	component: PromptPage,
});

const dateFormat = new Intl.DateTimeFormat("en", { dateStyle: "medium" });

function PromptPage() {
	const { promptId } = Route.useParams();
	const { data: prompt } = useSuspenseQuery(promptQueryOptions(promptId));
	const { data: myIds } = useSuspenseQuery(myPromptIdsQueryOptions());
	const add = useMutation(addPromptMutationOptions());
	const remove = useMutation(removePromptMutationOptions());
	const [isCopied, setIsCopied] = useState(false);
	const isAdded = myIds.includes(prompt.id);

	async function copy() {
		await navigator.clipboard.writeText(prompt.text);
		setIsCopied(true);
		setTimeout(() => setIsCopied(false), 2000);
	}

	return (
		<Detail
			kind="prompt"
			back={{ to: "/prompts", label: "Prompts" }}
			icon={
				<Tile className="size-14">
					<MessageSquareTextIcon />
				</Tile>
			}
			title={prompt.name}
			subtitle={prompt.publisher}
			actions={
				<ToggleButton
					name={prompt.name}
					isAdded={isAdded}
					isPending={add.isPending || remove.isPending}
					onToggle={() => (isAdded ? remove : add).mutate(prompt.id)}
					addLabel="Add to your prompts"
					removeLabel="Remove from your prompts"
					variant="page"
					testId="prompt-toggle"
				/>
			}
		>
			{prompt.description ? (
				<p className="text-[15px]" data-testid="prompt-description">
					{prompt.description}
				</p>
			) : null}
			<Facts
				facts={[
					{ label: "Category", value: prompt.category },
					{ label: "Publisher", value: prompt.publisher },
					{
						label: "Updated",
						value: dateFormat.format(new Date(prompt.updatedAt)),
					},
					{ label: "Length", value: `${prompt.text.length} characters` },
				]}
			/>
			<DetailSection title="Prompt">
				<pre
					className="rounded-card border border-border bg-card p-5 font-sans text-sm leading-6 whitespace-pre-wrap"
					data-testid="prompt-text"
				>
					{prompt.text}
				</pre>
				<div className="flex flex-wrap gap-2">
					<Link
						to="/sessions/new"
						search={{ prompt: prompt.text }}
						className={buttonVariants({ variant: "default", size: "lg" })}
						data-testid="prompt-use"
					>
						<SendIcon />
						Use in a new session
					</Link>
					<Button
						variant="secondary"
						size="lg"
						onClick={() => void copy()}
						data-testid="prompt-copy"
					>
						{isCopied ? <CheckIcon /> : <CopyIcon />}
						{isCopied ? "Copied" : "Copy"}
					</Button>
				</div>
			</DetailSection>
		</Detail>
	);
}
