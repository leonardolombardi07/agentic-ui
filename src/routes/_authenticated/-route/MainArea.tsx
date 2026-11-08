import { ClientOnly, Outlet } from "@tanstack/react-router";
import { Activity } from "react";
import { Workspace } from "../-shared/workspace/Workspace";
import { useMainMode } from "./use-main-mode";

/*
 * The workspace is rendered here, not by the `sessions` route, so it stays mounted on
 * every authenticated route and is only hidden on pages (Routes.md, Q1). Nothing that must
 * keep running may live in its effects: <Activity> runs effect cleanups while hidden.
 */
export function MainArea() {
	const mode = useMainMode();

	return (
		<main className="relative min-w-0 flex-1">
			{/* Client-only: it lives in localStorage. */}
			<ClientOnly>
				<Activity mode={mode === "workspace" ? "visible" : "hidden"}>
					<Workspace />
				</Activity>
			</ClientOnly>

			{/* Workspace routes render null (they only sync the store); pages render on top. */}
			{mode === "page" ? (
				<div className="absolute inset-0 overflow-auto bg-background">
					<Outlet />
				</div>
			) : (
				<Outlet />
			)}
		</main>
	);
}
