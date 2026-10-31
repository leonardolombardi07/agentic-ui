import { Select as SelectPrimitive } from "@base-ui/react/select";
import { CheckIcon, ChevronDownIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { SelectContent, SelectLabel } from "@/components/ui/select";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { usePromptInput } from "./context";

type PromptInputSelectOption<Value extends string> = {
	value: Value;
	label: string;
	description?: string;
};

type PromptInputSelectProps<Value extends string> = {
	value: Value;
	onValueChange: (value: Value) => void;
	options: readonly PromptInputSelectOption<Value>[];
	/** Names the setting ("Model", "Effort"): tooltip, accessible name and popup heading. */
	label: string;
	icon?: ReactNode;
	"data-testid"?: string;
};

/**
 * Compact setting picker for the actions row (model, effort, permission mode...).
 * A Select rather than a searchable list: these are short, and Select still jumps
 * to an option when you type its first letters.
 */
function PromptInputSelect<Value extends string>({
	value,
	onValueChange,
	options,
	label,
	icon,
	"data-testid": testId,
}: PromptInputSelectProps<Value>) {
	const { disabled } = usePromptInput();
	const current = options.find((option) => option.value === value);

	return (
		<SelectPrimitive.Root
			/*
			 * Remount when the option set changes (e.g. effort levels after a model switch).
			 * Otherwise Select re-selects by position and reports that as a user change.
			 */
			key={options.map((option) => option.value).join("|")}
			items={options.map((option) => ({
				value: option.value,
				label: option.label,
			}))}
			value={value}
			onValueChange={(next) => {
				if (next !== null) onValueChange(next);
			}}
			disabled={disabled}
		>
			<Tooltip>
				<TooltipTrigger
					render={
						<SelectPrimitive.Trigger
							aria-label={current ? `${label}: ${current.label}` : label}
							render={
								<Button
									variant="ghost"
									size="sm"
									className="max-w-44"
									data-testid={testId}
								/>
							}
						/>
					}
				>
					{icon}
					<SelectPrimitive.Value className="truncate" />
					<ChevronDownIcon className="opacity-60" />
				</TooltipTrigger>
				<TooltipContent>{label}</TooltipContent>
			</Tooltip>
			<SelectContent
				side="top"
				align="start"
				alignItemWithTrigger={false}
				className="w-64"
			>
				<SelectPrimitive.Group>
					<SelectLabel>{label}</SelectLabel>
					{options.map((option) => (
						<SelectPrimitive.Item
							key={option.value}
							value={option.value}
							className="relative flex w-full cursor-default flex-col rounded-md py-1.5 pr-8 pl-2 outline-hidden select-none data-highlighted:bg-accent data-disabled:pointer-events-none data-disabled:opacity-50"
							data-testid={testId ? `${testId}-option` : undefined}
							data-value={option.value}
						>
							<SelectPrimitive.ItemText className="text-sm text-foreground">
								{option.label}
							</SelectPrimitive.ItemText>
							{option.description ? (
								<span className="text-xs text-muted-foreground">
									{option.description}
								</span>
							) : null}
							<SelectPrimitive.ItemIndicator
								render={
									<span className="pointer-events-none absolute top-2 right-2 flex size-3.5 items-center justify-center" />
								}
							>
								<CheckIcon className="size-4" />
							</SelectPrimitive.ItemIndicator>
						</SelectPrimitive.Item>
					))}
				</SelectPrimitive.Group>
			</SelectContent>
		</SelectPrimitive.Root>
	);
}

export { PromptInputSelect };
export type { PromptInputSelectOption, PromptInputSelectProps };
