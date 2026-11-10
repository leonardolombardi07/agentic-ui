import type { ModelMessage } from "@tanstack/ai";

/*
 * Transcripts for some of the seeded sessions (`store.server.ts`), so the chat
 * has history to show in dev. They exercise the markdown renderer
 * (`@/lib/markdown`): interactive tables, code blocks, alerts, task lists and
 * footnotes. Stored as TanStack AI keeps them: `ModelMessage`s per thread.
 */

export const PIPELINE_SESSION_ID = "s-q4-pipeline";
const AUTH_SESSION_ID = "s-auth-pr";

type Deal = {
	account: string;
	owner: string;
	stage: "Discovery" | "Proposal" | "Negotiation" | "Commit";
	amount: number;
	close: string;
	probability: number;
	next: string;
};

const DEALS: Deal[] = [
	{
		account: "Northwind Traders",
		owner: "Ana Souza",
		stage: "Commit",
		amount: 182_000,
		close: "2026-11-14",
		probability: 90,
		next: "Countersign MSA",
	},
	{
		account: "Contoso Health",
		owner: "Ben Ito",
		stage: "Negotiation",
		amount: 240_500,
		close: "2026-11-28",
		probability: 70,
		next: "Security review call",
	},
	{
		account: "Fabrikam Logistics",
		owner: "Ana Souza",
		stage: "Proposal",
		amount: 96_000,
		close: "2026-12-05",
		probability: 45,
		next: "Send revised pricing",
	},
	{
		account: "Tailspin Air",
		owner: "Chloe Martin",
		stage: "Commit",
		amount: 64_200,
		close: "2026-11-10",
		probability: 95,
		next: "PO in procurement",
	},
	{
		account: "Wide World Importers",
		owner: "Diego Ramos",
		stage: "Discovery",
		amount: 310_000,
		close: "2026-12-19",
		probability: 20,
		next: "Exec sponsor intro",
	},
	{
		account: "Adventure Works",
		owner: "Ben Ito",
		stage: "Proposal",
		amount: 128_750,
		close: "2026-12-12",
		probability: 50,
		next: "Pilot readout",
	},
	{
		account: "Litware Labs",
		owner: "Chloe Martin",
		stage: "Negotiation",
		amount: 77_300,
		close: "2026-11-21",
		probability: 65,
		next: "Legal redlines",
	},
	{
		account: "Proseware",
		owner: "Diego Ramos",
		stage: "Commit",
		amount: 45_900,
		close: "2026-11-07",
		probability: 95,
		next: "Kickoff scheduled",
	},
	{
		account: "Coho Winery",
		owner: "Ana Souza",
		stage: "Discovery",
		amount: 38_000,
		close: "2026-12-30",
		probability: 15,
		next: "Discovery call #2",
	},
	{
		account: "Alpine Ski House",
		owner: "Elif Kaya",
		stage: "Proposal",
		amount: 152_400,
		close: "2026-12-08",
		probability: 40,
		next: "ROI model review",
	},
	{
		account: "Blue Yonder Airlines",
		owner: "Elif Kaya",
		stage: "Negotiation",
		amount: 205_000,
		close: "2026-12-01",
		probability: 60,
		next: "Discount approval",
	},
	{
		account: "Fourth Coffee",
		owner: "Ben Ito",
		stage: "Commit",
		amount: 29_800,
		close: "2026-11-12",
		probability: 90,
		next: "Awaiting signature",
	},
	{
		account: "Graphic Design Institute",
		owner: "Chloe Martin",
		stage: "Discovery",
		amount: 54_000,
		close: "2026-12-22",
		probability: 20,
		next: "Needs assessment",
	},
	{
		account: "Humongous Insurance",
		owner: "Diego Ramos",
		stage: "Negotiation",
		amount: 388_000,
		close: "2026-12-15",
		probability: 55,
		next: "Procurement terms",
	},
	{
		account: "Lucerne Publishing",
		owner: "Ana Souza",
		stage: "Proposal",
		amount: 61_250,
		close: "2026-12-10",
		probability: 45,
		next: "Champion follow-up",
	},
	{
		account: "Margie's Travel",
		owner: "Elif Kaya",
		stage: "Commit",
		amount: 33_600,
		close: "2026-11-18",
		probability: 85,
		next: "Final pricing sign-off",
	},
	{
		account: "Relecloud",
		owner: "Ben Ito",
		stage: "Discovery",
		amount: 420_000,
		close: "2027-01-15",
		probability: 10,
		next: "Architecture workshop",
	},
	{
		account: "School of Fine Art",
		owner: "Chloe Martin",
		stage: "Proposal",
		amount: 22_400,
		close: "2026-12-03",
		probability: 50,
		next: "Budget confirmation",
	},
	{
		account: "Southridge Video",
		owner: "Diego Ramos",
		stage: "Negotiation",
		amount: 118_900,
		close: "2026-11-26",
		probability: 70,
		next: "Contract walkthrough",
	},
	{
		account: "Trey Research",
		owner: "Elif Kaya",
		stage: "Proposal",
		amount: 87_000,
		close: "2026-12-17",
		probability: 35,
		next: "Competitive bake-off",
	},
	{
		account: "VanArsdel",
		owner: "Ana Souza",
		stage: "Negotiation",
		amount: 143_300,
		close: "2026-11-30",
		probability: 65,
		next: "MSA redlines",
	},
	{
		account: "WingTip Toys",
		owner: "Chloe Martin",
		stage: "Commit",
		amount: 51_700,
		close: "2026-11-20",
		probability: 90,
		next: "Signature this week",
	},
	{
		account: "Woodgrove Bank",
		owner: "Ben Ito",
		stage: "Proposal",
		amount: 265_000,
		close: "2026-12-18",
		probability: 40,
		next: "InfoSec questionnaire",
	},
	{
		account: "A. Datum Corp",
		owner: "Diego Ramos",
		stage: "Discovery",
		amount: 72_500,
		close: "2027-01-08",
		probability: 15,
		next: "Use-case mapping",
	},
];

