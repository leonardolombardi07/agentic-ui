import { CheckIcon, PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";

/**
 * Adds an item to "Yours" or removes it. Square "+" on cards (as in Claude's Customize),
 * a labelled button on detail pages.
 */
export function ToggleButton({
	name,
	isAdded,
	isPending,
	onToggle,
	addLabel,
	removeLabel,
	variant,
	testId,
}: {
	/** What the screen reader announces the button acts on, e.g. a skill's name. */
	name: string;
	isAdded: boolean;
	isPending: boolean;
	onToggle: () => void;
	/** Tooltip and verb, e.g. "Add to your skills". */
	addLabel: string;
	removeLabel: string;
	variant: "card" | "page";
	testId: string;
}) {
	const label = isAdded ? removeLabel : addLabel;

	if (variant === "page") {
		return (
			<Button
				variant={isAdded ? "secondary" : "default"}
				size="lg"
				disabled={isPending}
				onClick={onToggle}
				data-testid={testId}
			>
				{isAdded ? <CheckIcon /> : <PlusIcon />}
				{isAdded ? "Added" : "Add"}
				<span className="sr-only"> {name}</span>
			</Button>
		);
	}

	return (
		<Tooltip>
			<TooltipTrigger
				render={
					<Button
						variant="secondary"
						size="icon"
						// Above the stretched link, so clicks don't open the item.
						className="relative z-10 rounded-lg bg-control-active hover:bg-control-hover"
						aria-label={`${label}: ${name}`}
						aria-pressed={isAdded}
						disabled={isPending}
						onClick={onToggle}
						data-testid={testId}
					/>
				}
			>
				{isAdded ? <CheckIcon /> : <PlusIcon />}
			</TooltipTrigger>
			<TooltipContent>{label}</TooltipContent>
		</Tooltip>
	);
}
