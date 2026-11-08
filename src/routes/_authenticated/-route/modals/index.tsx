import { useSearch } from "@tanstack/react-router";
import { Appearance } from "./appearance";
import { LayoutSettingsSection } from "./layout";
import { SectionsModal } from "./SectionsModal";
import { settingsSections } from "./search";

/** Renders the modal the URL asks for. */
export function Modals() {
	const settings = useSearch({
		from: "/_authenticated",
		select: (s) => s.settings,
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
	return null;
}
