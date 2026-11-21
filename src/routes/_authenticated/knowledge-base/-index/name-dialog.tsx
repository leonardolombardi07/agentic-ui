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
import { NodeNameSchema } from "@/lib/api/types/knowledge-base";

type NameDialogProps = {
	title: string;
	description: string;
	submitLabel: string;
	initialName?: string;
	isPending: boolean;
	onSubmit: (name: string) => void;
	onClose: () => void;
};

/** Asks for one name: a new folder's, or a new one for a file or folder. Mounted only while open. */
export function NameDialog({
	title,
	description,
	submitLabel,
	initialName = "",
	isPending,
	onSubmit,
	onClose,
}: NameDialogProps) {
	const [name, setName] = useState(initialName);
	const [error, setError] = useState<string>();

	function handleSubmit(event: FormEvent) {
		event.preventDefault();
		const parsed = NodeNameSchema.safeParse(name);
		if (!parsed.success) {
			setError(parsed.error.issues[0]?.message);
			return;
		}
		onSubmit(parsed.data);
	}

	return (
		<Dialog
			open
			onOpenChange={(open) => {
				if (!open) onClose();
			}}
		>
			<DialogContent
				className="w-[min(440px,calc(100vw-2rem))]"
				data-testid="kb-name-dialog"
			>
				<form onSubmit={handleSubmit} className="flex flex-col gap-4 p-6">
					<div className="flex flex-col gap-1">
						<DialogTitle>{title}</DialogTitle>
						<DialogDescription>{description}</DialogDescription>
					</div>
					<div className="flex flex-col gap-1.5">
						<Label htmlFor="kb-name">Name</Label>
						<Input
							id="kb-name"
							autoFocus
							value={name}
							onChange={(event) => setName(event.target.value)}
							onFocus={(event) => {
								// Renaming a file usually keeps the extension, so select only the stem.
								const dot = event.target.value.lastIndexOf(".");
								event.target.setSelectionRange(
									0,
									dot > 0 ? dot : event.target.value.length,
								);
							}}
							aria-invalid={Boolean(error)}
							data-testid="kb-name-input"
						/>
					</div>
					{error ? (
						<p
							role="alert"
							className="text-sm text-destructive-foreground"
							data-testid="kb-name-error"
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
							disabled={isPending}
							data-testid="kb-name-submit"
						>
							{submitLabel}
						</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	);
}
