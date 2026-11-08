import { useSearch } from "@tanstack/react-router";
import { Appearance } from "./appearance";
import { LayoutSettingsSection } from "./layout";
import { SectionsModal } from "./SectionsModal";
import { customizationsSections, settingsSections } from "./search";

/** Renders whichever modal the URL asks for. Settings wins if both are present. */
export function Modals() {
	const settings = useSearch({
		from: "/_authenticated",
		select: (s) => s.settings,
	});
	const customizations = useSearch({
		from: "/_authenticated",
		select: (s) => s.customizations,
	});

	if (settings) {
		return (
			<SectionsModal
				name="settings"
				title="Settings"
				sections={settingsSections}
				current={settings}
			>
				{settings === "general" && <LayoutSettingsSection />}
				{settings === "appearance" && <Appearance />}
			</SectionsModal>
		);
	}
	if (customizations) {
		return (
			<SectionsModal
				name="customizations"
				title="Customizations"
				sections={customizationsSections}
				current={customizations}
			/>
		);
	}
	return null;
}
