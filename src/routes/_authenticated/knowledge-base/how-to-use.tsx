import { createFileRoute, Link } from "@tanstack/react-router";
import {
	ArrowLeftIcon,
	CheckIcon,
	FileSearchIcon,
	LibraryBigIcon,
	type LucideIcon,
	MessageSquareQuoteIcon,
	PaperclipIcon,
	ScissorsIcon,
	UploadIcon,
	XIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { seo } from "@/lib/seo";

export const Route = createFileRoute(
	"/_authenticated/knowledge-base/how-to-use",
)({
	head: () => ({
		meta: seo({
			title: "How to use the Knowledge Base",
			description:
				"How the Knowledge Base works, how it differs from attaching a file to a conversation, and what each one costs.",
		}),
	}),
	component: HowToUse,
});

/*
 * A guide, not a feature: static text. It explains the one thing users get wrong about a
 * knowledge base (it does not read whole files, it retrieves passages), because that
 * decides when to use it and when to attach the file to the conversation instead.
 */
function HowToUse() {
	return (
		<article
			className="mx-auto flex max-w-3xl flex-col gap-12 px-6 py-8 sm:px-9"
			data-testid="kb-how-to-use"
		>
			<header className="flex flex-col gap-4">
				<Link
					to="/knowledge-base"
					className="flex w-fit items-center gap-1.5 rounded-md text-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-1 focus-visible:ring-ring"
					data-testid="kb-how-to-use-back"
				>
					<ArrowLeftIcon className="size-4" />
					Knowledge Base
				</Link>
				<h1 className="text-3xl font-medium tracking-tight">
					How the Knowledge Base works
				</h1>
				<p className="text-base text-text-secondary">
					The Knowledge Base is where your company keeps the files that people
					and agents should be able to find later: policies, runbooks, reports,
					decisions. You put a file in once, and from then on anyone with access
					to its space can search it and ask agents about it.
				</p>
			</header>

			<Section
				title="What happens to a file"
				lead="A file here is not just stored. It is read, cut into passages and indexed, so a question can be matched to the few passages that answer it."
			>
				<ol className="grid gap-3 sm:grid-cols-2">
					<Step
						index={1}
						icon={UploadIcon}
						title="A manager adds it to a space"
						text="The space decides who can find it: the company, a department, a team or a group."
					/>
					<Step
						index={2}
						icon={ScissorsIcon}
						title="It is read and split"
						text="The text is extracted and cut into passages of a few paragraphs each. This is the Indexing status you see after an upload."
					/>
					<Step
						index={3}
						icon={FileSearchIcon}
						title="A question finds passages"
						text="When you search, or an agent needs an answer, the most relevant passages are retrieved, from files you have access to only."
					/>
					<Step
						index={4}
						icon={MessageSquareQuoteIcon}
						title="The agent answers from them"
						text="The agent reads those passages, not the whole file, and answers with a link back to where each one came from."
					/>
				</ol>
				<Callout>
					The agent never reads the whole Knowledge Base, or even a whole file.
					It reads the handful of passages that best match the question. That is
					what makes thousands of files usable, and it is also the main
					limitation: see the trade-offs below.
				</Callout>
			</Section>

			<Section
				title="Knowledge Base or attach to the conversation?"
				lead="Both give an agent a file to work with, in opposite ways."
			>
				<div className="overflow-x-auto rounded-card border border-border">
					<table className="w-full min-w-[36rem] text-left text-sm">
						<thead>
							<tr className="border-b border-border bg-accent">
								<th className="w-1/4 p-3 font-medium">
									<span className="sr-only">Aspect</span>
								</th>
								<th className="w-[37.5%] p-3 font-medium">
									<span className="flex items-center gap-2">
										<LibraryBigIcon className="size-4 text-muted-foreground" />
										Knowledge Base
									</span>
								</th>
								<th className="w-[37.5%] p-3 font-medium">
									<span className="flex items-center gap-2">
										<PaperclipIcon className="size-4 text-muted-foreground" />
										Attached to a conversation
									</span>
								</th>
							</tr>
						</thead>
						<tbody>
							{COMPARISON.map((row) => (
								<tr
									key={row.aspect}
									className="border-b border-border align-top last:border-b-0"
								>
									<th scope="row" className="p-3 font-medium">
										{row.aspect}
									</th>
									<td className="p-3 text-text-secondary">{row.knowledge}</td>
									<td className="p-3 text-text-secondary">{row.attached}</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</Section>

			<Section
				title="The trade-offs"
				lead="Retrieval is fast and cheap because it reads little. That same fact decides what it is good and bad at."
			>
				<div className="grid gap-3 sm:grid-cols-2">
					<Card title="The Knowledge Base is good at">
						<Point good>
							Finding one answer in many files: "what is the hotel allowance in
							Europe?"
						</Point>
						<Point good>
							Questions many people ask again and again, from files that stay
							valid for months.
						</Point>
						<Point good>
							Answers that must respect who is asking: the same question gives
							each person only what their spaces allow.
						</Point>
					</Card>
					<Card title="It is weak at">
						<Point>
							Whole-document work: "summarize this report" or "list every risk".
							Passages that were not retrieved are simply not seen.
						</Point>
						<Point>
							Calculations over a full spreadsheet. Totals and filters need
							every row, not the three most similar ones.
						</Point>
						<Point>
							Comparing two long documents line by line, or anything where
							missing one paragraph changes the answer.
						</Point>
					</Card>
				</div>
				<Callout>
					A rule of thumb: if the task is about{" "}
					<strong>one file, all of it</strong>, attach it to the conversation.
					If it is about{" "}
					<strong>an answer that lives somewhere in many files</strong>, that is
					what the Knowledge Base is for. You can do both: find the file here,
					then attach it for the deep work.
				</Callout>
			</Section>

			<Section
				title="What it costs"
				lead="There are no prices on this page, because they depend on your contract. What does not change is where the cost comes from."
			>
				<div className="grid gap-3 sm:grid-cols-2">
					<Card title="Knowledge Base">
						<dl className="flex flex-col gap-3">
							<Cost term="Indexing, once per file">
								Paid when a file is added, and again each time it changes. Grows
								with the amount of text.
							</Cost>
							<Cost term="Storage, continuous">
								Paid for as long as the file stays, used or not. Old versions
								and duplicates cost the same as useful files.
							</Cost>
							<Cost term="Each question, small">
								Only the retrieved passages are sent to the model, so a question
								costs about the same whether the space has ten files or ten
								thousand.
							</Cost>
						</dl>
					</Card>
					<Card title="Attached to a conversation">
						<dl className="flex flex-col gap-3">
							<Cost term="Nothing up front">
								No indexing and no storage beyond the conversation.
							</Cost>
							<Cost term="Each message, proportional to the file">
								The whole file travels with every message of that conversation.
								A long document in a long conversation is paid for many times.
							</Cost>
							<Cost term="A hard ceiling">
								Files that do not fit in what the model can read at once can't
								be used this way at all.
							</Cost>
						</dl>
					</Card>
				</div>
				<p className="text-sm text-text-secondary">
					In short: the Knowledge Base costs more to fill and less to ask. It
					pays off for files that are asked about often and by many people. For
					a file you will use once, attaching it is cheaper and gives better
					answers.
				</p>
			</Section>

			<Section
				title="Who can see what"
				lead="Access is decided by space, never by folder or file. Folders only organize."
			>
				<ul className="flex flex-col gap-2 text-sm text-text-secondary">
					<Bullet term="Spaces follow the organization.">
						The company space is readable by everyone. A department's space is
						read by the members of its teams. Teams and groups are for the
						people added to them.
					</Bullet>
					<Bullet term="Two roles.">
						Viewers read and search. Managers also add, move and delete files,
						and decide who has access, including naming other managers.
					</Bullet>
					<Bullet term="Managers flow down.">
						A department's manager manages its teams. Reading does not flow
						down: being in a department does not open its teams.
					</Bullet>
					<Bullet term="Restricted spaces are sealed.">
						They are kept in a separate, secure environment. Only people added
						by name get in, and moving a file out asks for confirmation.
					</Bullet>
					<Bullet term="Agents have no access of their own.">
						An agent can only retrieve what the person it is working for can
						open. Asking an agent is never a way around a space.
					</Bullet>
				</ul>
			</Section>

			<Section
				title="Getting good answers"
				lead="What goes in decides what comes out. A few habits make the difference."
			>
				<ul className="flex flex-col gap-2 text-sm text-text-secondary">
					<Bullet term="One current version.">
						Delete or replace outdated files. Two versions of a policy means an
						agent may quote the wrong one, and both are paid for.
					</Bullet>
					<Bullet term="Text, not pictures of text.">
						Scanned pages and screenshots have little or nothing to index.
						Prefer the original document.
					</Bullet>
					<Bullet term="Names and headings that say what it is.">
						"Travel and expenses policy 2027" is found; "final_v3" is not. Clear
						headings inside the file help passages stand on their own.
					</Bullet>
					<Bullet term="The narrowest space that fits.">
						A file in the company space is in everyone's answers. Put team
						material in the team's space.
					</Bullet>
					<Bullet term="Check the source.">
						Answers link to the passages they used. Open them when the answer
						matters.
					</Bullet>
				</ul>
			</Section>
		</article>
	);
}

type ComparisonRow = { aspect: string; knowledge: string; attached: string };

const COMPARISON: ComparisonRow[] = [
	{
		aspect: "Who can use it",
		knowledge: "Everyone with access to the space, and the agents they use.",
		attached: "Only you, in that conversation.",
	},
	{
		aspect: "How long it lasts",
		knowledge: "Until a manager deletes it.",
		attached: "As long as the conversation.",
	},
	{
		aspect: "How the agent reads it",
		knowledge:
			"A few relevant passages per question. The rest of the file is not seen.",
		attached: "The whole file, every time.",
	},
	{
		aspect: "How much it can hold",
		knowledge: "Thousands of files.",
		attached: "A few files, limited by what the model can read at once.",
	},
	{
		aspect: "Ready when",
		knowledge: "After indexing: seconds to minutes per file.",
		attached: "Immediately.",
	},
	{
		aspect: "Best for",
		knowledge: "Lasting, shared reference: policies, runbooks, decisions.",
		attached:
			"One-off work on a specific file: summarize, analyze, compare, calculate.",
	},
];

function Section({
	title,
	lead,
	children,
}: {
	title: string;
	lead: string;
	children: ReactNode;
}) {
	return (
		<section className="flex flex-col gap-4">
			<div className="flex flex-col gap-1">
				<h2 className="text-xl font-medium tracking-tight">{title}</h2>
				<p className="text-sm text-muted-foreground">{lead}</p>
			</div>
			{children}
		</section>
	);
}

function Step({
	index,
	icon: Icon,
	title,
	text,
}: {
	index: number;
	icon: LucideIcon;
	title: string;
	text: string;
}) {
	return (
		<li className="flex gap-3 rounded-card border border-border bg-card p-4">
			<span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand-text">
				<Icon className="size-4.5" />
			</span>
			<div className="flex flex-col gap-0.5">
				<h3 className="text-sm font-medium">
					<span className="text-muted-foreground">{index}. </span>
					{title}
				</h3>
				<p className="text-sm text-muted-foreground">{text}</p>
			</div>
		</li>
	);
}

function Card({ title, children }: { title: string; children: ReactNode }) {
	return (
		<div className="flex flex-col gap-3 rounded-card border border-border bg-card p-4">
			<h3 className="text-sm font-medium">{title}</h3>
			{children}
		</div>
	);
}

/** A line of a "good at" / "weak at" list. */
function Point({
	good = false,
	children,
}: {
	good?: boolean;
	children: ReactNode;
}) {
	const Icon = good ? CheckIcon : XIcon;
	return (
		<p className="flex gap-2 text-sm text-text-secondary">
			<Icon
				aria-hidden
				className={
					good
						? "mt-0.5 size-4 shrink-0 text-success"
						: "mt-0.5 size-4 shrink-0 text-destructive-foreground"
				}
			/>
			<span>{children}</span>
		</p>
	);
}

function Cost({ term, children }: { term: string; children: ReactNode }) {
	return (
		<div className="flex flex-col gap-0.5 text-sm">
			<dt className="font-medium">{term}</dt>
			<dd className="text-muted-foreground">{children}</dd>
		</div>
	);
}

function Bullet({ term, children }: { term: string; children: ReactNode }) {
	return (
		<li className="flex gap-2">
			<span
				aria-hidden
				className="mt-2 size-1.5 shrink-0 rounded-full bg-text-dim"
			/>
			<span>
				<strong className="font-medium text-foreground">{term}</strong>{" "}
				{children}
			</span>
		</li>
	);
}

function Callout({ children }: { children: ReactNode }) {
	return (
		<p className="rounded-card border-l-2 border-brand bg-brand-soft p-4 text-sm text-text-secondary">
			{children}
		</p>
	);
}
