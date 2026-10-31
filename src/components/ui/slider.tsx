import { Slider as SliderPrimitive } from "@base-ui/react/slider";
import { cn } from "cn";
import * as React from "react";

function Slider({
	className,
	defaultValue,
	value,
	min = 0,
	max = 100,
	...props
}: SliderPrimitive.Root.Props) {
	/** One thumb per value; a bare number (or nothing) means a single thumb. */
	const thumbCount = React.useMemo(() => {
		if (Array.isArray(value)) return value.length;
		if (Array.isArray(defaultValue)) return defaultValue.length;
		return 1;
	}, [value, defaultValue]);

	return (
		<SliderPrimitive.Root
			data-slot="slider"
			defaultValue={defaultValue}
			value={value}
			min={min}
			max={max}
			thumbAlignment="edge"
			className={cn(
				"data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full",
				className,
			)}
			{...props}
		>
			<SliderPrimitive.Control className="relative flex w-full touch-none items-center select-none data-disabled:opacity-50 data-[orientation=vertical]:h-full data-[orientation=vertical]:min-h-44 data-[orientation=vertical]:w-auto data-[orientation=vertical]:flex-col">
				<SliderPrimitive.Track
					data-slot="slider-track"
					className="relative grow overflow-hidden rounded-full bg-control-active data-[orientation=horizontal]:h-1 data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-1"
				>
					<SliderPrimitive.Indicator
						data-slot="slider-range"
						className="bg-brand data-[orientation=horizontal]:h-full data-[orientation=vertical]:w-full"
					/>
				</SliderPrimitive.Track>
				{Array.from({ length: thumbCount }, (_, index) => (
					<SliderPrimitive.Thumb
						data-slot="slider-thumb"
						// biome-ignore lint/suspicious/noArrayIndexKey: thumbs are positional
						key={index}
						index={index}
						className="block size-4 shrink-0 rounded-full bg-white shadow-[0_1px_3px_rgb(0_0_0/0.35)] ring-brand/30 transition-[box-shadow] duration-120 select-none hover:ring-4 focus-visible:ring-4 focus-visible:outline-hidden data-disabled:pointer-events-none data-disabled:opacity-50"
					/>
				))}
			</SliderPrimitive.Control>
		</SliderPrimitive.Root>
	);
}

export { Slider };
