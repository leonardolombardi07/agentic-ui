import { mutationOptions, queryOptions } from "@tanstack/react-query";
import { notFound } from "@tanstack/react-router";
import { CONNECTORS } from "./mock-data";

/* Mock backend until the real API exists. Only the query/mutation options are public. */

/** Connectors the current user has connected. Real ownership comes with the API. */
const MY_CONNECTOR_IDS = new Set(["google-drive", "github"]);

function delay(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Every connector in the directory. */
export function connectorsListQueryOptions() {
	return queryOptions({
		queryKey: ["connectors"],
		queryFn: async () => {
			await delay(150);
			return CONNECTORS;
		},
	});
}

/** The ids of the connectors the user connected. */
export function myConnectorIdsQueryOptions() {
	return queryOptions({
		// Not under ["connectors", ...]: that prefix holds per-id details.
		queryKey: ["my-connectors"],
		queryFn: async () => {
			await delay(100);
			return [...MY_CONNECTOR_IDS];
		},
	});
}

export function connectorQueryOptions(connectorId: string) {
	return queryOptions({
		queryKey: ["connectors", connectorId],
		queryFn: async () => {
			await delay(100);
			const connector = CONNECTORS.find((c) => c.id === connectorId);
			if (!connector) throw notFound();
			return connector;
		},
		retry: false,
	});
}

/** Connects a connector. The variable is the connector id. */
export function addConnectorMutationOptions() {
	return mutationOptions({
		mutationKey: ["my-connectors", "add"],
		mutationFn: async (connectorId: string) => {
			await delay(300);
			MY_CONNECTOR_IDS.add(connectorId);
		},
		onSuccess: (_data, _connectorId, _onMutateResult, { client }) =>
			client.invalidateQueries({
				queryKey: myConnectorIdsQueryOptions().queryKey,
			}),
	});
}

/** Disconnects a connector. The variable is the connector id. */
export function removeConnectorMutationOptions() {
	return mutationOptions({
		mutationKey: ["my-connectors", "remove"],
		mutationFn: async (connectorId: string) => {
			await delay(200);
			MY_CONNECTOR_IDS.delete(connectorId);
		},
		onSuccess: (_data, _connectorId, _onMutateResult, { client }) =>
			client.invalidateQueries({
				queryKey: myConnectorIdsQueryOptions().queryKey,
			}),
	});
}
