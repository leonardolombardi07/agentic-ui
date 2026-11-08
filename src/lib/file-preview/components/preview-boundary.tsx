import { QueryErrorResetBoundary } from "@tanstack/react-query";
import * as React from "react";
import { PreviewErrorView } from "./preview-error-view";

type BoundaryProps = {
	/** The file type's label, used in error messages ("…isn't a valid spreadsheet file"). */
	typeLabel: string;
	/** Shown while the preview (its code or its data) is loading. */
	fallback: React.ReactNode;
	/** Offered on the error screen so the user is never stuck. */
	downloadUrl?: string;
	fileName?: string;
	/** Reporting hook (Sentry, Datadog…). */
	onError?: (error: unknown, info: React.ErrorInfo) => void;
	children: React.ReactNode;
};

/**
 * Wraps one preview: Suspense for loading (lazy code + data) and an error boundary for
 * everything else (network, corrupt file, a bug in a previewer). "Try again" also resets
 * the failed React Query entries, so the retry really re-downloads.
 *
 * Give it a `key` per file so switching files clears a previous error.
 */
export function PreviewBoundary({
	fallback,
	children,
	...rest
}: BoundaryProps) {
	return (
		<QueryErrorResetBoundary>
			{({ reset }) => (
				<ErrorBoundary onReset={reset} {...rest}>
					<React.Suspense fallback={<LoadingRegion>{fallback}</LoadingRegion>}>
						{children}
					</React.Suspense>
				</ErrorBoundary>
			)}
		</QueryErrorResetBoundary>
	);
}

function LoadingRegion({ children }: { children: React.ReactNode }) {
	return (
		<div role="status" aria-busy="true" className="h-full">
			<span className="sr-only">Loading preview…</span>
			{children}
		</div>
	);
}

type ErrorBoundaryProps = Omit<BoundaryProps, "fallback"> & {
	onReset: () => void;
};
type ErrorBoundaryState = {
	error: unknown;
	componentStack?: string;
	hasError: boolean;
};

// Error boundaries still have to be classes.
class ErrorBoundary extends React.Component<
	ErrorBoundaryProps,
	ErrorBoundaryState
> {
	state: ErrorBoundaryState = { error: null, hasError: false };

	static getDerivedStateFromError(error: unknown): Partial<ErrorBoundaryState> {
		return { error, hasError: true };
	}

	componentDidCatch(error: unknown, info: React.ErrorInfo) {
		// React already logs caught errors to the console (createRoot's onCaughtError); this is for reporting.
		this.setState({ componentStack: info.componentStack ?? undefined });
		this.props.onError?.(error, info);
	}

	private retry = () => {
		this.props.onReset();
		this.setState({ error: null, componentStack: undefined, hasError: false });
	};

	render() {
		if (!this.state.hasError) return this.props.children;
		return (
			<PreviewErrorView
				error={this.state.error}
				componentStack={this.state.componentStack}
				typeLabel={this.props.typeLabel}
				fileName={this.props.fileName}
				downloadUrl={this.props.downloadUrl}
				onRetry={this.retry}
			/>
		);
	}
}
