import { PaperclipIcon, PlusIcon } from "lucide-react";
import { type ReactNode, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { usePromptInput } from "./context";

type PromptInputAddMenuProps = {
	onFilesSelected: (files: File[]) => void;
	/** Passed to the file input, e.g. ".pdf,.xlsx" or "image/*". */
	accept?: string;
	/** Extra items after "Upload files" (skills, tools, ...). */
	children?: ReactNode;
};

/** The "+" button: a menu of things to add to the prompt. Today only files. */
function PromptInputAddMenu({
	onFilesSelected,
	accept,
	children,
}: PromptInputAddMenuProps) {
	const { disabled } = usePromptInput();
	const fileInputRef = useRef<HTMLInputElement>(null);

	function handleFilesChange(event: React.ChangeEvent<HTMLInputElement>) {
		const files = Array.from(event.target.files ?? []);
		// Reset so picking the same file again still fires `change`.
		event.target.value = "";
		if (files.length > 0) onFilesSelected(files);
	}

	return (
		<>
			<input
				ref={fileInputRef}
				type="file"
				multiple
				accept={accept}
				hidden
				tabIndex={-1}
				onChange={handleFilesChange}
				data-testid="prompt-input-file-input"
			/>
			<DropdownMenu>
				<Tooltip>
					<TooltipTrigger
						render={
							<DropdownMenuTrigger
								disabled={disabled}
								render={
									<Button
										variant="ghost"
										size="icon-sm"
										aria-label="Add files and more"
										data-testid="prompt-input-add"
									/>
								}
							/>
						}
					>
						<PlusIcon />
					</TooltipTrigger>
					<TooltipContent>Add files and more</TooltipContent>
				</Tooltip>
				<DropdownMenuContent side="top" align="start">
					<DropdownMenuItem
						onClick={() => fileInputRef.current?.click()}
						data-testid="prompt-input-upload-files"
					>
						<PaperclipIcon />
						Upload files
					</DropdownMenuItem>
					{children}
				</DropdownMenuContent>
			</DropdownMenu>
		</>
	);
}

export { PromptInputAddMenu };
export type { PromptInputAddMenuProps };