const usd = new Intl.NumberFormat("en-US", {
	style: "currency",
	currency: "USD",
	maximumFractionDigits: 0,
});

function dealsTable(): string {
	const rows = DEALS.map(
		(d) =>
			`| **${d.account}** | ${d.owner} | ${d.stage} | ${usd.format(d.amount)} | ${d.close} | ${d.probability}% | ${usd.format((d.amount * d.probability) / 100)} | ${d.next} |`,
	);
	return [
		"| Account | Owner | Stage | Amount | Close date | Probability | Weighted | Next step |",
		"| --- | --- | --- | ---: | --- | ---: | ---: | --- |",
		...rows,
	].join("\n");
}

function stageSummary(): string {
	const stages = ["Commit", "Negotiation", "Proposal", "Discovery"] as const;
	const rows = stages.map((stage) => {
		const deals = DEALS.filter((d) => d.stage === stage);
		const amount = deals.reduce((sum, d) => sum + d.amount, 0);
		const weighted = deals.reduce(
			(sum, d) => sum + (d.amount * d.probability) / 100,
			0,
		);
		return `| ${stage} | ${deals.length} | ${usd.format(amount)} | ${usd.format(weighted)} |`;
	});
	return [
		"| Stage | Deals | Pipeline | Weighted |",
		"| --- | ---: | ---: | ---: |",
		...rows,
	].join("\n");
}

const PIPELINE_ANSWER = `Here's the Q4 pipeline as of **Oct 31**. I pulled every open opportunity closing this quarter from the CRM export and weighted each one by its stage probability.

## Summary by stage

${stageSummary()}

> [!TIP]
> Click a column header to sort, or use the search box to filter, e.g. type \`Ana\` to see one rep's deals. The copy menu pastes straight into a spreadsheet.

## All open deals

${dealsTable()}

## What stands out

1. **Concentration risk**: Humongous Insurance and Relecloud are a quarter of the pipeline but only ~16% of the weighted forecast.[^1]
2. **Commit is healthy**: six deals, all with a scheduled next step and a close date in November.
3. **Discovery is stale**: four of the five Discovery deals haven't moved stage in 30+ days.[^2]

> [!WARNING]
> Woodgrove Bank's InfoSec questionnaire is due **Nov 14**. If it slips, the deal likely moves to Q1.

### Suggested follow-ups

- [x] Flag Commit deals without a signed order form
- [x] Share the weighted forecast with finance
- [ ] Book exec sponsor calls for the two largest Discovery deals
- [ ] Re-score probabilities for deals older than 60 days

[^1]: Relecloud is in Discovery at 10%, so its $420K counts as $42K in the weighted view.
[^2]: Based on the \`stage_changed_at\` field in the export; Coho Winery is the exception.
`;

