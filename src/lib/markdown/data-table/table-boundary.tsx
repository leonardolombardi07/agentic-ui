import { TriangleAlertIcon } from "lucide-react";
import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = {
	/** The table as react-markdown rendered it: the fallback shows it plainly. */
	plain: ReactNode;
	/** The interactive table. */
	children: ReactNode;
};

type State = { hasError: boolean };

/**
 * Keeps a bug in the interactive table from taking the message down with it:
 * on any render error it falls back to the plain table, with a short notice.
 * Error boundaries still have to be classes.
 */
export class TableBoundary extends Component<Props, State> {
	state: State = { hasError: false };

	static getDerivedStateFromError(): State {
		return { hasError: true };
	}

	componentDidCatch(error: unknown, info: ErrorInfo) {
		console.error(
			"Interactive table failed, showing the plain one",
			error,
			info,
		);
	}

	componentDidUpdate(previous: Props) {
		// A streamed table changes under us: give the interactive one another go.
		if (this.state.hasError && previous.plain !== this.props.plain) {
			this.setState({ hasError: false });
		}
	}

	render() {
		if (!this.state.hasError) return this.props.children;
		return <PlainTable notice>{this.props.plain}</PlainTable>;
	}
}

/** The simplest table that still reads well: scrolls sideways, no tools. */
export function PlainTable({
	children,
	notice = false,
}: {
	children: ReactNode;
	/** Say why this isn't the interactive table. */
	notice?: boolean;
}) {
	return (
		<div data-testid="markdown-table-fallback">
			{notice ? (
				<output className="mb-1 flex items-center gap-1.5 text-xs text-muted-foreground">
					<TriangleAlertIcon aria-hidden className="size-3.5" />
					Couldn't load the interactive table. Showing it plainly.
				</output>
			) : null}
			<div className="overflow-x-auto">
				<table>{children}</table>
			</div>
		</div>
	);
}
