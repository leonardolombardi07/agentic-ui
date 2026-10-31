import { z } from "zod";

/*
 * Settings and Customizations are modals, addressed by search params on ANY
 * authenticated route (`/agents/slides?settings=models`), not by paths. So they open
 * over whatever you were looking at, stay deep-linkable, and Back closes them.
 * Plain links elsewhere drop these params, which closes the modal.
 */

export const SettingsSectionSchema = z.enum([
	"general",
	"models",
	"appearance",
	"shortcuts",
]);
export const CustomizationsSectionSchema = z.enum([
	"instructions",
	"skills",
	"connectors",
]);

export type SettingsSection = z.infer<typeof SettingsSectionSchema>;
export type CustomizationsSection = z.infer<typeof CustomizationsSectionSchema>;

/** `.catch(undefined)`: an unknown section in a URL just means "no modal", never an error. */
export const ModalSearchSchema = z.object({
	settings: SettingsSectionSchema.optional().catch(undefined),
	customizations: CustomizationsSectionSchema.optional().catch(undefined),
});

export type ModalName = keyof z.infer<typeof ModalSearchSchema>;

export const settingsSections: { id: SettingsSection; label: string }[] = [
	{ id: "general", label: "General" },
	{ id: "models", label: "Models" },
	{ id: "appearance", label: "Appearance" },
	{ id: "shortcuts", label: "Keyboard shortcuts" },
];

export const customizationsSections: {
	id: CustomizationsSection;
	label: string;
}[] = [
	{ id: "instructions", label: "Instructions" },
	{ id: "skills", label: "Skills" },
	{ id: "connectors", label: "Connectors" },
];
