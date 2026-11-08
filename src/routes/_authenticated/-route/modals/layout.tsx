import { Radio } from "@base-ui/react/radio";
import { RadioGroup } from "@base-ui/react/radio-group";
import { cn } from "cn";
import {
	Columns2Icon,
	LayoutGridIcon,
	type LucideIcon,
	SquareIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { useWorkspaceCommands } from "../../-shared/workspace/commands";
import {
	LAYOUT_LIMITS,
	LAYOUT_PRESETS,
	type LayoutPresetId,
	type LayoutSettings,
	presetOf,
	useLayoutSettings,
} from "../../-shared/workspace/settings";

const PRESETS: {
	id: LayoutPresetId;
	label: string;
	description: string;
	icon: LucideIcon;
}[] = [
	{
		id: "simple",
		label: "Simple",
		description:
			"One thing on screen at a time. No tabs or splits: opening something replaces what you see.",
		icon: SquareIcon,
	},
	{
		id: "standard",
		label: "Standard",
		description: "Up to 5 tabs, and two sessions side by side.",
		icon: Columns2Icon,
	},
	{
		id: "advanced",
		label: "Advanced",
		description:
			"Up to 4 groups side by side, 10 tabs each. Full groups close their oldest tab.",
		icon: LayoutGridIcon,
	},
];

const GROUP_OPTIONS = range(LAYOUT_LIMITS.groups.min, LAYOUT_LIMITS.groups.max);
const TAB_OPTIONS = [1, 3, 5, 10] as const;

/**
 * Settings > General > Layout: a preset (Simple leads, for anyone who wants the
 * calmest screen), then the individual limits. Changing a limit makes it "Custom".
 */
export function LayoutSettingsSection() {
	const settings = useLayoutSettings((s) => s);
	const commands = useWorkspaceCommands();
	const preset = presetOf(settings);
	const set = (patch: Partial<LayoutSettings>) =>
		commands.setLayoutSettings(patch);
	const tabOptions = TAB_OPTIONS.includes(
		settings.maxTabsPerGroup as (typeof TAB_OPTIONS)[number],
	)
		? [...TAB_OPTIONS]
		: [...TAB_OPTIONS, settings.maxTabsPerGroup].sort((a, b) => a - b);

	return (
		<section className="mt-6 flex flex-col gap-4" data-testid="layout-settings">
			<div className="flex flex-col gap-1">
				<h3 id="layout-preset-label" className="text-sm font-medium">
					Layout
				</h3>
				<p className="text-sm text-muted-foreground">
					How much the workspace shows at once. Lowering a limit closes the tabs
					that no longer fit; your sessions stay in the side panel.
				</p>
			</div>

			<RadioGroup
				value={preset}
				onValueChange={(value) => {
					const id = PRESETS.find((p) => p.id === value)?.id;
					if (id) set(LAYOUT_PRESETS[id]);
				}}
				aria-labelledby="layout-preset-label"
				className="grid gap-2 sm:grid-cols-3"
				data-testid="layout-presets"
			>
				{PRESETS.map((option) => (
					<PresetCard
						key={option.id}
						{...option}
						highlighted={option.id === "simple"}
					/>
				))}
			</RadioGroup>
			{preset === "custom" ? (
				<p
					className="text-xs text-muted-foreground"
					data-testid="layout-custom"
				>
					Custom: your own mix of the settings below. Pick a layout above to
					start over from it.
				</p>
			) : null}

			<div className="flex flex-col">
				<SettingRow
					id="layout-groups"
					label="Groups side by side"
					description="How many sessions or files can share the screen. 1 turns off splitting."
				>
					<Segmented
						labelledBy="layout-groups"
						value={settings.maxGroups}
						options={GROUP_OPTIONS.map((n) => ({ value: n, label: String(n) }))}
						onChange={(maxGroups) => set({ maxGroups })}
						testId="layout-max-groups"
					/>
				</SettingRow>
				<SettingRow
					id="layout-tabs"
					label="Tabs per group"
					description="1 hides the tab bar when there's a single group."
				>
					<Segmented
						labelledBy="layout-tabs"
						value={settings.maxTabsPerGroup}
						options={tabOptions.map((n) => ({ value: n, label: String(n) }))}
						onChange={(maxTabsPerGroup) => set({ maxTabsPerGroup })}
						testId="layout-max-tabs"
					/>
				</SettingRow>
				<SettingRow
					id="layout-full"
					label="When a group is full"
					description="What happens when you open something in a group that has no room left."
				>
					<Segmented
						labelledBy="layout-full"
						value={settings.whenGroupFull}
						options={[
							{ value: "replace", label: "Close the oldest tab" },
							{ value: "warn", label: "Ask me to close one" },
						]}
						onChange={(whenGroupFull) => set({ whenGroupFull })}
						testId="layout-when-full"
					/>
				</SettingRow>
				<SettingRow
					id="layout-panes"
					label="Session panels"
					description="Files, Context and the other panels of a session."
				>
					<Segmented
						labelledBy="layout-panes"
						value={settings.sessionPanes}
						options={[
							{ value: "auto", label: "Beside the chat" },
							{ value: "overlay", label: "Over the chat" },
						]}
						onChange={(sessionPanes) => set({ sessionPanes })}
						testId="layout-panes"
					/>
				</SettingRow>
			</div>
		</section>
	);
}

function PresetCard({
	id,
	label,
	description,
	icon: Icon,
	highlighted,
}: {
	id: LayoutPresetId;
	label: string;
	description: string;
	icon: LucideIcon;
	highlighted: boolean;
}) {
	return (
		<Radio.Root
			value={id}
			className={cn(
				"group/card relative flex cursor-pointer flex-col items-start gap-2 rounded-xl border p-3.5 text-left outline-none transition-colors duration-120 ease-out select-none focus-visible:ring-2 focus-visible:ring-ring",
				"border-border bg-control hover:bg-control-hover",
				"data-checked:border-brand data-checked:bg-brand-soft",
			)}
			data-testid={`layout-preset-${id}`}
		>
			<span className="flex w-full items-center gap-2">
				<span
					className={cn(
						"flex size-8 items-center justify-center rounded-lg bg-accent text-muted-foreground",
						"group-data-checked/card:bg-brand group-data-checked/card:text-brand-foreground",
						highlighted && "bg-brand/15 text-brand-text",
					)}
				>
					<Icon aria-hidden className="size-4" />
				</span>
				<span className="text-sm font-medium">{label}</span>
				{highlighted ? (
					<span className="ml-auto rounded-full bg-brand px-2 py-0.5 text-[11px] font-medium text-brand-foreground">
						Easiest
					</span>
				) : null}
			</span>
			<span className="text-xs text-muted-foreground">{description}</span>
		</Radio.Root>
	);
}

function SettingRow({
	id,
	label,
	description,
	children,
}: {
	id: string;
	label: string;
	description: string;
	children: ReactNode;
}) {
	return (
		<div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-border border-t py-4">
			<div className="flex min-w-48 flex-1 flex-col gap-1">
				<span id={id} className="text-sm font-medium">
					{label}
				</span>
				<span className="text-sm text-muted-foreground">{description}</span>
			</div>
			{children}
		</div>
	);
}

/** One choice among a few, as a segmented control (same look as the theme picker). */
function Segmented<T extends string | number>({
	labelledBy,
	value,
	options,
	onChange,
	testId,
}: {
	labelledBy: string;
	value: T;
	options: { value: T; label: string }[];
	onChange: (value: T) => void;
	testId: string;
}) {
	return (
		<RadioGroup
			value={value}
			onValueChange={(next) => {
				const option = options.find((o) => o.value === next);
				if (option) onChange(option.value);
			}}
			aria-labelledby={labelledBy}
			className="flex shrink-0 gap-0.5 rounded-lg border border-input bg-control p-0.5"
			data-testid={testId}
		>
			{options.map((option) => (
				<Radio.Root
					key={option.value}
					value={option.value}
					className={cn(
						"flex h-7 min-w-8 cursor-pointer items-center justify-center rounded-md px-2.5 text-sm text-muted-foreground tabular-nums outline-none transition-colors duration-120 ease-out select-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring",
						"data-checked:bg-accent data-checked:text-foreground",
					)}
					data-testid={`${testId}-${option.value}`}
				>
					{option.label}
				</Radio.Root>
			))}
		</RadioGroup>
	);
}

function range(min: number, max: number): number[] {
	return Array.from({ length: max - min + 1 }, (_, i) => min + i);
}
