import type { TanStackDevtoolsReactPlugin } from "@tanstack/react-devtools";
import { QueryClient } from "@tanstack/react-query";
import { ReactQueryDevtoolsPanel } from "@tanstack/react-query-devtools";

export const tanstackQueryPlugin: TanStackDevtoolsReactPlugin = {
	name: "Tanstack Query",
	render: <ReactQueryDevtoolsPanel />,
};

export function getContext() {
	const queryClient = new QueryClient();
	return { queryClient };
}

export function TanstackQueryProvider() {}
