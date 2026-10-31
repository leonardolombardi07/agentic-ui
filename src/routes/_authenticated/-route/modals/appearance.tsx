import { Radio } from "@base-ui/react/radio";
import { RadioGroup } from "@base-ui/react/radio-group";
import { cn } from "cn";
import { type LucideIcon, MonitorIcon, MoonIcon, SunIcon } from "lucide-react";
import { setTheme, type Theme, ThemeSchema, useTheme } from "@/lib/theme";

const themeOptions: { value: Theme; label: string; icon: LucideIcon }[] = [
	{ value: "light", label: "Light", icon: SunIcon },
	{ value: "dark", label: "Dark", icon: MoonIcon },
	{ value: "auto", label: "System", icon: MonitorIcon },
];

/** Settings > Appearance. */
export function Appearance() {
	const theme = useTheme();

	return (
		<div className="mt-6 flex items-center justify-between gap-6 border-border border-t py-4">
			<div className="flex flex-col gap-1">
				<span id="theme-label" className="text-sm font-medium">
					Theme
				</span>
				<span className="text-sm text-muted-foreground">
					System follows your device's light or dark setting.
				</span>
			</div>
			{/* A radio group, not a toggle group: exactly one option is always selected. */}
			<RadioGroup
				value={theme}
				onValueChange={(value) => {
					const parsed = ThemeSchema.safeParse(value);
					if (parsed.success) setTheme(parsed.data);
				}}
				aria-labelledby="theme-label"
				className="flex shrink-0 gap-0.5 rounded-lg border border-input bg-control p-0.5"
				data-testid="theme-toggle"
			>
				{themeOptions.map((option) => (
					<Radio.Root
						key={option.value}
						value={option.value}
						className={cn(
							"flex h-7 cursor-pointer items-center gap-1.5 rounded-md px-2.5 text-sm text-muted-foreground outline-none transition-colors duration-120 ease-out select-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring",
							"data-checked:bg-accent data-checked:text-foreground",
						)}
						data-testid={`theme-option-${option.value}`}
					>
						<option.icon aria-hidden className="size-3.5" />
						{option.label}
					</Radio.Root>
				))}
			</RadioGroup>
		</div>
	);
}
