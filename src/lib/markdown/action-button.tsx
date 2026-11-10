import { CheckIcon, CopyIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";

/** How long "Copied" shows after a copy, in ms. */
const COPIED_MS = 1500;

type ActionButtonProps = Omit<
	React.ComponentProps<typeof Button>,
	"aria-label"
> & {
	/** The tooltip, and the accessible name. */
	label: string;
};

/** The small icon-only buttons of block toolbars (code, tables, messages). */
export function ActionButton({ label, children, ...props }: ActionButtonProps) {
	return (
		<Tooltip>
			<TooltipTrigger
				render={
					<Button
						variant="ghost"
						size="icon-xs"
						aria-label={label}
						{...props}
					/>
				}
			>
				{children}
			</TooltipTrigger>
			<TooltipContent>{label}</TooltipContent>
		</Tooltip>
	);
}

/** Copies `text()` (read on click, so callers needn't compute it every render). */
export function CopyButton({
	text,
	label = "Copy",
	...props
}: Omit<ActionButtonProps, "label" | "onClick"> & {
	text: () => string;
	label?: string;
}) {
	const { copied, copy } = useCopy();
	return (
		<ActionButton
			label={copied ? "Copied" : label}
			onClick={() => copy(text())}
			{...props}
		>
			{copied ? <CheckIcon /> : <CopyIcon />}
		</ActionButton>
	);
}

/** Clipboard writes with a short-lived "copied" flag for feedback. */
export function useCopy() {
	const [copied, setCopied] = useState(false);
	const timer = useRef<number | undefined>(undefined);
	useEffect(() => () => window.clearTimeout(timer.current), []);

	async function copy(text: string) {
		await navigator.clipboard.writeText(text);
		setCopied(true);
		window.clearTimeout(timer.current);
		timer.current = window.setTimeout(() => setCopied(false), COPIED_MS);
	}

	return { copied, copy };
}
