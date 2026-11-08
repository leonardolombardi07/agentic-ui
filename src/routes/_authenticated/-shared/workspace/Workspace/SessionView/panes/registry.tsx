import type { UIMessage } from "@tanstack/ai-react";
import {
	BotIcon,
	FolderIcon,
	GaugeIcon,
	type LucideIcon,
	ScrollTextIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import type { ClientSession } from "@/lib/api/types/session";
import { type PaneId, PaneIdSchema, type TabRef } from "../../../model";
import { ActivityPane } from "./activity-pane";
import { AgentPane } from "./agent-pane";
import { ContextPane } from "./context-pane";
import { FilesPane } from "./files-pane";

/** What every pane gets: the session, its live transcript and the tab it's in. */
export type PaneProps = {
	session: ClientSession;
	messages: ReadonlyArray<UIMessage>;
	tabRef: TabRef;
	/** The Files pane's selection (tab state). */
	selectedFileId: string | null;
};

export type PaneDef = {
	id: PaneId;
	label: string;
	icon: LucideIcon;
	render: (props: PaneProps) => ReactNode;
};

/*
 * The extension point: add an id to PaneIdSchema and an entry here. The header icon,
 * docking, the sheet, full size and closing come for free. A Record so a new id
 * can't be forgotten.
 */
const PANES: Record<PaneId, PaneDef> = {
	files: {
		id: "files",
		label: "Files",
		icon: FolderIcon,
		render: (props) => <FilesPane {...props} />,
	},
	agent: {
		id: "agent",
		label: "Agent",
		icon: BotIcon,
		render: (props) => <AgentPane {...props} />,
	},
	context: {
		id: "context",
		label: "Context & usage",
		icon: GaugeIcon,
		render: (props) => <ContextPane {...props} />,
	},
	activity: {
		id: "activity",
		label: "Activity",
		icon: ScrollTextIcon,
		render: (props) => <ActivityPane {...props} />,
	},
};

/** In header order. */
export const PANE_LIST: PaneDef[] = PaneIdSchema.options.map((id) => PANES[id]);

/** What "show panes" opens when none are open yet. */
export const DEFAULT_PANE: PaneId = "files";

export function getPane(id: PaneId): PaneDef {
	return PANES[id];
}
