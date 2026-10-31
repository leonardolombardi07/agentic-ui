import { cn } from "cn";
import type * as React from "react";

/** Base UI has no standalone Label; a native <label> covers it. */
function Label({ className, ...props }: React.ComponentProps<"label">) {
	return (
		// biome-ignore lint/a11y/noLabelWithoutControl: consumers pass htmlFor or wrap the control
		<label
			data-slot="label"
			className={cn(
				"flex items-center gap-2 text-sm leading-none font-medium text-text-secondary select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50 peer-data-disabled:cursor-not-allowed peer-data-disabled:opacity-50",
				className,
			)}
			{...props}
		/>
	);
}

export { Label };
