import type { Editor } from "@tiptap/core";
import { createContext, useContext } from "react";

type PromptInputContextValue = {
	value: string;
	setValue: (value: string) => void;
	isLoading: boolean;
	disabled: boolean;
	maxHeight: number | string;
	submit: () => void;
	/** null until the editor mounts (it is created on the client only). */
	editor: Editor | null;
	setEditor: (editor: Editor | null) => void;
};

export const PromptInputContext = createContext<PromptInputContextValue | null>(
	null,
);

/** Read the composer state from any part rendered inside `PromptInput`. */
export function usePromptInput() {
	const context = useContext(PromptInputContext);
	if (!context) {
		throw new Error("usePromptInput must be used inside <PromptInput>.");
	}
	return context;
}
