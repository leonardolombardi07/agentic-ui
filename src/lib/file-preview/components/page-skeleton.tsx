import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/** A white "page" on a grey desk: shared by the PDF and Word skeletons. */
export function PageSkeleton({ aspect = true }: { aspect?: boolean }) {
	return (
		<div className="flex h-full flex-col items-center overflow-hidden bg-muted/60 p-4">
			<div
				className={cn(
					"paper flex w-full max-w-[640px] flex-col gap-3 rounded-sm bg-white p-8 shadow-sm ring-1 ring-black/5",
					aspect ? "aspect-[1/1.3]" : "min-h-[28rem]",
				)}
			>
				<Skeleton className="h-3 w-1/3" />
				<Skeleton className="h-7 w-3/4" />
				<Skeleton className="h-3.5 w-full" />
				<Skeleton className="h-3.5 w-11/12" />
				<Skeleton className="h-3.5 w-4/5" />
				<Skeleton className="mt-3 h-24 w-full" />
				<Skeleton className="h-3.5 w-full" />
				<Skeleton className="h-3.5 w-2/3" />
			</div>
		</div>
	);
}
