import { createFileRoute } from "@tanstack/react-router";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/admin/")({
	head: () => ({
		meta: seo({
			title: "Admin",
			description: "Manage the workspace's agents, users and settings.",
		}),
	}),
	component: Admin,
});

/** Admin page - placeholder until the page itself is designed. */
function Admin() {
	return null;
}
