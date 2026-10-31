import { cn } from "cn";
import type * as React from "react";

/** Composer-like surface: 16px radius, as in OpenBot's chat input. */
function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
	return (
		<textarea
			data-slot="textarea"
			className={cn(
				"flex field-sizing-content min-h-16 w-full rounded-xl border border-input bg-control px-3 py-2.5 text-base text-foreground transition-[background-color,border-color] duration-120 ease-out outline-none selection:bg-brand-soft placeholder:text-muted-foreground focus-visible:border-ring disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive/60",
				className,
			)}
			{...props}
		/>
	);
}

export { Textarea };
