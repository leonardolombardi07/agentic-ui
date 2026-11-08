import { Skeleton } from "@/components/ui/skeleton";

export function MarkdownSkeleton() {
	return (
		<div className="flex h-full flex-col bg-background">
			<div className="flex h-9 shrink-0 items-center gap-2 border-b px-3">
				<Skeleton className="h-5 w-16" />
				<Skeleton className="h-5 w-16" />
			</div>
			<div className="mx-auto flex w-full max-w-[760px] flex-col gap-3 px-[clamp(1rem,5%,2.5rem)] py-8">
				<Skeleton className="h-7 w-2/3" />
				<Skeleton className="h-3.5 w-full" />
				<Skeleton className="h-3.5 w-11/12" />
				<Skeleton className="mt-4 h-5 w-1/3" />
				<Skeleton className="h-3.5 w-full" />
				<Skeleton className="h-3.5 w-4/5" />
				<Skeleton className="mt-2 h-28 w-full" />
			</div>
		</div>
	);
}
