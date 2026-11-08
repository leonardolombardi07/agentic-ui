import type { UIMessage } from "@tanstack/ai-react";
import { cn } from "cn";
import { ChevronRightIcon, WrenchIcon } from "lucide-react";
import { useLayoutEffect, useRef } from "react";
import type { SessionFile } from "@/lib/api/types/file";
import { fileIcon, formatBytes } from "@/lib/file-preview";
import { Markdown } from "@/lib/markdown";
import { messageFiles, userVisibleText } from "./attachments";

/** How close to the bottom still counts as "following" the reply, in px. */
const STICK_THRESHOLD = 80;

type MessagesProps = {
	messages: ReadonlyArray<UIMessage>;
	/** A reply is streaming: the last assistant message may still grow. */
	isRunning: boolean;
	/** Shown when there are no messages yet. */
	emptyState: React.ReactNode;
	/** Rendered under the last message, e.g. an error with a retry. */
	footer?: React.ReactNode;
	/** The session's files, to show what each user message attached. */
	files: ReadonlyArray<SessionFile>;
	/** Opens a file: in the Files pane, or as a tab in the other group (`toSide`). */
	onOpenFile: (fileId: string, options: { toSide: boolean }) => void;
};

/**
 * The transcript. Follows new text while the user is at the bottom, and stays put
 * once they scroll up to read.
 */
export function Messages({
	messages,
	isRunning,
	emptyState,
	footer,
	files,
	onOpenFile,
}: MessagesProps) {
	const scrollRef = useRef<HTMLDivElement>(null);
	const stickToBottom = useRef(true);

	function handleScroll() {
		const el = scrollRef.current;
		if (!el) return;
		stickToBottom.current =
			el.scrollHeight - el.scrollTop - el.clientHeight < STICK_THRESHOLD;
	}

	// Runs on every change, so streamed text stays in view.
	useLayoutEffect(() => {
		const el = scrollRef.current;
		if (el && stickToBottom.current) el.scrollTop = el.scrollHeight;
	});

	return (
		<div
			ref={scrollRef}
			onScroll={handleScroll}
			className="min-h-0 flex-1 overflow-y-auto"
			data-testid="messages"
		>
			<div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6">
				{messages.length === 0
					? emptyState
					: messages.map((message, index) => (
							<Message
								key={message.id}
								message={message}
								isStreaming={isRunning && index === messages.length - 1}
								files={files}
								onOpenFile={onOpenFile}
							/>
						))}
				{footer}
			</div>
		</div>
	);
}

function Message({
	message,
	isStreaming,
	files,
	onOpenFile,
}: {
	message: UIMessage;
	isStreaming: boolean;
	files: ReadonlyArray<SessionFile>;
	onOpenFile: (fileId: string, options: { toSide: boolean }) => void;
}) {
	if (message.role === "user") {
		const attached = messageFiles(message, files);
		const text = userVisibleText(message);
		return (
			<div
				className="ml-auto flex max-w-[85%] flex-col items-end gap-1.5"
				data-testid="message-user"
			>
				{attached.length > 0 ? (
					<ul
						aria-label="Attached files"
						className="flex flex-wrap justify-end gap-1.5"
					>
						{attached.map((file) => (
							<li key={file.id}>
								<FileChip
									file={file}
									onOpen={(toSide) => onOpenFile(file.id, { toSide })}
								/>
							</li>
						))}
					</ul>
				) : null}
				{text ? (
					<div className="rounded-2xl bg-muted px-4 py-2.5 text-sm whitespace-pre-wrap">
						{text}
					</div>
				) : null}
			</div>
		);
	}

	const hasText = message.parts.some(
		(part) => part.type === "text" && part.content.length > 0,
	);

	return (
		<div
			className="flex flex-col gap-3 text-sm leading-relaxed"
			data-testid="message-assistant"
		>
			{message.parts.map((part, index) => {
				switch (part.type) {
					case "text":
						return part.content ? (
							// biome-ignore lint/suspicious/noArrayIndexKey: parts have no id and never reorder
							<Markdown key={index}>{part.content}</Markdown>
						) : null;
					case "thinking":
						return (
							<Thinking
								// biome-ignore lint/suspicious/noArrayIndexKey: parts have no id and never reorder
								key={index}
								content={part.content}
								// Still thinking until the answer starts.
								isActive={isStreaming && !hasText}
							/>
						);
					case "tool-call":
						return (
							<p
								key={part.id}
								className="flex items-center gap-1.5 text-xs text-muted-foreground"
							>
								<WrenchIcon aria-hidden className="size-3.5" />
								{part.name}
							</p>
						);
					default:
						return null;
				}
			})}
			{isStreaming && !hasText ? (
				<p
					className="animate-pulse text-muted-foreground"
					data-testid="message-pending"
				>
					Working...
				</p>
			) : null}
		</div>
	);
}

/** A file the user attached; opens it in the Files pane. */
function FileChip({
	file,
	onOpen,
}: {
	file: SessionFile;
	/** `toSide`: Ctrl/Cmd+click, which opens it as a tab in the other group. */
	onOpen: (toSide: boolean) => void;
}) {
	const Icon = fileIcon(file);
	return (
		<button
			type="button"
			onClick={(event) => onOpen(event.ctrlKey || event.metaKey)}
			aria-description="Ctrl+click opens it to the side"
			className="flex max-w-60 items-center gap-2 rounded-xl border border-border bg-background px-2.5 py-1.5 text-left text-xs outline-none transition-colors hover:bg-accent focus-visible:ring-1 focus-visible:ring-ring"
			data-testid="message-file"
		>
			<Icon aria-hidden className="size-4 shrink-0 text-muted-foreground" />
			<span className="min-w-0">
				<span className="block truncate font-medium" title={file.name}>
					{file.name}
				</span>
				<span className="block text-muted-foreground">
					{formatBytes(file.size)}
				</span>
			</span>
		</button>
	);
}

/** Collapsed by default: the answer matters more than how the model got there. */
function Thinking({
	content,
	isActive,
}: {
	content: string;
	isActive: boolean;
}) {
	return (
		<details className="group text-muted-foreground">
			<summary className="flex cursor-pointer list-none items-center gap-1 text-xs select-none hover:text-foreground">
				<ChevronRightIcon
					aria-hidden
					className="size-3.5 transition-transform group-open:rotate-90"
				/>
				<span className={cn(isActive && "animate-pulse")}>
					{isActive ? "Thinking..." : "Thought process"}
				</span>
			</summary>
			<p className="mt-2 border-l-2 border-border pl-3 text-xs whitespace-pre-wrap">
				{content}
			</p>
		</details>
	);
}
