import { PreviewCard as PreviewCardPrimitive } from "@base-ui/react/preview-card";
import { cn } from "cn";

function HoverCard(props: PreviewCardPrimitive.Root.Props) {
	return <PreviewCardPrimitive.Root data-slot="hover-card" {...props} />;
}

function HoverCardTrigger({
	delay = 400,
	closeDelay = 150,
	...props
}: PreviewCardPrimitive.Trigger.Props) {
	return (
		<PreviewCardPrimitive.Trigger
			data-slot="hover-card-trigger"
			delay={delay}
			closeDelay={closeDelay}
			{...props}
		/>
	);
}

function HoverCardContent({
	className,
	side = "bottom",
	sideOffset = 6,
	align = "start",
	alignOffset = 0,
	anchor,
	children,
	...props
}: PreviewCardPrimitive.Popup.Props &
	Pick<
		PreviewCardPrimitive.Positioner.Props,
		"align" | "alignOffset" | "anchor" | "side" | "sideOffset"
	>) {
	return (
		<PreviewCardPrimitive.Portal>
			<PreviewCardPrimitive.Positioner
				align={align}
				alignOffset={alignOffset}
				anchor={anchor}
				side={side}
				sideOffset={sideOffset}
				className="isolate z-50"
			>
				<PreviewCardPrimitive.Popup
					data-slot="hover-card-content"
					className={cn(
						"z-50 w-72 origin-(--transform-origin) rounded-card border border-border bg-popover p-4 text-popover-foreground shadow-lg transition-[opacity,transform] duration-120 data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0",
						className,
					)}
					{...props}
				>
					{children}
				</PreviewCardPrimitive.Popup>
			</PreviewCardPrimitive.Positioner>
		</PreviewCardPrimitive.Portal>
	);
}

export { HoverCard, HoverCardContent, HoverCardTrigger };
