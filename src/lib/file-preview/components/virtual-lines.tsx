import { useVirtualizer } from "@tanstack/react-virtual";
import * as React from "react";
import { cn } from "@/lib/utils";

const LINE_HEIGHT = 20;

/**
 * A virtualized, line-numbered monospace view: only the visible lines are in the DOM,
 * so a 100k-line log scrolls like a 100-line one. Used by the code and text previews.
 *
 * Without wrapping every line is exactly LINE_HEIGHT and the width comes from the longest
 * line (in `ch`), so horizontal scrolling is stable. With wrapping, lines are measured.
 */
export function VirtualLines({
	count,
	renderLine,
	longestLine,
	wrap,
	className,
	style,
	label,
}: {
	count: number;
	renderLine: (index: number) => React.ReactNode;
	/** Length in characters (tabs counted as 4) of the longest line. */
	longestLine: number;
	wrap: boolean;
	className?: string;
	style?: React.CSSProperties;
	label: string;
}) {
	const scrollRef = React.useRef<HTMLDivElement>(null);
	const virtualizer = useVirtualizer({
		count,
		getScrollElement: () => scrollRef.current,
		estimateSize: () => LINE_HEIGHT,
		overscan: 30,
	});
	const gutter = `${String(count).length + 2}ch`;

	// Measured heights from one mode are wrong in the other.
	React.useLayoutEffect(() => virtualizer.measure(), [wrap, virtualizer]);

	return (
		<div
			ref={scrollRef}
			tabIndex={0}
			role="region"
			aria-label={label}
			className={cn(
				"h-full overflow-auto font-mono text-[12.5px] focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none focus-visible:ring-inset",
				className,
			)}
			style={{ tabSize: 4, ...style }}
		>
			<div
				className="relative"
				style={{
					height: virtualizer.getTotalSize(),
					minWidth: wrap
						? undefined
						: `calc(${gutter} + ${longestLine}ch + 2rem)`,
				}}
			>
				{virtualizer.getVirtualItems().map((item) => (
					<div
						key={item.key}
						data-index={item.index}
						ref={wrap ? virtualizer.measureElement : undefined}
						className="absolute top-0 left-0 flex w-full"
						style={{
							transform: `translateY(${item.start}px)`,
							minHeight: LINE_HEIGHT,
							lineHeight: `${LINE_HEIGHT}px`,
						}}
					>
						<span
							className="sticky left-0 shrink-0 bg-inherit pr-4 text-right text-muted-foreground/70 select-none"
							style={{
								width: gutter,
								backgroundColor: "var(--gutter-bg, var(--background))",
							}}
							aria-hidden="true"
						>
							{item.index + 1}
						</span>
						<span
							className={cn(
								"min-w-0 flex-1 pr-4",
								wrap ? "break-all whitespace-pre-wrap" : "whitespace-pre",
							)}
						>
							{renderLine(item.index)}
						</span>
					</div>
				))}
			</div>
		</div>
	);
}

/** Splits into lines and finds the longest (tabs count as 4 columns). */
export function splitLines(text: string) {
	const lines = text.split(/\r\n|\r|\n/);
	let longest = 0;
	for (const l of lines) {
		const len =
			l.length + (l.includes("\t") ? (l.split("\t").length - 1) * 3 : 0);
		if (len > longest) longest = len;
	}
	return { lines, longest };
}
