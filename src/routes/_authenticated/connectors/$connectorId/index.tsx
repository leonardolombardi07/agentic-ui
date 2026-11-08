import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { EyeIcon, PencilIcon } from "lucide-react";
import {
	addConnectorMutationOptions,
	connectorQueryOptions,
	myConnectorIdsQueryOptions,
	removeConnectorMutationOptions,
} from "@/lib/api/connectors/queries";
import { seo } from "@/lib/seo";
import { VerifiedBadge } from "../../-shared/customize/catalog";
import { Detail, DetailSection, Facts } from "../../-shared/customize/detail";
import { Tile } from "../../-shared/customize/tile";
import { ToggleButton } from "../../-shared/customize/toggle-button";

export const Route = createFileRoute(
	"/_authenticated/connectors/$connectorId/",
)({
	// Validates the connector (404 -> notFound()) and warms the cache.
	loader: ({ context: { queryClient }, params }) =>
		Promise.all([
			queryClient.ensureQueryData(connectorQueryOptions(params.connectorId)),
			queryClient.ensureQueryData(myConnectorIdsQueryOptions()),
		]),
	head: ({ loaderData }) => ({
		meta: loaderData
			? seo({
					title: loaderData[0].name,
					description: loaderData[0].description,
				})
			: seo({ title: "Connector not found" }),
	}),
	component: ConnectorPage,
});

function ConnectorPage() {
	const { connectorId } = Route.useParams();
	const { data: connector } = useSuspenseQuery(
		connectorQueryOptions(connectorId),
	);
	const { data: myIds } = useSuspenseQuery(myConnectorIdsQueryOptions());
	const add = useMutation(addConnectorMutationOptions());
	const remove = useMutation(removeConnectorMutationOptions());
	const isConnected = myIds.includes(connector.id);

	return (
		<Detail
			kind="connector"
			back={{ to: "/connectors", label: "Connectors" }}
			icon={
				<Tile color={connector.color} className="size-14 text-lg">
					{connector.monogram}
				</Tile>
			}
			title={connector.name}
			badge={connector.isVerified ? <VerifiedBadge /> : null}
			subtitle={`by ${connector.publisher}`}
			actions={
				<ToggleButton
					name={connector.name}
					isAdded={isConnected}
					isPending={add.isPending || remove.isPending}
					onToggle={() => (isConnected ? remove : add).mutate(connector.id)}
					addLabel="Connect"
					removeLabel="Disconnect"
					variant="page"
					testId="connector-toggle"
				/>
			}
		>
			<p className="text-[15px]" data-testid="connector-about">
				{connector.about}
			</p>
			<Facts
				facts={[
					{
						label: "Status",
						value: isConnected ? "Connected" : "Not connected",
					},
					{ label: "Category", value: connector.category },
					{ label: "Publisher", value: connector.publisher },
					{ label: "Tools", value: String(connector.tools.length) },
				]}
			/>
			<DetailSection title="Tools">
				<ul
					className="flex flex-col divide-y divide-border rounded-card border border-border bg-card"
					data-testid="connector-tools"
				>
					{connector.tools.map((tool) => (
						<li key={tool.name} className="flex items-start gap-3 px-4 py-3">
							{tool.access === "read" ? (
								<EyeIcon
									aria-label="Read-only"
									role="img"
									className="mt-0.5 size-4 shrink-0 text-muted-foreground"
								/>
							) : (
								<PencilIcon
									aria-label="Can make changes"
									role="img"
									className="mt-0.5 size-4 shrink-0 text-warning"
								/>
							)}
							<div className="flex min-w-0 flex-col gap-0.5">
								<span className="text-sm font-medium">{tool.name}</span>
								<span className="text-sm text-muted-foreground">
									{tool.description}
								</span>
							</div>
						</li>
					))}
				</ul>
			</DetailSection>
		</Detail>
	);
}
