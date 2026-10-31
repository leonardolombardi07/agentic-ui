import { type Editor, Extension, type JSONContent } from "@tiptap/core";
import { Document } from "@tiptap/extension-document";
import { HardBreak } from "@tiptap/extension-hard-break";
import { Paragraph } from "@tiptap/extension-paragraph";
import { Text } from "@tiptap/extension-text";
import { Placeholder, UndoRedo } from "@tiptap/extensions";
import { EditorContent, useEditor } from "@tiptap/react";
import { cn } from "cn";
import { useEffect, useLayoutEffect, useRef } from "react";
import { usePromptInput } from "./context";

/*
 * The value stays plain text on purpose: the schema has no marks or rich blocks,
 * so what the user sees is exactly what gets sent.
 */

type PromptInputEditorProps = {
	placeholder?: string;
	autoFocus?: boolean;
	className?: string;
	"aria-label"?: string;
	"data-testid"?: string;
};

function PromptInputEditor({
	placeholder = "",
	autoFocus = false,
	className,
	"aria-label": ariaLabel = "Prompt",
	"data-testid": testId = "prompt-input-editor",
}: PromptInputEditorProps) {
	const { value, setValue, disabled, maxHeight, submit, setEditor } =
		usePromptInput();

	/* Tiptap reads extension options once at creation; refs hand it the latest callbacks without recreating the editor. */
	const latest = useRef({ submit, setValue, placeholder });
	useLayoutEffect(() => {
		latest.current = { submit, setValue, placeholder };
	});

	const editor = useEditor({
		// The editor needs the DOM; rendering it on the server would mismatch on hydration.
		immediatelyRender: false,
		// React only cares about `value`, which `onUpdate` reports; skip a rerender per keystroke.
		shouldRerenderOnTransaction: false,
		editable: !disabled,
		autofocus: autoFocus ? "end" : false,
		content: textToDoc(value),
		extensions: [
			Document,
			Paragraph,
			Text,
			HardBreak,
			UndoRedo,
			Placeholder.configure({
				placeholder: () => latest.current.placeholder,
			}),
			SubmitOnEnter.configure({
				onSubmit: () => latest.current.submit(),
			}),
		],
		editorProps: {
			attributes: {
				role: "textbox",
				"aria-multiline": "true",
				"aria-label": ariaLabel,
				"data-testid": testId,
				class: cn(
					"px-2 py-1.5 text-base leading-6 break-words whitespace-pre-wrap text-foreground outline-none",
					"[&_p.is-editor-empty:first-child]:before:pointer-events-none [&_p.is-editor-empty:first-child]:before:float-left [&_p.is-editor-empty:first-child]:before:h-0 [&_p.is-editor-empty:first-child]:before:text-muted-foreground [&_p.is-editor-empty:first-child]:before:content-[attr(data-placeholder)]",
					className,
				),
			},
		},
		onUpdate({ editor }) {
			latest.current.setValue(getPlainText(editor));
		},
	});

	useEffect(() => {
		setEditor(editor);
		return () => setEditor(null);
	}, [editor, setEditor]);

	useEffect(() => {
		editor?.setEditable(!disabled, false);
	}, [editor, disabled]);

	// Decorations only recompute on a transaction, so nudge one when the placeholder changes.
	useEffect(() => {
		if (!editor || !placeholder) return;
		editor.view.dispatch(editor.state.tr);
	}, [editor, placeholder]);

	// Follow external changes (clear after send, restored drafts) without echoing our own updates.
	useEffect(() => {
		if (!editor || getPlainText(editor) === value) return;
		editor
			.chain()
			// Otherwise Undo right after sending would bring the sent prompt back.
			.setMeta("addToHistory", false)
			.setContent(textToDoc(value), { emitUpdate: false })
			.run();
	}, [editor, value]);

	return (
		<div
			data-slot="prompt-input-editor"
			className="min-h-9 overflow-y-auto"
			style={{ maxHeight }}
		>
			<EditorContent editor={editor} />
		</div>
	);
}

/** Enter sends; Shift+Enter and Mod+Enter fall through to HardBreak's line break. */
const SubmitOnEnter = Extension.create<{ onSubmit: () => void }>({
	name: "submitOnEnter",
	addOptions() {
		return { onSubmit: () => {} };
	},
	addKeyboardShortcuts() {
		return {
			Enter: ({ editor }) => {
				// Let an IME (e.g. Japanese) confirm its candidate instead of sending.
				if (editor.view.composing) return false;
				this.options.onSubmit();
				return true;
			},
		};
	},
});

function getPlainText(editor: Editor): string {
	return editor.getText({ blockSeparator: "\n" });
}

function textToDoc(text: string): JSONContent {
	return {
		type: "doc",
		content: text
			.split("\n")
			.map((line) =>
				line
					? { type: "paragraph", content: [{ type: "text", text: line }] }
					: { type: "paragraph" },
			),
	};
}

export { PromptInputEditor };
export type { PromptInputEditorProps };
