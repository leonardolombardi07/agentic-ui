import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createPromptMutationOptions } from "@/lib/api/prompts/queries";
import { PromptInputSchema } from "@/lib/api/types/prompt";

/** Write a prompt, then open its page. Mounted only while open, so it always starts empty. */
export function CreateDialog({ onClose }: { onClose: () => void }) {
	const navigate = useNavigate();
	const create = useMutation(createPromptMutationOptions());
	const [name, setName] = useState("");
	const [description, setDescription] = useState("");
	const [text, setText] = useState("");
	const [error, setError] = useState<string>();

	function handleSubmit(event: React.FormEvent) {
		event.preventDefault();
		const parsed = PromptInputSchema.safeParse({ name, description, text });
		if (!parsed.success) {
			setError(parsed.error.issues[0]?.message);
			return;
		}
		create.mutate(parsed.data, {
			onSuccess: (prompt) => {
				onClose();
				void navigate({
					to: "/prompts/$promptId",
					params: { promptId: prompt.id },
				});
			},
		});
	}

	return (
		<Dialog
			open
			onOpenChange={(open) => {
				if (!open) onClose();
			}}
		>
			<DialogContent
				className="w-[min(560px,calc(100vw-2rem))]"
				data-testid="prompt-create-dialog"
			>
				<form onSubmit={handleSubmit} className="flex flex-col gap-4 p-6">
					<div className="flex flex-col gap-1">
						<DialogTitle>Write a prompt</DialogTitle>
						<DialogDescription>
							Text you can add to any message in one click.
						</DialogDescription>
					</div>
					<div className="flex flex-col gap-1.5">
						<Label htmlFor="prompt-name">Name</Label>
						<Input
							id="prompt-name"
							autoFocus
							value={name}
							onChange={(event) => setName(event.target.value)}
							placeholder="Summarize for executives"
							data-testid="prompt-create-name"
						/>
					</div>
					<div className="flex flex-col gap-1.5">
						<Label htmlFor="prompt-description">Description (optional)</Label>
						<Input
							id="prompt-description"
							value={description}
							onChange={(event) => setDescription(event.target.value)}
							placeholder="When to use it"
							data-testid="prompt-create-description"
						/>
					</div>
					<div className="flex flex-col gap-1.5">
						<Label htmlFor="prompt-text">Prompt</Label>
						<Textarea
							id="prompt-text"
							value={text}
							onChange={(event) => setText(event.target.value)}
							className="min-h-32 text-sm"
							placeholder="Summarize the attached material in five lines..."
							data-testid="prompt-create-text"
						/>
					</div>
					{error ? (
						<p
							role="alert"
							className="text-sm text-destructive-foreground"
							data-testid="prompt-create-error"
						>
							{error}
						</p>
					) : null}
					<div className="flex justify-end gap-2">
						<Button type="button" variant="ghost" onClick={onClose}>
							Cancel
						</Button>
						<Button
							type="submit"
							disabled={create.isPending}
							data-testid="prompt-create-submit"
						>
							Create prompt
						</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	);
}
