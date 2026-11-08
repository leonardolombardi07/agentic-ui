import * as React from "react";
import { Skeleton } from "@/components/ui/skeleton";

/** Formula bar, a grid of headers and cells, sheet tabs: the same frame as the loaded sheet. */
export function SpreadsheetSkeleton() {
	return (
		<div className="flex h-full flex-col bg-background">
			<div className="flex h-8 shrink-0 items-center gap-3 border-b px-2">
				<Skeleton className="h-4 w-14" />
				<Skeleton className="h-3 w-1/2" />
			</div>
			<div className="paper min-h-0 flex-1 overflow-hidden bg-white">
				<div className="grid grid-cols-[36px_repeat(6,minmax(64px,1fr))]">
					<div className="h-[22px] border-r border-b bg-[#f3f3f3]" />
					{Array.from({ length: 6 }, (_, c) => (
						<div key={c} className="h-[22px] border-r border-b bg-[#f3f3f3]" />
					))}
					{Array.from({ length: 18 }, (_, r) => (
						<React.Fragment key={r}>
							<div className="h-5 border-r border-b bg-[#f3f3f3]" />
							{Array.from({ length: 6 }, (_, c) => (
								<div
									key={c}
									className="flex h-5 items-center border-r border-b border-[#e1e1e1] px-1.5"
								>
									{(r * 7 + c * 3) % 5 !== 0 && (
										<Skeleton
											className="h-2.5"
											style={{ width: `${40 + ((r * 13 + c * 29) % 50)}%` }}
										/>
									)}
								</div>
							))}
						</React.Fragment>
					))}
				</div>
			</div>
			<div className="flex shrink-0 gap-1 border-t bg-muted px-1.5 py-1">
				<Skeleton className="h-6 w-20 bg-background" />
				<Skeleton className="h-6 w-16 bg-background/60" />
			</div>
		</div>
	);
}
