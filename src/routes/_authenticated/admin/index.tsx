import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/admin/")({
	component: Admin,
});

/** Admin page - placeholder until the page itself is designed. */
function Admin() {
	return null;
}
