import { cn } from "cn";
import type { ReactNode } from "react";

/**
 * The square icon of a skill, connector or prompt. Connectors pass their brand color;
 * the others keep the neutral dark tile.
 */
export function Tile({
	children,
	color,
	className,
}: {
	children: ReactNode;
	/** Fill color, e.g. `#1a73e8`. Omit for the neutral tile. */
	color?: string;
	className?: string;
}) {
	return (
		<span
			aria-hidden
			className={cn(
				"flex shrink-0 items-center justify-center rounded-xl text-sm font-semibold [&_svg]:size-[45%]",
				color ? "text-white" : "bg-control-active text-muted-foreground",
				className,
			)}
			style={color ? { backgroundColor: color } : undefined}
		>
			{children}
		</span>
	);
}
