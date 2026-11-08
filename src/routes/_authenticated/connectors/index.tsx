import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { PlugIcon } from "lucide-react";
import { useState } from "react";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import {
	addConnectorMutationOptions,
	connectorsListQueryOptions,
	myConnectorIdsQueryOptions,
	removeConnectorMutationOptions,
} from "@/lib/api/connectors/queries";
import { seo } from "@/lib/seo";
import { Catalog, type CatalogItem } from "../-shared/customize/catalog";
import { CatalogSearchSchema } from "../-shared/customize/search";
import { Tile } from "../-shared/customize/tile";

export const Route = createFileRoute("/_authenticated/connectors/")({
	validateSearch: CatalogSearchSchema,
	loader: ({ context: { queryClient } }) =>
		Promise.all([
			queryClient.ensureQueryData(connectorsListQueryOptions()),
			queryClient.ensureQueryData(myConnectorIdsQueryOptions()),
		]),
	head: () => ({
		meta: seo({
			title: "Connectors",
			description: "Connect your agents to the tools and services you use.",
		}),
	}),
	component: Connectors,
});

function Connectors() {
	const search = Route.useSearch();
	const navigate = Route.useNavigate();
	const { data: connectors } = useSuspenseQuery(connectorsListQueryOptions());
	const { data: myIds } = useSuspenseQuery(myConnectorIdsQueryOptions());
	const add = useMutation(addConnectorMutationOptions());
	const remove = useMutation(removeConnectorMutationOptions());
	const [pendingId, setPendingId] = useState<string>();

	const added = new Set(myIds);
	const items: CatalogItem[] = connectors.map((connector) => ({
		id: connector.id,
		name: connector.name,
		description: connector.description,
		byline: `by ${connector.publisher}`,
		category: connector.category,
		isVerified: connector.isVerified,
		icon: (
			<Tile color={connector.color} className="size-14 text-lg">
				{connector.monogram}
			</Tile>
		),
		isAdded: added.has(connector.id),
		link: {
			to: "/connectors/$connectorId",
			params: { connectorId: connector.id },
		},
	}));

	function toggle(item: CatalogItem) {
		setPendingId(item.id);
		const mutation = item.isAdded ? remove : add;
		mutation.mutate(item.id, { onSettled: () => setPendingId(undefined) });
	}

	return (
		<Catalog
			kind="connectors"
			copy={{
				noun: "connectors",
				discoverTitle: "Top connectors",
				addLabel: "Connect",
				removeLabel: "Disconnect",
				emptyYours: "You haven't connected anything yet.",
			}}
			items={items}
			search={search}
			onSearchChange={(patch) =>
				void navigate({
					search: (prev) => ({ ...prev, ...patch }),
					replace: true,
				})
			}
			onToggle={toggle}
			pendingId={pendingId}
			addMenu={
				<>
					<DropdownMenuItem
						onClick={() =>
							void navigate({
								search: (prev) => ({ ...prev, view: "discover" }),
								replace: true,
							})
						}
						data-testid="customize-add-browse"
					>
						<PlugIcon />
						Browse connectors
					</DropdownMenuItem>
					<DropdownMenuItem disabled>
						<PlugIcon />
						Add a custom connector (coming soon)
					</DropdownMenuItem>
				</>
			}
		/>
	);
}
