import { Check, Copy } from "lucide-react";
import * as React from "react";
import { cn } from "@/lib/utils";

/** The slim bar some previewers put above their content (line count, wrap, zoom…). */
export function PreviewToolbar({
	className,
	children,
}: {
	className?: string;
	children: React.ReactNode;
}) {
	return (
		<div
			className={cn(
				"flex h-9 shrink-0 items-center gap-1 border-b bg-background px-2 text-xs text-muted-foreground",
				className,
			)}
		>
			{children}
		</div>
	);
}

export function ToolbarButton({
	active,
	className,
	...props
}: React.ComponentProps<"button"> & { active?: boolean }) {
	return (
		<button
			type="button"
			aria-pressed={active}
			className={cn(
				"inline-flex h-7 cursor-pointer items-center gap-1 rounded-md px-2 whitespace-nowrap hover:bg-accent hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-40 [&_svg]:size-3.5",
				active && "bg-accent text-foreground",
				className,
			)}
			{...props}
		/>
	);
}

export function CopyButton({
	text,
	label = "Copy",
}: {
	text: () => string;
	label?: string;
}) {
	const [copied, setCopied] = React.useState(false);
	return (
		<ToolbarButton
			aria-label={label}
			onClick={() =>
				void navigator.clipboard?.writeText(text()).then(() => {
					setCopied(true);
					window.setTimeout(() => setCopied(false), 1500);
				})
			}
		>
			{copied ? <Check /> : <Copy />}{" "}
			<span className="hidden @[420px]:inline">
				{copied ? "Copied" : label}
			</span>
		</ToolbarButton>
	);
}

export const ToolbarDivider = () => (
	<span className="mx-1 h-4 w-px bg-border" aria-hidden="true" />
);
