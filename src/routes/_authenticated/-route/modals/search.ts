import { z } from "zod";

/*
 * Settings is a modal, addressed by search params on ANY
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

export type SettingsSection = z.infer<typeof SettingsSectionSchema>;

/** `.catch(undefined)`: an unknown section in a URL just means "no modal", never an error. */
export const ModalSearchSchema = z.object({
	settings: SettingsSectionSchema.optional().catch(undefined),
});

export type ModalName = keyof z.infer<typeof ModalSearchSchema>;

export const settingsSections: { id: SettingsSection; label: string }[] = [
	{ id: "general", label: "General" },
	{ id: "models", label: "Models" },
	{ id: "appearance", label: "Appearance" },
	{ id: "shortcuts", label: "Keyboard shortcuts" },
];
