import { cn } from "cn";

/** Placeholder block. Decorative: the surrounding region carries the busy state. */
export function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			aria-hidden="true"
			className={cn("animate-pulse rounded-md bg-muted", className)}
			{...props}
		/>
	);
}
