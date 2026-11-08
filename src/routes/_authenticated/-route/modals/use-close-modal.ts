import { useRouter } from "@tanstack/react-router";

/**
 * Close the open modal. If it was opened from inside the app, go Back, so closing
 * leaves no history entry behind (and Forward reopens it). If it came from a deep link
 * or a reload, there's nothing of ours to go back to: drop the params in place.
 */
export function useCloseModal() {
	const router = useRouter();
	return function close() {
		if (router.state.location.state.modalOpenedInApp) {
			router.history.back();
			return;
		}
		void router.navigate({
			to: ".",
			search: (prev) => ({ ...prev, settings: undefined }),
			replace: true,
		});
	};
}
