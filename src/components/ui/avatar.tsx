import { Avatar as AvatarPrimitive } from "@base-ui/react/avatar";
import { cn } from "cn";

function Avatar({ className, ...props }: AvatarPrimitive.Root.Props) {
	return (
		<AvatarPrimitive.Root
			data-slot="avatar"
			className={cn(
				"relative inline-flex size-8 shrink-0 overflow-hidden rounded-full bg-muted select-none",
				className,
			)}
			{...props}
		/>
	);
}

function AvatarImage({ className, ...props }: AvatarPrimitive.Image.Props) {
	return (
		<AvatarPrimitive.Image
			data-slot="avatar-image"
			className={cn("size-full object-cover", className)}
			{...props}
		/>
	);
}

/** Shown while the image loads, when it fails, or when there's no image at all. */
function AvatarFallback({
	className,
	...props
}: AvatarPrimitive.Fallback.Props) {
	return (
		<AvatarPrimitive.Fallback
			data-slot="avatar-fallback"
			className={cn(
				"flex size-full items-center justify-center rounded-full text-xs font-medium",
				className,
			)}
			{...props}
		/>
	);
}

export { Avatar, AvatarFallback, AvatarImage };
