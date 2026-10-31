import { FileIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PromptInputAction } from "./actions";

type PromptInputAttachment = {
	id: string;
	name: string;
	/** Bytes. */
	size: number;
};

type PromptInputAttachmentsProps = {
	attachments: readonly PromptInputAttachment[];
	onRemove: (id: string) => void;
};

/** Chips for files added to the prompt. Renders nothing when empty. */
function PromptInputAttachments({
	attachments,
	onRemove,
}: PromptInputAttachmentsProps) {
	if (attachments.length === 0) return null;
	return (
		<ul
			aria-label="Attachments"
			className="flex flex-wrap gap-1.5 px-1 pt-1"
			data-testid="prompt-input-attachments"
		>
			{attachments.map((attachment) => (
				<li
					key={attachment.id}
					className="flex max-w-60 items-center gap-1.5 rounded-lg border border-border bg-control-hover py-0.5 pr-0.5 pl-2 text-xs"
					data-testid="prompt-input-attachment"
				>
					<FileIcon className="size-3.5 shrink-0 text-muted-foreground" />
					<span
						className="min-w-0 truncate font-medium"
						title={attachment.name}
					>
						{attachment.name}
					</span>
					<span className="shrink-0 text-muted-foreground">
						{formatBytes(attachment.size)}
					</span>
					<PromptInputAction tooltip={`Remove ${attachment.name}`}>
						<Button
							variant="ghost"
							size="icon-xs"
							aria-label={`Remove ${attachment.name}`}
							onClick={() => onRemove(attachment.id)}
							data-testid="prompt-input-attachment-remove"
						>
							<XIcon />
						</Button>
					</PromptInputAction>
				</li>
			))}
		</ul>
	);
}

function formatBytes(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export { PromptInputAttachments };
export type { PromptInputAttachment, PromptInputAttachmentsProps };
