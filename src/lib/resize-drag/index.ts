import { useSyncExternalStore } from "react";

/*
 * Whether the user is dragging a layout splitter (the editor groups' split, the side
 * panel's edge). Layouts that react to their width read it to hold still mid-drag
 * and settle once, on release, instead of flipping back and forth under the pointer.
 */

let dragging = 0;
const listeners = new Set<() => void>();

function emit() {
	for (const listener of listeners) listener();
}

export const resizeDrag = {
	start() {
		dragging += 1;
		if (dragging === 1) emit();
	},
	end() {
		if (dragging === 0) return;
		dragging -= 1;
		if (dragging === 0) emit();
	},
};

function subscribe(listener: () => void) {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
}

export function useIsResizeDragging(): boolean {
	return useSyncExternalStore(
		subscribe,
		() => dragging > 0,
		() => false,
	);
}
