import type { Editor } from "@tiptap/core";
import { cn } from "cn";
import { type ReactNode, useState } from "react";
import { PromptInputContext } from "./context";

/*
 * Chat composer modeled on prompt-kit's PromptInput (https://www.prompt-kit.com),
 * with the textarea swapped for Tiptap so we can later add inline nodes
 * (mentions, file chips, slash commands) without rewriting the component.
 *
 * Compose it from the parts re-exported below:
 *
 *   <PromptInput value onValueChange onSubmit>
 *     <PromptInputAttachments />
 *     <PromptInputEditor />
 *     <PromptInputActions>
 *       <PromptInputAddMenu />  <PromptInputSelect />  <PromptInputAction />
 *     </PromptInputActions>
 *   </PromptInput>
 */

type PromptInputProps = {
	/** Plain text. Paragraphs and line breaks are joined with "\n". */
	value?: string;
	defaultValue?: string;
	onValueChange?: (value: string) => void;
	/** Called on Enter (Shift+Enter inserts a line break). Guard empty/loading states here. */
	onSubmit?: () => void;
	/** Exposed to children through `usePromptInput`, e.g. to swap Send for Stop. */
	isLoading?: boolean;
	disabled?: boolean;
	/** Editor area grows with content up to this height, then scrolls. */
	maxHeight?: number | string;
	children: ReactNode;
} & Omit<React.ComponentProps<"div">, "onSubmit" | "defaultValue">;

function PromptInput({
	value,
	defaultValue = "",
	onValueChange,
	onSubmit,
	isLoading = false,
	disabled = false,
	maxHeight = 240,
	className,
	children,
	onClick,
	...props
}: PromptInputProps) {
	const [internalValue, setInternalValue] = useState(defaultValue);
	const [editor, setEditor] = useState<Editor | null>(null);

	function setValue(next: string) {
		if (value === undefined) setInternalValue(next);
		onValueChange?.(next);
	}

	function submit() {
		if (disabled) return;
		onSubmit?.();
	}

	function handleClick(event: React.MouseEvent<HTMLDivElement>) {
		onClick?.(event);
		const target = event.target;
		if (disabled || !editor || !(target instanceof Element)) return;
		// Portaled children (dialogs, menus) bubble through React but live outside this DOM subtree.
		if (!event.currentTarget.contains(target)) return;
		// Clicks on the editor place the caret natively; controls keep their own focus.
		if (editor.view.dom.contains(target)) return;
		if (target.closest("button, a, input, [role='button']")) return;
		editor.commands.focus("end");
	}

	return (
		<PromptInputContext.Provider
			value={{
				value: value ?? internalValue,
				setValue,
				isLoading,
				disabled,
				maxHeight,
				submit,
				editor,
				setEditor,
			}}
		>
			{/* biome-ignore lint/a11y/noStaticElementInteractions: pointer-only convenience to grow the hit area; keyboard users tab into the editor itself. */}
			{/* biome-ignore lint/a11y/useKeyWithClickEvents: same as above. */}
			<div
				data-slot="prompt-input"
				data-disabled={disabled || undefined}
				onClick={handleClick}
				className={cn(
					"flex cursor-text flex-col gap-1 rounded-xl border border-input bg-control p-2 transition-[border-color] duration-120 ease-out focus-within:border-ring",
					disabled && "cursor-not-allowed opacity-60",
					className,
				)}
				{...props}
			>
				{children}
			</div>
		</PromptInputContext.Provider>
	);
}

export { PromptInput };
export type { PromptInputProps };
export { PromptInputAction, PromptInputActions } from "./actions";
export { PromptInputAddMenu } from "./add-menu";
export {
	type PromptInputAttachment,
	PromptInputAttachments,
} from "./attachments";
export { usePromptInput } from "./context";
export { PromptInputEditor, type PromptInputEditorProps } from "./editor";
export { PromptInputSelect, type PromptInputSelectOption } from "./select";
