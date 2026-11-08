import { Link } from "@tanstack/react-router";
import { buttonVariants } from "@/components/ui/button";

export function NotFound() {
	return (
		<div
			className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center"
			data-testid="not-found"
		>
			<h1 className="text-xl font-medium">Not found</h1>
			<p className="text-sm text-muted-foreground">
				This page, session, agent or file doesn't exist.
			</p>
			<Link to="/" className={buttonVariants({ variant: "secondary" })}>
				Go home
			</Link>
		</div>
	);
}
