import { useQuery } from "@tanstack/react-query";
import {
	ArrowUpIcon,
	BrainIcon,
	CpuIcon,
	ShieldIcon,
	SquareIcon,
} from "lucide-react";
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
import type { SessionSettings } from "@/lib/api/types/session";

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

/** What the user sent, with the agent and settings chosen for it. */
export type ComposerMessage = {
	text: string;
	/** `null` is the Default agent. */
	agentId: string | null;
	settings: SessionSettings;
	files: File[];
};

type ComposerProps = {
	/** Controlled, so the owner decides where the draft lives (a tab, the home page). */
	draft: string;
	onDraftChange: (value: string) => void;
	/** Preselected agent: the session's, or the agent whose page this is. `null` is the Default agent. */
	defaultAgentId: string | null;
	/** Preselected model, effort and permissions: the session's. Defaults to the first model. */
	defaultSettings?: SessionSettings;
	/** Called when the user picks another agent, e.g. to save it on the session. */
	onAgentIdChange?: (agentId: string | null) => void;
	/** Called when the user changes the model, effort or permissions. */
	onSettingsChange?: (settings: SessionSettings) => void;
	placeholder?: string;
	/** Called with the message; the composer clears itself afterwards. */
	onSend?: (message: ComposerMessage) => void;
	/** A reply is on its way: Send becomes Stop. */
	isRunning?: boolean;
	onStop?: () => void;
};

/**
 * Composer for sessions, agent pages and Home. What sending does is up to the owner:
 * a session sends a turn, an agent page or Home starts a session.
 */
export function Composer({
	draft,
	onDraftChange,
	defaultAgentId,
	defaultSettings,
	onAgentIdChange,
	onSettingsChange,
	placeholder = "Ask anything...",
	onSend,
	isRunning = false,
	onStop,
}: ComposerProps) {
	const { data: yourAgents } = useQuery(myAgentsListQueryOptions());
	const { data: allAgents } = useQuery(agentsListQueryOptions());
	const { data: models } = useQuery(modelsListQueryOptions());

	/*
	 * Local, so picking is instant; owners that keep these (a session) listen through
	 * `onAgentIdChange` / `onSettingsChange` and pass them back as defaults next mount.
	 */
	const [agentId, setAgentId] = useState(defaultAgentId);
	const [modelId, setModelId] = useState<string | null>(
		defaultSettings?.modelId ?? null,
	);
	const [effort, setEffort] = useState<EffortLevel | null>(
		defaultSettings?.effort ?? null,
	);
	const [permissionMode, setPermissionMode] = useState<PermissionMode>(
		defaultSettings?.permissionMode ?? "ask",
	);
	const [attachments, setAttachments] = useState<Attachment[]>([]);

	const model = models?.find((m) => m.id === modelId) ?? models?.[0];
	// Derived, not synced: switching to a model without the chosen level shows its default,
	// and switching back restores the user's choice.
	const effectiveEffort = model ? resolveEffort(model, effort) : null;

	const canSend =
		!isRunning && (draft.trim().length > 0 || attachments.length > 0);

	function currentSettings(
		patch: Partial<{
			modelId: string;
			effort: EffortLevel | null;
			permissionMode: PermissionMode;
		}> = {},
	): SessionSettings | null {
		const nextModel = models?.find(
			(m) => m.id === (patch.modelId ?? model?.id),
		);
		if (!nextModel) return null;
		return {
			modelId: nextModel.id,
			effort: resolveEffort(
				nextModel,
				patch.effort === undefined ? effort : patch.effort,
			),
			permissionMode: patch.permissionMode ?? permissionMode,
		};
	}

	function handleAgentIdChange(value: string | null) {
		setAgentId(value);
		onAgentIdChange?.(value);
	}

	function handleModelChange(value: string) {
		setModelId(value);
		const settings = currentSettings({ modelId: value });
		if (settings) onSettingsChange?.(settings);
	}

	function handleEffortChange(value: EffortLevel) {
		setEffort(value);
		const settings = currentSettings({ effort: value });
		if (settings) onSettingsChange?.(settings);
	}

	function handlePermissionModeChange(value: PermissionMode) {
		setPermissionMode(value);
		const settings = currentSettings({ permissionMode: value });
		if (settings) onSettingsChange?.(settings);
	}

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
		const settings = currentSettings();
		// No settings means the models list hasn't loaded yet.
		if (!canSend || !settings) return;
		onSend?.({
			text: draft.trim(),
			agentId,
			settings,
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
						onValueChange={handleAgentIdChange}
						yourAgents={yourAgents}
						allAgents={allAgents}
					/>
					<PromptInputSelect
						label="Permissions"
						icon={<ShieldIcon />}
						value={permissionMode}
						onValueChange={handlePermissionModeChange}
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
							onValueChange={handleModelChange}
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
							onValueChange={handleEffortChange}
							options={model.effortLevels.map((level) => EFFORT_OPTIONS[level])}
							data-testid="composer-effort"
						/>
					) : null}
					{isRunning && onStop ? (
						<PromptInputAction tooltip="Stop the reply">
							<Button
								size="icon-sm"
								aria-label="Stop"
								onClick={onStop}
								data-testid="composer-stop"
							>
								<SquareIcon className="fill-current" />
							</Button>
						</PromptInputAction>
					) : (
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
					)}
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
