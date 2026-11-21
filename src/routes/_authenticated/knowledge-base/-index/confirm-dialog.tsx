import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogTitle,
} from "@/components/ui/dialog";

type ConfirmDialogProps = {
	title: string;
	description: ReactNode;
	confirmLabel: string;
	isDestructive?: boolean;
	isPending: boolean;
	onConfirm: () => void;
	onClose: () => void;
};

/** A yes/no question before something that is hard to take back. Mounted only while open. */
export function ConfirmDialog({
	title,
	description,
	confirmLabel,
	isDestructive = false,
	isPending,
	onConfirm,
	onClose,
}: ConfirmDialogProps) {
	return (
		<Dialog
			open
			onOpenChange={(open) => {
				if (!open) onClose();
			}}
		>
			<DialogContent
				className="w-[min(440px,calc(100vw-2rem))]"
				showCloseButton={false}
				data-testid="kb-confirm-dialog"
			>
				<div className="flex flex-col gap-4 p-6">
					<div className="flex flex-col gap-1.5">
						<DialogTitle>{title}</DialogTitle>
						<DialogDescription>{description}</DialogDescription>
					</div>
					<div className="flex justify-end gap-2">
						<Button variant="ghost" onClick={onClose}>
							Cancel
						</Button>
						<Button
							variant={isDestructive ? "destructive" : "default"}
							disabled={isPending}
							onClick={onConfirm}
							data-testid="kb-confirm-submit"
						>
							{confirmLabel}
						</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
