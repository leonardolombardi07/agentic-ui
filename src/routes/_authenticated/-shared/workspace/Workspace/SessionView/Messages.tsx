import type { UIMessage } from "@tanstack/ai-react";
import { cn } from "cn";
import { ChevronRightIcon, WrenchIcon } from "lucide-react";
import { useLayoutEffect, useRef } from "react";

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
}: {
	message: UIMessage;
	isStreaming: boolean;
}) {
	if (message.role === "user") {
		return (
			<div
				className="ml-auto max-w-[85%] rounded-2xl bg-muted px-4 py-2.5 text-sm whitespace-pre-wrap"
				data-testid="message-user"
			>
				{message.parts.map((part, index) =>
					part.type === "text" ? (
						// Parts have no id; their order never changes.
						// biome-ignore lint/suspicious/noArrayIndexKey: see above
						<span key={index}>{part.content}</span>
					) : null,
				)}
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
							<p key={index} className="whitespace-pre-wrap">
								{part.content}
							</p>
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
