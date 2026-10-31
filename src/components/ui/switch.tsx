import { Switch as SwitchPrimitive } from "@base-ui/react/switch";
import { cn } from "cn";

/** OpenBot switch: 20px (default) / 14px (sm) track, blue when on. */
function Switch({
	className,
	size = "default",
	...props
}: SwitchPrimitive.Root.Props & {
	size?: "sm" | "default";
}) {
	return (
		<SwitchPrimitive.Root
			data-slot="switch"
			data-size={size}
			className={cn(
				"peer group/switch inline-flex shrink-0 items-center rounded-full p-0.5 transition-colors duration-160 ease-out outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background data-disabled:cursor-not-allowed data-disabled:opacity-50 data-[size=default]:h-5 data-[size=default]:w-8 data-[size=sm]:h-3.5 data-[size=sm]:w-6 data-checked:bg-brand data-unchecked:bg-control-active",
				className,
			)}
			{...props}
		>
			<SwitchPrimitive.Thumb
				data-slot="switch-thumb"
				className="pointer-events-none block rounded-full bg-white shadow-[0_1px_2px_rgb(0_0_0/0.3)] transition-transform duration-160 ease-out group-data-[size=default]/switch:size-4 group-data-[size=sm]/switch:size-2.5 data-checked:group-data-[size=default]/switch:translate-x-3 data-checked:group-data-[size=sm]/switch:translate-x-2.5 data-unchecked:translate-x-0"
			/>
		</SwitchPrimitive.Root>
	);
}

export { Switch };
