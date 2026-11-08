import { Skeleton } from "@/components/ui/skeleton";

export function ImageSkeleton() {
	return (
		<div className="flex h-full flex-col">
			<div className="flex h-9 shrink-0 items-center gap-2 border-b bg-background px-3">
				<Skeleton className="h-5 w-24" />
				<Skeleton className="h-5 w-28" />
				<span className="flex-1" />
				<Skeleton className="h-3 w-20" />
			</div>
			<div className="flex min-h-0 flex-1 items-center justify-center bg-muted/40 p-8">
				<Skeleton className="aspect-[4/3] w-3/4 max-w-xl" />
			</div>
		</div>
	);
}
