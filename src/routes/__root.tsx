import { TanStackDevtools } from "@tanstack/react-devtools";
import type { QueryClient } from "@tanstack/react-query";
import {
	createRootRouteWithContext,
	HeadContent,
	Scripts,
} from "@tanstack/react-router";
import { APP_DESCRIPTION, APP_NAME, seo } from "@/lib/seo";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
import globalCss from "../global.css?url";
import { tanstackQueryPlugin } from "./-root/tanstack-query";
import { tanstackRouterPLugin } from "./-root/tanstack-router";

interface MyRouterContext {
	queryClient: QueryClient;
}


export const Route = createRootRouteWithContext<MyRouterContext>()({
	head: () => ({
		meta: [
			{
				charSet: "utf-8",
			},
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1",
			},
			...seo({ description: APP_DESCRIPTION }),
			{ name: "application-name", content: APP_NAME },
			{ property: "og:site_name", content: APP_NAME },
			{ property: "og:type", content: "website" },
			// Every page is behind auth, so there's nothing for search engines to index.
			{ name: "robots", content: "noindex, nofollow" },
		],
		links: [
			{
				rel: "stylesheet",
				href: globalCss,
			},
		],
	}),
	shellComponent: RootDocument,
});

function RootDocument({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en" suppressHydrationWarning>
			<head>
				{/** biome-ignore lint/security/noDangerouslySetInnerHtml: This is a safe script */}
				<script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
				<HeadContent />
			</head>

			<body className="font-sans antialiased wrap-anywhere selection:bg-brand-soft">
				{children}

				<TanStackDevtools
					config={{
						position: "bottom-right",
					}}
					plugins={[tanstackRouterPLugin, tanstackQueryPlugin]}
				/>
				<Scripts />
			</body>
		</html>
	);
}
