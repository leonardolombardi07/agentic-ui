import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "cn";

/** OpenBot-style buttons: pill shape, 13px medium label, 24–40px control heights. */
const buttonVariants = cva(
	"inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full border border-transparent text-sm font-medium whitespace-nowrap transition-[background-color,border-color,color,box-shadow,opacity] duration-120 ease-out outline-none select-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 data-disabled:pointer-events-none data-disabled:opacity-50 aria-invalid:border-destructive/50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
	{
		variants: {
			variant: {
				/** Light "paper" pill on dark — OpenBot's primary action. */
				default: "bg-primary text-primary-foreground hover:bg-primary/90",
				/** Blue accent, for the one emphasized action in app chrome. */
				brand: "bg-brand text-brand-foreground hover:bg-brand-hover",
				destructive:
					"bg-destructive-soft text-destructive-foreground hover:bg-destructive/30 focus-visible:ring-destructive/60",
				/** Glass pill — OpenBot's secondary button. */
				outline:
					"border-glass-border bg-glass text-foreground shadow-glass backdrop-blur-md hover:bg-glass-hover",
				secondary:
					"bg-control text-foreground hover:bg-control-hover active:bg-control-active",
				ghost:
					"text-muted-foreground hover:bg-accent hover:text-foreground aria-expanded:bg-accent aria-expanded:text-foreground",
				link: "rounded-none text-brand-text underline-offset-4 hover:underline",
			},
			size: {
				default: "h-8 px-3.5 has-[>svg]:px-3",
				xs: "h-6 gap-1 px-2.5 text-xs has-[>svg]:px-2 [&_svg:not([class*='size-'])]:size-3",
				sm: "h-7 gap-1 px-3 text-xs has-[>svg]:px-2.5 [&_svg:not([class*='size-'])]:size-3.5",
				lg: "h-9 px-4 has-[>svg]:px-3.5",
				xl: "h-10 px-6 text-[15px] has-[>svg]:px-5",
				icon: "size-8",
				"icon-xs": "size-6 [&_svg:not([class*='size-'])]:size-3",
				"icon-sm": "size-7 [&_svg:not([class*='size-'])]:size-3.5",
				"icon-lg": "size-9",
			},
		},
		defaultVariants: {
			variant: "default",
			size: "default",
		},
	},
);

function Button({
	className,
	variant = "default",
	size = "default",
	...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
	return (
		<ButtonPrimitive
			data-slot="button"
			data-variant={variant}
			data-size={size}
			className={cn(buttonVariants({ variant, size, className }))}
			{...props}
		/>
	);
}

export { Button, buttonVariants };
