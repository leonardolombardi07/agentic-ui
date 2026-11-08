import { Link, type LinkProps } from "@tanstack/react-router";
import { ArrowLeftIcon } from "lucide-react";
import type { ReactNode } from "react";

/** The frame of a skill, connector or prompt page: back link, header, then the body. */
export function Detail({
	kind,
	back,
	icon,
	title,
	badge,
	subtitle,
	actions,
	children,
}: {
	kind: "skill" | "connector" | "prompt";
	back: { to: LinkProps["to"]; label: string };
	icon: ReactNode;
	title: string;
	/** Next to the title, e.g. the verified mark. */
	badge?: ReactNode;
	/** Under the title, e.g. who publishes it. */
	subtitle: string;
	/** Buttons on the right of the header. */
	actions: ReactNode;
	children: ReactNode;
}) {
	return (
		<div
			className="mx-auto flex max-w-3xl flex-col gap-8 px-6 py-8 sm:px-9"
			data-testid={`${kind}-page`}
		>
			<Link
				to={back.to}
				className="flex w-fit items-center gap-1.5 rounded-md text-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-1 focus-visible:ring-ring"
				data-testid={`${kind}-back`}
			>
				<ArrowLeftIcon className="size-4" />
				{back.label}
			</Link>
			<header className="flex flex-wrap items-start gap-4">
				{icon}
				<div className="flex min-w-0 flex-1 flex-col gap-1">
					<h1 className="flex items-center gap-2 text-2xl font-medium">
						<span className="min-w-0 break-words">{title}</span>
						{badge}
					</h1>
					<p className="text-sm text-muted-foreground">{subtitle}</p>
				</div>
				<div className="flex shrink-0 items-center gap-2">{actions}</div>
			</header>
			{children}
		</div>
	);
}

/** A titled block of a detail page. */
export function DetailSection({
	title,
	children,
}: {
	title: string;
	children: ReactNode;
}) {
	return (
		<section className="flex flex-col gap-3">
			<h2 className="text-sm font-semibold">{title}</h2>
			{children}
		</section>
	);
}

/** Label / value pairs, e.g. version and last update. */
export function Facts({
	facts,
}: {
	facts: { label: string; value: string }[];
}) {
	return (
		<dl className="grid grid-cols-2 gap-x-6 gap-y-3 rounded-card border border-border bg-card p-4 text-sm sm:grid-cols-4">
			{facts.map((fact) => (
				<div key={fact.label} className="flex min-w-0 flex-col gap-0.5">
					<dt className="text-muted-foreground">{fact.label}</dt>
					<dd className="truncate font-medium">{fact.value}</dd>
				</div>
			))}
		</dl>
	);
}
