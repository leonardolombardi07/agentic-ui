import { cn } from "cn";
import type * as React from "react";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
	return (
		<input
			type={type}
			data-slot="input"
			className={cn(
				"h-8 w-full min-w-0 rounded-md border border-input bg-control px-2.5 text-sm text-foreground transition-[background-color,border-color] duration-120 ease-out outline-none selection:bg-brand-soft file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground hover:bg-control-hover disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
				"focus-visible:border-ring focus-visible:bg-control",
				"aria-invalid:border-destructive/60",
				className,
			)}
			{...props}
		/>
	);
}

export { Input };
