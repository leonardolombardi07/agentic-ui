import { cn } from "cn";
import {
	InfoIcon,
	LightbulbIcon,
	type LucideIcon,
	MessageSquareWarningIcon,
	OctagonAlertIcon,
	TriangleAlertIcon,
} from "lucide-react";
import {
	Children,
	cloneElement,
	isValidElement,
	type ReactElement,
	type ReactNode,
} from "react";

type AlertKind = "note" | "tip" | "important" | "warning" | "caution";

const ALERTS: Record<
	AlertKind,
	{ title: string; icon: LucideIcon; className: string }
> = {
	note: {
		title: "Note",
		icon: InfoIcon,
		className:
			"border-brand bg-brand-soft/40 [&_[data-alert-title]]:text-brand-text",
	},
	tip: {
		title: "Tip",
		icon: LightbulbIcon,
		className:
			"border-success bg-success-soft/40 [&_[data-alert-title]]:text-success",
	},
	important: {
		title: "Important",
		icon: MessageSquareWarningIcon,
		className: "border-chart-4 bg-muted/50 [&_[data-alert-title]]:text-chart-4",
	},
	warning: {
		title: "Warning",
		icon: TriangleAlertIcon,
		className:
			"border-warning bg-warning-soft/40 [&_[data-alert-title]]:text-warning",
	},
	caution: {
		title: "Caution",
		icon: OctagonAlertIcon,
		className:
			"border-destructive bg-destructive-soft/40 [&_[data-alert-title]]:text-destructive-foreground",
	},
};

/** GitHub's syntax: a quote whose first line is `[!NOTE]`, `[!WARNING]`... */
const MARKER = /^\[!(note|tip|important|warning|caution)\][ \t]*\n?/i;

type ParagraphElement = ReactElement<{ children?: ReactNode }>;

/**
 * A blockquote, or a GitHub alert when it starts with a marker. Models use
 * these for caveats and warnings, which deserve more weight than a quote.
 */
export function Blockquote({ children }: { children?: ReactNode }) {
	const alert = parseAlert(children);
	if (!alert) return <blockquote>{children}</blockquote>;
	const { title, icon: Icon, className } = ALERTS[alert.kind];
	return (
		<div
			role="note"
			className={cn(
				"not-prose my-3 rounded-r-lg border-l-[3px] px-4 py-2.5 text-sm leading-relaxed [&_p+p]:mt-2",
				className,
			)}
			data-testid={`markdown-alert-${alert.kind}`}
		>
			<p
				data-alert-title=""
				className="mb-1 flex items-center gap-1.5 text-xs font-semibold"
			>
				<Icon aria-hidden className="size-3.5" />
				{title}
			</p>
			{alert.children}
		</div>
	);
}

function parseAlert(
	children: ReactNode,
): { kind: AlertKind; children: ReactNode[] } | null {
	const nodes = Children.toArray(children);
	const index = nodes.findIndex((node) => isValidElement(node));
	const first = nodes[index];
	if (!isValidElement<{ children?: ReactNode }>(first) || first.type !== "p") {
		return null;
	}
	const [lead, ...rest] = Children.toArray(first.props.children);
	if (typeof lead !== "string") return null;
	const match = MARKER.exec(lead);
	if (!match?.[1]) return null;

	const remainder = [lead.slice(match[0].length), ...rest].filter(
		(node) => node !== "",
	);
	const paragraph: ParagraphElement | null =
		remainder.length > 0 ? cloneElement(first, undefined, ...remainder) : null;
	const kind = match[1].toLowerCase();
	if (!isAlertKind(kind)) return null;
	const after = nodes.slice(index + 1);
	return {
		kind,
		children: paragraph ? [paragraph, ...after] : after,
	};
}

function isAlertKind(value: string): value is AlertKind {
	return Object.hasOwn(ALERTS, value);
}
