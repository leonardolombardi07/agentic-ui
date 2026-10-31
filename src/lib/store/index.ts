import { useSyncExternalStore } from "react";
import type { z } from "zod";

type Options<TSchema extends z.ZodType> = {
	/** localStorage key. Bump a version suffix when the schema changes incompatibly. */
	key: string;
	/** Persisted data is validated on load; anything invalid falls back to `initialState`. */
	schema: TSchema;
	/** Also the server snapshot, so it must be deterministic (no random ids). */
	initialState: z.output<TSchema>;
	debounceMs?: number;
};

export type PersistedStore<T> = {
	getState: () => T;
	/** Return the same object to signal "no change": listeners are not notified. */
	setState: (update: (prev: T) => T) => void;
	subscribe: (listener: () => void) => () => void;
	/** The selector must return a stable value (a primitive or an existing reference). */
	useStore: <S>(selector: (state: T) => S) => S;
};

/**
 * Tiny external store persisted to localStorage.
 *
 * Why not zustand (Routes.md suggests it): we only need getState() outside React,
 * persistence and an SSR-safe hook, which is ~60 lines on top of useSyncExternalStore.
 * The API mirrors zustand closely, so swapping later is mechanical.
 *
 * SSR: on the server the state is always `initialState` and is never written (writes
 * only happen in effects and event handlers). On the client the persisted state loads
 * synchronously at module init, so `getState()` is correct even in the first effect,
 * while the hook still hydrates with `initialState` and then updates.
 */
export function createPersistedStore<TSchema extends z.ZodType>({
	key,
	schema,
	initialState,
	debounceMs = 300,
}: Options<TSchema>): PersistedStore<z.output<TSchema>> {
	type T = z.output<TSchema>;
	const listeners = new Set<() => void>();
	let timer: ReturnType<typeof setTimeout> | undefined;
	let state = load() ?? initialState;

	function load(): T | undefined {
		if (typeof window === "undefined") return undefined;
		try {
			const raw = window.localStorage.getItem(key);
			if (raw === null) return undefined;
			const parsed = schema.safeParse(JSON.parse(raw));
			return parsed.success ? parsed.data : undefined;
		} catch {
			return undefined;
		}
	}

	function flush() {
		if (timer === undefined) return;
		clearTimeout(timer);
		timer = undefined;
		try {
			window.localStorage.setItem(key, JSON.stringify(state));
		} catch {
			// Storage full or blocked: the in-memory state still works.
		}
	}

	if (typeof window !== "undefined") {
		window.addEventListener("pagehide", flush);
	}

	function getState() {
		return state;
	}

	function setState(update: (prev: T) => T) {
		const next = update(state);
		if (Object.is(next, state)) return;
		state = next;
		if (timer !== undefined) clearTimeout(timer);
		timer = setTimeout(flush, debounceMs);
		for (const listener of listeners) listener();
	}

	function subscribe(listener: () => void) {
		listeners.add(listener);
		return () => {
			listeners.delete(listener);
		};
	}

	function useStore<S>(selector: (state: T) => S): S {
		return useSyncExternalStore(
			subscribe,
			() => selector(state),
			() => selector(initialState),
		);
	}

	return { getState, setState, subscribe, useStore };
}
