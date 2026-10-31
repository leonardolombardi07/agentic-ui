import { useQuery } from "@tanstack/react-query";
import { ArrowUpIcon, BrainIcon, CpuIcon, ShieldIcon } from "lucide-react";
import { useState } from "react";
import { AgentPicker } from "@/components/chat/agent-picker";
import {
	PromptInput,
	PromptInputAction,
	PromptInputActions,
	PromptInputAddMenu,
	type PromptInputAttachment,
	PromptInputAttachments,
	PromptInputEditor,
	PromptInputSelect,
	type PromptInputSelectOption,
} from "@/components/chat/prompt-input";
import { Button } from "@/components/ui/button";
import {
	agentsListQueryOptions,
	myAgentsListQueryOptions,
} from "@/lib/api/agents/queries";
import { modelsListQueryOptions } from "@/lib/api/models/queries";
import type { EffortLevel, Model } from "@/lib/api/types/model";
import type { PermissionMode } from "@/lib/api/types/permission-mode";

const EFFORT_OPTIONS: Record<
	EffortLevel,
	PromptInputSelectOption<EffortLevel>
> = {
	low: { value: "low", label: "Low", description: "Quickest replies." },
	medium: { value: "medium", label: "Medium", description: "Balanced." },
	high: {
		value: "high",
		label: "High",
		description: "Thinks longer on hard problems.",
	},
	xhigh: {
		value: "xhigh",
		label: "Extra high",
		description: "For long, multi-step work.",
	},
	max: {
		value: "max",
		label: "Max",
		description: "No limit on thinking. Slowest.",
	},
};

const PERMISSION_OPTIONS: PromptInputSelectOption<PermissionMode>[] = [
	{
		value: "ask",
		label: "Ask first",
		description: "Asks before every action.",
	},
	{
		value: "auto-edit",
		label: "Auto-accept edits",
		description: "Edits files freely, asks before anything else.",
	},
	{
		value: "plan",
		label: "Plan only",
		description: "Proposes a plan and takes no actions.",
	},
	{
		value: "auto",
		label: "Full auto",
		description: "Acts without asking. Use with care.",
	},
];

type Attachment = PromptInputAttachment & { file: File };

/** What the user sent. Model, effort and permissions join this once the API takes them. */
export type ComposerMessage = {
	text: string;
	/** `null` is the Default agent. */
	agentId: string | null;
	files: File[];
};

type ComposerProps = {
	/** Controlled, so the owner decides where the draft lives (a tab, the home page). */
	draft: string;
	onDraftChange: (value: string) => void;
	/** Preselected agent: the session's, or the agent whose page this is. `null` is the Default agent. */
	defaultAgentId: string | null;
	placeholder?: string;
	/** Called with the message; the composer clears itself afterwards. */
	onSend?: (message: ComposerMessage) => void;
};

/**
 * Composer for sessions, agent pages and Home. What sending does is up to the owner:
 * a session sends a turn, an agent page or Home starts a session.
 */
export function Composer({
	draft,
	onDraftChange,
	defaultAgentId,
	placeholder = "Ask anything...",
	onSend,
}: ComposerProps) {
	const { data: yourAgents } = useQuery(myAgentsListQueryOptions());
	const { data: allAgents } = useQuery(agentsListQueryOptions());
	const { data: models } = useQuery(modelsListQueryOptions());

	/* Local until the API can store per-session run settings. */
	const [agentId, setAgentId] = useState(defaultAgentId);
	const [modelId, setModelId] = useState<string | null>(null);
	const [effort, setEffort] = useState<EffortLevel | null>(null);
	const [permissionMode, setPermissionMode] = useState<PermissionMode>("ask");
	const [attachments, setAttachments] = useState<Attachment[]>([]);

	const model = models?.find((m) => m.id === modelId) ?? models?.[0];
	// Derived, not synced: switching to a model without the chosen level shows its default,
	// and switching back restores the user's choice.
	const effectiveEffort = model ? resolveEffort(model, effort) : null;

	const canSend = draft.trim().length > 0 || attachments.length > 0;

	function addFiles(files: File[]) {
		setAttachments((current) => [
			...current,
			...files.map((file) => ({
				id: crypto.randomUUID(),
				name: file.name,
				size: file.size,
				file,
			})),
		]);
	}

	function removeAttachment(id: string) {
		setAttachments((current) => current.filter((a) => a.id !== id));
	}

	function handleSubmit() {
		if (!canSend) return;
		onSend?.({
			text: draft.trim(),
			agentId,
			files: attachments.map((a) => a.file),
		});
		onDraftChange("");
		setAttachments([]);
	}

	return (
		<PromptInput
			value={draft}
			onValueChange={onDraftChange}
			onSubmit={handleSubmit}
			data-testid="composer"
		>
			<PromptInputAttachments
				attachments={attachments}
				onRemove={removeAttachment}
			/>
			<PromptInputEditor placeholder={placeholder} autoFocus />
			<PromptInputActions className="justify-between">
				<div className="flex min-w-0 flex-wrap items-center gap-0.5">
					<PromptInputAddMenu onFilesSelected={addFiles} />
					<AgentPicker
						value={agentId}
						onValueChange={setAgentId}
						yourAgents={yourAgents}
						allAgents={allAgents}
					/>
					<PromptInputSelect
						label="Permissions"
						icon={<ShieldIcon />}
						value={permissionMode}
						onValueChange={setPermissionMode}
						options={PERMISSION_OPTIONS}
						data-testid="composer-permission-mode"
					/>
				</div>
				<div className="flex min-w-0 flex-wrap items-center justify-end gap-0.5">
					{models && model ? (
						<PromptInputSelect
							label="Model"
							icon={<CpuIcon />}
							value={model.id}
							onValueChange={setModelId}
							options={models.map((m) => ({
								value: m.id,
								label: m.name,
								description: m.description,
							}))}
							data-testid="composer-model"
						/>
					) : null}
					{model && effectiveEffort ? (
						<PromptInputSelect
							label="Effort"
							icon={<BrainIcon />}
							value={effectiveEffort}
							onValueChange={setEffort}
							options={model.effortLevels.map((level) => EFFORT_OPTIONS[level])}
							data-testid="composer-effort"
						/>
					) : null}
					<PromptInputAction tooltip="Send (Enter)">
						<Button
							size="icon-sm"
							aria-label="Send"
							disabled={!canSend}
							onClick={handleSubmit}
							data-testid="composer-send"
						>
							<ArrowUpIcon />
						</Button>
					</PromptInputAction>
				</div>
			</PromptInputActions>
		</PromptInput>
	);
}

/** The chosen level if this model supports it, otherwise the model's default (null if none). */
function resolveEffort(
	model: Model,
	chosen: EffortLevel | null,
): EffortLevel | null {
	if (chosen !== null && model.effortLevels.includes(chosen)) return chosen;
	return model.defaultEffort;
}
