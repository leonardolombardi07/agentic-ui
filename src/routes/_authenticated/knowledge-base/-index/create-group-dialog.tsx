import { useMutation } from "@tanstack/react-query";
import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createGroupMutationOptions } from "@/lib/api/knowledge-base/queries";
import { GroupInputSchema } from "@/lib/api/types/knowledge-base";

type CreateGroupDialogProps = {
	/** Called with the new group's id, to open it and add people. */
	onCreated: (spaceId: string) => void;
	onClose: () => void;
};

/** Creates a group: a space for people from any department. Mounted only while open. */
export function CreateGroupDialog({
	onCreated,
	onClose,
}: CreateGroupDialogProps) {
	const create = useMutation(createGroupMutationOptions());
	const [name, setName] = useState("");
	const [description, setDescription] = useState("");
	const [error, setError] = useState<string>();

	function handleSubmit(event: FormEvent) {
		event.preventDefault();
		const parsed = GroupInputSchema.safeParse({ name, description });
		if (!parsed.success) {
			setError(parsed.error.issues[0]?.message);
			return;
		}
		create.mutate(parsed.data, {
			onSuccess: onCreated,
			onError: (cause) => setError(cause.message),
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
				className="w-[min(480px,calc(100vw-2rem))]"
				data-testid="kb-group-dialog"
			>
				<form onSubmit={handleSubmit} className="flex flex-col gap-4 p-6">
					<div className="flex flex-col gap-1">
						<DialogTitle>New group</DialogTitle>
						<DialogDescription>
							A group shares files between people from any department. Only the
							people you add can see it, and you will be its manager.
						</DialogDescription>
					</div>
					<div className="flex flex-col gap-1.5">
						<Label htmlFor="kb-group-name">Name</Label>
						<Input
							id="kb-group-name"
							autoFocus
							value={name}
							onChange={(event) => setName(event.target.value)}
							placeholder="Q1 pricing review"
							data-testid="kb-group-name"
						/>
					</div>
					<div className="flex flex-col gap-1.5">
						<Label htmlFor="kb-group-description">Description (optional)</Label>
						<Input
							id="kb-group-description"
							value={description}
							onChange={(event) => setDescription(event.target.value)}
							placeholder="What the group is for"
							data-testid="kb-group-description"
						/>
					</div>
					{error ? (
						<p
							role="alert"
							className="text-sm text-destructive-foreground"
							data-testid="kb-group-error"
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
							data-testid="kb-group-submit"
						>
							Create group
						</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	);
}