const QUERY_ANSWER = `Sure. This is the query I ran against the warehouse; it's the same logic as the table above, so you can rerun it next week:

\`\`\`sql
-- Open Q4 opportunities, weighted by stage probability
select
  a.name                         as account,
  o.owner_name                   as owner,
  o.stage,
  o.amount,
  o.close_date,
  o.probability,
  o.amount * o.probability / 100 as weighted
from opportunities o
join accounts a on a.id = o.account_id
where o.is_closed = false
  and o.close_date between '2026-10-01' and '2026-12-31'
order by weighted desc;
\`\`\`

And a quick way to get the same numbers in Python, if you'd rather work from the CSV:

\`\`\`python
import pandas as pd

deals = pd.read_csv("q4-pipeline.csv", parse_dates=["close_date"])
deals["weighted"] = deals["amount"] * deals["probability"] / 100

summary = (
    deals.groupby("stage")
    .agg(deals=("account", "count"), pipeline=("amount", "sum"), weighted=("weighted", "sum"))
    .sort_values("weighted", ascending=False)
)
print(summary.to_markdown())
\`\`\`

> [!NOTE]
> The warehouse refreshes nightly at 02:00 UTC, so deals updated today show up tomorrow.
`;

const REVIEW_ANSWER = `I reviewed \`auth-middleware.ts\`. The happy path is fine, but there are two issues worth fixing before merge.

> [!CAUTION]
> Expired tokens are accepted: \`verifyToken\` checks the signature only, and the \`exp\` check is still a TODO.

### Suggested change

\`\`\`diff
 	const claims = await verifyToken(token);
 	if (!claims) return new Response("Unauthorized", { status: 401 });
-	// TODO: check claims.exp against clock skew
+	const now = Math.floor(Date.now() / 1000);
+	if (claims.exp + CLOCK_SKEW_SECONDS < now) {
+		return new Response("Token expired", { status: 401 });
+	}
 	return next();
\`\`\`

### Full middleware, with both fixes

\`\`\`ts
import { verifyToken } from "./tokens";

/** Tolerated drift between our clock and the issuer's, in seconds. */
const CLOCK_SKEW_SECONDS = 30;

/** The scheme is case-insensitive (RFC 7235), so "bearer" must work too. */
const BEARER = /^bearer\\s+(.+)$/i;

/** Rejects requests without a valid, unexpired bearer token. */
export async function authMiddleware(
	request: Request,
	next: () => Promise<Response>,
): Promise<Response> {
	const header = request.headers.get("authorization") ?? "";
	const match = BEARER.exec(header);
	if (!match) {
		return unauthorized("Missing bearer token");
	}

	const claims = await verifyToken(match[1]);
	if (!claims) {
		return unauthorized("Invalid token");
	}

	const now = Math.floor(Date.now() / 1000);
	if (claims.exp + CLOCK_SKEW_SECONDS < now) {
		return unauthorized("Token expired");
	}

	return next();
}

function unauthorized(reason: string): Response {
	return new Response(reason, {
		status: 401,
		headers: { "WWW-Authenticate": 'Bearer error="invalid_token"' },
	});
}
\`\`\`

| Check | Before | After |
| --- | :---: | :---: |
| Rejects missing header | Yes | Yes |
| Accepts \`bearer\` (lowercase) | No | Yes |
| Rejects expired tokens | **No** | Yes |
| Sends \`WWW-Authenticate\` | No | Yes |
`;

export const SEED_TRANSCRIPTS: Record<string, ModelMessage[]> = {
	[PIPELINE_SESSION_ID]: [
		{
			id: "m-pipeline-1",
			role: "user",
			content:
				"Can you give me a breakdown of the Q4 pipeline? I want every open deal, weighted by probability, and anything I should worry about.",
		},
		{
			id: "m-pipeline-2",
			role: "assistant",
			thinking: [
				{
					content:
						"Pull open opportunities with a Q4 close date, weight by probability, group by stage, then look for concentration and stale deals.",
				},
			],
			content: PIPELINE_ANSWER,
		},
		{
			id: "m-pipeline-3",
			role: "user",
			content:
				"Nice. How did you get those numbers? I'd like to rerun it myself.",
		},
		{ id: "m-pipeline-4", role: "assistant", content: QUERY_ANSWER },
	],
	[AUTH_SESSION_ID]: [
		{
			id: "m-auth-1",
			role: "user",
			content: "Please review the auth middleware before I merge the PR.",
		},
		{ id: "m-auth-2", role: "assistant", content: REVIEW_ANSWER },
	],
};
