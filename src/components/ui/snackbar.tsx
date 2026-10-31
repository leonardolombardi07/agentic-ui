import { Toast } from "@base-ui/react/toast";
import { XIcon } from "lucide-react";

const manager = Toast.createToastManager();

/** Imperative API, so code outside React (store commands, route effects) can show messages too. */
export const snackbar = {
	show(message: string) {
		// One at a time, like Material snackbars: the newest replaces whatever is showing.
		manager.close();
		manager.add({ description: message });
	},
};

/** Mount once near the root; `snackbar.show()` renders into it. */
export function SnackbarProvider({ children }: { children: React.ReactNode }) {
	return (
		<Toast.Provider toastManager={manager} limit={1} timeout={4000}>
			{children}
			<Toast.Portal>
				<Toast.Viewport
					data-slot="snackbar-viewport"
					className="fixed bottom-6 left-1/2 z-50 w-[min(28rem,calc(100vw-2rem))] -translate-x-1/2"
				>
					<SnackbarList />
				</Toast.Viewport>
			</Toast.Portal>
		</Toast.Provider>
	);
}

function SnackbarList() {
	const { toasts } = Toast.useToastManager();
	return toasts.map((toast) => (
		<Toast.Root
			key={toast.id}
			toast={toast}
			data-slot="snackbar"
			data-testid="snackbar"
			className="absolute inset-x-0 bottom-0 flex items-center gap-2 rounded-md bg-foreground py-2 pr-2 pl-4 text-sm text-background shadow-lg transition-[opacity,transform] duration-200 data-ending-style:translate-y-2 data-ending-style:opacity-0 data-limited:opacity-0 data-starting-style:translate-y-2 data-starting-style:opacity-0"
		>
			<Toast.Description className="min-w-0 flex-1" />
			<Toast.Close
				aria-label="Dismiss"
				className="flex size-6 shrink-0 items-center justify-center rounded-sm outline-none hover:bg-background/15 focus-visible:ring-2 focus-visible:ring-background/50 [&_svg]:size-4"
				data-testid="snackbar-close"
			>
				<XIcon />
			</Toast.Close>
		</Toast.Root>
	));
}
