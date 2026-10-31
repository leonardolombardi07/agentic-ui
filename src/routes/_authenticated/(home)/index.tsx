import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";
import { currentUserQueryOptions } from "@/lib/api/users/queries";
import { Composer } from "../-shared/composer";
import { useStartSession } from "../-shared/use-start-session";
import { homeDraft } from "./-index/draft";
import { NeedsAction } from "./-index/needs-action";

export const Route = createFileRoute("/_authenticated/(home)/")({
	// Cached for the whole visit, so this only waits on the first load.
	loader: ({ context: { queryClient } }) =>
		queryClient.ensureQueryData(currentUserQueryOptions()),
	component: Home,
});

/** What needs the user now, plus a composer to start something new. */
function Home() {
	const startSession = useStartSession();
	const draft = homeDraft.useStore((state) => state);

	return (
		<div className="flex min-h-full flex-col" data-testid="home">
			<div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 pt-8 pb-4">
				<Greeting />
				<Suspense
					fallback={<p className="text-sm text-muted-foreground">Loading...</p>}
				>
					<NeedsAction />
				</Suspense>
			</div>
			{/* Same as an agent page: sending starts a session and opens it. */}
			<div className="sticky bottom-0 bg-linear-to-t from-background from-70% to-transparent pt-6">
				<div className="mx-auto w-full max-w-3xl px-4 pb-4">
					<Composer
						draft={draft}
						onDraftChange={(value) => homeDraft.setState(() => value)}
						defaultAgentId={null}
						placeholder="Start a new session..."
						onSend={startSession}
					/>
				</div>
			</div>
		</div>
	);
}

function Greeting() {
	const { data: user } = useSuspenseQuery(currentUserQueryOptions());
	return (
		<h1 className="text-2xl font-medium" data-testid="home-greeting">
			Hello, {user.firstName}!
		</h1>
	);
}
