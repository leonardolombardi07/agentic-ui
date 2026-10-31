import { Link } from "@tanstack/react-router";
import { cn } from "cn";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import type { ModalName } from "./search";
import { useCloseModal } from "./use-close-modal";

type Section<T extends string> = { id: T; label: string };

/**
 * Modal with a category nav (left) and the section content (right). Shared by
 * Settings and Customizations. Placeholder content for now.
 */
export function SectionsModal<T extends string>({
	name,
	title,
	sections,
	current,
}: {
	name: ModalName;
	title: string;
	sections: Section<T>[];
	current: T;
}) {
	const close = useCloseModal();
	const currentLabel = sections.find((s) => s.id === current)?.label ?? current;

	return (
		<Dialog
			open
			onOpenChange={(open) => {
				if (!open) close();
			}}
		>
			<DialogContent
				className={cn(
					// Below md: full screen, no rounding.
					"inset-0 h-dvh w-screen translate-x-0 translate-y-0 rounded-none border-0",
					// md+: centered window with a minimum width, capped by the viewport.
					"md:inset-auto md:top-1/2 md:left-1/2 md:h-[min(720px,calc(100dvh-4rem))] md:w-[min(1000px,calc(100vw-4rem))] md:min-w-[720px] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-xl md:border",
				)}
				data-testid={`${name}-modal`}
			>
				<div className="flex min-h-0 flex-1 max-sm:flex-col">
					<nav
						aria-label={`${title} categories`}
						className="flex shrink-0 flex-col gap-0.5 border-border bg-sidebar p-3 sm:w-52 sm:border-r max-sm:flex-row max-sm:overflow-x-auto max-sm:border-b"
					>
						<DialogTitle className="mb-2 px-2 pt-1 max-sm:sr-only">
							{title}
						</DialogTitle>
						{sections.map((section) => (
							<Link
								key={section.id}
								to="."
								search={(prev) => ({ ...prev, [name]: section.id })}
								// Switching sections doesn't add history entries; Back closes the modal.
								replace
								state={(prev) => prev}
								aria-current={section.id === current ? "page" : undefined}
								className={cn(
									"shrink-0 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground",
									section.id === current && "bg-accent text-foreground",
								)}
								data-testid={`${name}-nav-${section.id}`}
							>
								{section.label}
							</Link>
						))}
					</nav>
					<div className="min-w-0 flex-1 overflow-y-auto p-6 pr-14">
						<h2 className="text-2xl font-medium">{currentLabel}</h2>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
