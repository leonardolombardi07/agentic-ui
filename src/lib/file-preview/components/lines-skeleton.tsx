import { Skeleton } from "@/components/ui/skeleton";

const WIDTHS = [
	"w-2/5",
	"w-3/4",
	"w-1/2",
	"w-5/6",
	"w-2/3",
	"w-1/3",
	"w-3/5",
	"w-4/5",
	"w-1/2",
	"w-2/3",
	"w-1/4",
	"w-3/4",
];

/** Toolbar + numbered lines: shared by the code and text skeletons so nothing jumps on load. */
export function LinesSkeleton() {
	return (
		<div className="flex h-full flex-col bg-background">
			<div className="flex h-9 shrink-0 items-center gap-2 border-b px-3">
				<Skeleton className="h-3 w-20" />
				<span className="flex-1" />
				<Skeleton className="h-5 w-14" />
				<Skeleton className="h-5 w-14" />
			</div>
			<div className="flex flex-col gap-2 p-3">
				{WIDTHS.map((w, i) => (
					<div key={i} className="flex items-center gap-4">
						<Skeleton className="h-3 w-5 shrink-0 opacity-60" />
						<Skeleton className={`h-3 ${w}`} />
					</div>
				))}
			</div>
		</div>
	);
}
