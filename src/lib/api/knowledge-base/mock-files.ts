import type {
	FileNode,
	FolderNode,
	KnowledgeNode,
	Passage,
} from "@/lib/api/types/knowledge-base";
import boardMemoDocx from "../files/samples/board-memo.docx?inline";
import budgetXlsx from "../files/samples/budget-2027.xlsx?inline";
import q3ReportPdf from "../files/samples/q3-earnings-report.pdf?inline";
import q3FinancialsXlsx from "../files/samples/q3-financials.xlsx?inline";
import securityReviewPdf from "../files/samples/security-review.pdf?inline";
import { personalSpaceId } from "./mock-data";

/*
 * The seeded folders and files, with real content so every one can be previewed. Static
 * like the rest of the mock data: no random ids, no "now".
 */

/**
 * What a seeded file contains: text written here, or one of the sample Office/PDF files
 * the session files already use (`../files/samples`), inlined as data URLs like there.
 */
export type SeedContent =
	| { type: "text"; text: string; mimeType: string }
	| { type: "asset"; url: string };

/** Node id -> content. Filled by `file()` below. */
export const SEED_CONTENT = new Map<string, SeedContent>();

/** Node id -> its passages, as the index would hold them. Filled by `file()` below. */
export const SEED_PASSAGES = new Map<string, Passage[]>();

/** Markdown with the markup taken out, since the index holds text, not formatting. */
function plainText(markdown: string): string {
	return markdown
		.replace(/^\s*\|?[\s:|-]+\|[\s:|-]*$/gm, "")
		.replace(/```\w*/g, "")
		.replace(/^\s*(#{1,6}|>|-|\d+\.)\s+/gm, "")
		.replace(/\[[ x]\]\s*/g, "")
		.replace(/[*_`]/g, "")
		.replace(/\s*\|\s*/g, " ")
		.replace(/\s+/g, " ")
		.trim();
}

/**
 * Cuts a text file into passages the way an indexer would, roughly: a Markdown file by
 * its `##` sections, a CSV by row (each value next to its column name, so a row still
 * makes sense alone), anything else as one piece.
 */
export function passagesOfText(
	nodeId: string,
	name: string,
	text: string,
): Passage[] {
	const extension = name.slice(name.lastIndexOf(".") + 1).toLowerCase();
	if (extension === "csv") {
		const [header = "", ...rows] = text.trim().split(/\r?\n/);
		const columns = header.split(",");
		return rows.map((row, index) => ({
			id: `${nodeId}:${index}`,
			text: row
				.split(",")
				.map((value, column) => `${columns[column] ?? ""}: ${value}`)
				.join("; "),
			// Row 1 is the header, so the first data row is row 2.
			label: `Row ${index + 2}`,
			cell: `A${index + 2}`,
		}));
	}
	if (extension === "md") {
		return text
			.split(/^## /m)
			.map((section, index) => {
				const [firstLine = "", ...rest] = section.split("\n");
				// The part before the first `##` is the title and the lead.
				const body = index === 0 ? section : rest.join("\n");
				return {
					id: `${nodeId}:${index}`,
					text: plainText(body),
					label: index === 0 ? "Introduction" : firstLine.trim(),
				};
			})
			.filter((passage) => passage.text.length > 0);
	}
	const whole = text.replace(/\s+/g, " ").trim();
	return whole ? [{ id: `${nodeId}:0`, text: whole, label: "Text" }] : [];
}

const TEXT_TYPES: Record<string, string> = {
	md: "text/markdown",
	csv: "text/csv",
	svg: "image/svg+xml",
};

function folder(
	id: string,
	spaceId: string,
	parentId: string | null,
	name: string,
	updatedAt: string,
	updatedBy: string,
): FolderNode {
	return { kind: "folder", id, spaceId, parentId, name, updatedAt, updatedBy };
}

type FileSeed = {
	id: string;
	spaceId: string;
	parentId?: string;
	name: string;
	updatedAt: string;
	updatedBy: string;
	/** What the index knows about the content. */
	summary: string;
	/**
	 * The text of the file, or a sample asset with its size in bytes. An asset's passages
	 * are written by hand (the mock can't read a PDF), with the page or cell each is on.
	 */
	content:
		| string
		| { url: string; size: number; passages: Omit<Passage, "id">[] };
};

function file(seed: FileSeed): FileNode {
	const { content, parentId = null, ...rest } = seed;
	let size: number;
	if (typeof content === "string") {
		const extension = seed.name.slice(seed.name.lastIndexOf(".") + 1);
		SEED_CONTENT.set(seed.id, {
			type: "text",
			text: content,
			mimeType: TEXT_TYPES[extension] ?? "text/plain",
		});
		size = new TextEncoder().encode(content).length;
		SEED_PASSAGES.set(seed.id, passagesOfText(seed.id, seed.name, content));
	} else {
		SEED_CONTENT.set(seed.id, { type: "asset", url: content.url });
		size = content.size;
		SEED_PASSAGES.set(
			seed.id,
			content.passages.map((passage, index) => ({
				...passage,
				id: `${seed.id}:${index}`,
			})),
		);
	}
	return { kind: "file", ...rest, parentId, size, indexStatus: "indexed" };
}

/** A short Markdown document: the title, the summary as its lead, then the body. */
function doc(title: string, lead: string, body: string): string {
	return `# ${title}\n\n${lead}\n\n${body.trim()}\n`;
}

const LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 120" width="320" height="120" font-family="system-ui, sans-serif">
  <rect width="320" height="120" rx="16" fill="#141414"/>
  <circle cx="64" cy="60" r="28" fill="#007cf7"/>
  <path d="M50 74 L64 44 L78 74 Z" fill="#ffffff"/>
  <text x="112" y="74" font-size="44" font-weight="700" fill="#ffffff">Acme</text>
</svg>
`;

export const NODES: KnowledgeNode[] = [
	// Company
	folder(
		"n-co-policies",
		"sp-company",
		null,
		"Policies",
		"2026-10-02T09:00:00Z",
		"Diego Farias",
	),
	folder(
		"n-co-brand",
		"sp-company",
		null,
		"Brand",
		"2026-08-14T15:20:00Z",
		"Diego Farias",
	),
	file({
		id: "n-co-handbook",
		spaceId: "sp-company",
		name: "Employee handbook.md",
		updatedAt: "2026-10-28T11:05:00Z",
		updatedBy: "Diego Farias",
		summary:
			"How we work: hours, remote work, time off, equipment and who to ask for what.",
		content: doc(
			"Employee handbook",
			"How we work at Acme: hours, remote work, time off, equipment and who to ask for what.",
			`
## Working hours

Core hours are **10:00 to 16:00** in your local time zone. Outside them, work when it suits you and your team.

## Remote work

- Up to three remote days a week, agreed with your manager.
- Fully remote roles are listed in your contract.
- Working from another country for more than 30 days needs approval from People.

## Time off

| Type | Days per year | How to request |
| --- | ---: | --- |
| Vacation | 25 | People portal, two weeks ahead |
| Sick leave | As needed | Tell your manager the same day |
| Parental leave | 120 | Talk to People three months ahead |

## Equipment

Every employee gets a laptop and a yearly budget of $500 for their home office. Lost or broken equipment: open a ticket with IT.

## Who to ask

1. Your manager, for anything about your work.
2. People, for contracts, pay and time off.
3. IT, for accounts and equipment.
`,
		),
	}),
	file({
		id: "n-co-holidays",
		spaceId: "sp-company",
		name: "Holiday calendar 2027.csv",
		updatedAt: "2026-11-10T08:30:00Z",
		updatedBy: "Diego Farias",
		summary: "Public holidays and company-wide days off for 2027, per office.",
		content: `Date,Holiday,Sao Paulo,Lisbon,Austin
2027-01-01,New Year,Yes,Yes,Yes
2027-02-09,Carnival,Yes,No,No
2027-03-26,Good Friday,Yes,Yes,No
2027-04-21,Tiradentes,Yes,No,No
2027-05-01,Labour Day,Yes,Yes,No
2027-07-05,Independence Day (observed),No,No,Yes
2027-09-07,Independence Day,Yes,No,No
2027-11-25,Thanksgiving,No,No,Yes
2027-12-24,Company day off,Yes,Yes,Yes
2027-12-25,Christmas Day,Yes,Yes,Yes
`,
	}),
	file({
		id: "n-co-travel",
		spaceId: "sp-company",
		parentId: "n-co-policies",
		name: "Travel and expenses policy.md",
		updatedAt: "2026-09-18T13:40:00Z",
		updatedBy: "Carla Mendes",
		summary:
			"Booking rules, daily allowances, what needs approval and how to file an expense report.",
		content: doc(
			"Travel and expenses policy",
			"Booking rules, daily allowances, what needs approval and how to file an expense report.",
			`
## Booking

- Book flights at least **14 days** ahead, in economy for flights under six hours.
- Use the travel portal; bookings made elsewhere are refunded only with a manager's approval.

## Daily allowances

| Region | Meals | Hotel (per night) |
| --- | ---: | ---: |
| Brazil | $45 | $140 |
| Europe | $70 | $190 |
| United States | $75 | $220 |

## What needs approval

1. Any trip above $2,000 in total.
2. Client entertainment above $150 per person.
3. Travel on weekends.

## Expense reports

File within **30 days** of the trip, with a receipt for every item above $20.
`,
		),
	}),
	file({
		id: "n-co-security",
		spaceId: "sp-company",
		parentId: "n-co-policies",
		name: "Information security policy.md",
		updatedAt: "2026-10-02T09:00:00Z",
		updatedBy: "Leonardo Lombardi",
		summary:
			"Passwords, device encryption, data classification and how to report an incident.",
		content: doc(
			"Information security policy",
			"Passwords, device encryption, data classification and how to report an incident.",
			`
## Accounts

- Single sign-on with a hardware key or authenticator app for every system.
- Passwords live in the company password manager, never in documents or chat.

## Devices

Laptops and phones that hold company data must be encrypted and lock after five minutes.

## Data classification

| Class | Examples | Where it may live |
| --- | --- | --- |
| Public | Website, job posts | Anywhere |
| Internal | Handbooks, runbooks | Company and department spaces |
| Confidential | Salaries, contracts | Team spaces and groups |
| Restricted | Board material, deals | Restricted spaces only |

## Reporting an incident

> Report first, investigate later. Write to security@company.com or page the on-call engineer within one hour of noticing.
`,
		),
	}),
	file({
		id: "n-co-conduct",
		spaceId: "sp-company",
		parentId: "n-co-policies",
		name: "Code of conduct.md",
		updatedAt: "2026-05-06T10:15:00Z",
		updatedBy: "Diego Farias",
		summary:
			"Expected behaviour, conflicts of interest and the confidential reporting channel.",
		content: doc(
			"Code of conduct",
			"Expected behaviour, conflicts of interest and the confidential reporting channel.",
			`
## How we treat each other

Be respectful, be direct, assume good intent. Harassment and discrimination are never acceptable.

## Conflicts of interest

Tell your manager about any outside work, investment or relationship that could influence a decision you make for Acme.

## Speaking up

The reporting channel is confidential and can be anonymous. Nobody is penalized for a report made in good faith.
`,
		),
	}),
	file({
		id: "n-co-logo",
		spaceId: "sp-company",
		parentId: "n-co-brand",
		name: "Logo.svg",
		updatedAt: "2026-08-14T15:20:00Z",
		updatedBy: "Diego Farias",
		summary: "The Acme logo on a dark background.",
		content: LOGO_SVG,
	}),
	file({
		id: "n-co-voice",
		spaceId: "sp-company",
		parentId: "n-co-brand",
		name: "Tone of voice.md",
		updatedAt: "2026-07-22T17:00:00Z",
		updatedBy: "Diego Farias",
		summary: "How Acme writes: plain words, short sentences, no jargon.",
		content: doc(
			"Tone of voice",
			"How Acme writes: plain words, short sentences, no jargon.",
			`
- **Plain words.** "Use", not "leverage".
- **Short sentences.** One idea each.
- **Say who does what.** "We will refund you", not "a refund will be issued".
- **No jargon** the reader would not use themselves.
`,
		),
	}),

	// Engineering
	folder(
		"n-eng-adr",
		"sp-eng",
		null,
		"Architecture decisions",
		"2026-11-03T14:10:00Z",
		"Marina Costa",
	),
	file({
		id: "n-eng-handbook",
		spaceId: "sp-eng",
		name: "Engineering handbook.md",
		updatedAt: "2026-10-19T16:45:00Z",
		updatedBy: "Marina Costa",
		summary:
			"Code review, branching, on-call expectations and the definition of done.",
		content: doc(
			"Engineering handbook",
			"Code review, branching, on-call expectations and the definition of done.",
			`
## Code review

- Every change is reviewed by one engineer from the owning team.
- Reviews are answered within one working day.

## Branching

Short-lived branches off \`main\`, merged behind a feature flag when the work is not finished.

## Definition of done

1. Tests cover the change.
2. Dashboards and alerts exist for new services.
3. The runbook is updated.

## On call

One week at a time, with a secondary. Pages are acknowledged within 10 minutes.
`,
		),
	}),
	file({
		id: "n-eng-career",
		spaceId: "sp-eng",
		name: "Career ladder.md",
		updatedAt: "2026-06-30T12:00:00Z",
		updatedBy: "Marina Costa",
		summary:
			"Levels from junior to principal engineer, with expectations for each.",
		content: doc(
			"Career ladder",
			"Levels from junior to principal engineer, with expectations for each.",
			`
| Level | Scope | Works with |
| --- | --- | --- |
| Junior | Well-defined tasks | Their team |
| Mid | Features end to end | Their team |
| Senior | Projects across services | Several teams |
| Staff | A whole area | The department |
| Principal | Company-wide direction | Executives |
`,
		),
	}),
	file({
		id: "n-eng-adr-12",
		spaceId: "sp-eng",
		parentId: "n-eng-adr",
		name: "ADR-012 Event bus.md",
		updatedAt: "2026-09-09T10:00:00Z",
		updatedBy: "Rafael Souza",
		summary: "Why we chose a managed event bus over running Kafka ourselves.",
		content: doc(
			"ADR-012: Event bus",
			"Why we chose a managed event bus over running Kafka ourselves.",
			`
## Context

Six services publish events today, each with its own queue. Operating Kafka would need a dedicated on-call rotation.

## Decision

Use the cloud provider's managed event bus.

## Consequences

- No brokers to operate.
- Ordering is guaranteed per key only.
- Cost grows with volume: revisit above 50M events a day.
`,
		),
	}),
	file({
		id: "n-eng-adr-13",
		spaceId: "sp-eng",
		parentId: "n-eng-adr",
		name: "ADR-013 Azure AI Search for retrieval.md",
		updatedAt: "2026-11-03T14:10:00Z",
		updatedBy: "Marina Costa",
		summary:
			"Retrieval for agents uses Azure AI Search with security trimming per space.",
		content: doc(
			"ADR-013: Azure AI Search for retrieval",
			"Retrieval for agents uses Azure AI Search with security trimming per space.",
			`
## Context

Agents need to answer from company files without ever returning a passage the asking user could not open.

## Decision

Index every file into Azure AI Search. Each chunk carries the id of its space, and every query is filtered by the spaces the user can see.

## Consequences

- Access changes apply to search at once: no re-indexing.
- Restricted spaces use a separate index in the secure environment.
`,
		),
	}),

	// Engineering / Platform
	folder(
		"n-plat-runbooks",
		"sp-eng-platform",
		null,
		"Runbooks",
		"2026-11-12T07:50:00Z",
		"Rafael Souza",
	),
	file({
		id: "n-plat-security-review",
		spaceId: "sp-eng-platform",
		name: "Security review.pdf",
		updatedAt: "2026-10-08T09:30:00Z",
		updatedBy: "Rafael Souza",
		summary:
			"Findings of the security review of the authentication middleware, with fixes.",
		content: {
			url: securityReviewPdf,
			size: 2381,
			passages: [
				{
					label: "Page 1",
					page: 1,
					text: "Security review: auth middleware. Scope: the token verification path in auth-middleware.ts. Findings are ranked by severity.",
				},
				{
					label: "Page 1",
					page: 1,
					text: "Finding 1, High: expired tokens accepted when clock skew is above 5 minutes. Status: fixed. Finding 2, Medium: error responses leak the token's subject. Status: open. Finding 3, Low: missing rate limit on /auth/refresh. Status: open.",
				},
			],
		},
	}),
	file({
		id: "n-plat-oncall",
		spaceId: "sp-eng-platform",
		name: "On-call rota Q4.csv",
		updatedAt: "2026-11-12T07:50:00Z",
		updatedBy: "Rafael Souza",
		summary: "Who is on call each week of Q4 and who covers the holidays.",
		content: `Week starting,Primary,Secondary,Notes
2026-11-16,Rafael Souza,Marina Costa,
2026-11-23,Marina Costa,Rafael Souza,Thanksgiving in Austin
2026-11-30,Rafael Souza,Ana Ribeiro,
2026-12-07,Ana Ribeiro,Rafael Souza,
2026-12-14,Marina Costa,Ana Ribeiro,
2026-12-21,Rafael Souza,Marina Costa,Holiday cover
2026-12-28,Marina Costa,Rafael Souza,Holiday cover
`,
	}),
	file({
		id: "n-plat-rb-db",
		spaceId: "sp-eng-platform",
		parentId: "n-plat-runbooks",
		name: "Database failover.md",
		updatedAt: "2026-09-27T18:20:00Z",
		updatedBy: "Rafael Souza",
		summary:
			"Step by step: promote the replica, repoint the services, verify replication.",
		content: doc(
			"Runbook: database failover",
			"Step by step: promote the replica, repoint the services, verify replication.",
			`
> Use this when the primary is unreachable for more than two minutes.

## Steps

1. Confirm the primary is down from two regions.
2. Promote the replica:
   \`\`\`sh
   dbctl promote --cluster main --replica replica-2
   \`\`\`
3. Repoint the services by updating the \`DATABASE_HOST\` secret, then restart them.
4. Verify writes with the smoke test.
5. Rebuild the old primary as a replica.

## Afterwards

Open an incident review within two working days.
`,
		),
	}),
	file({
		id: "n-plat-rb-cert",
		spaceId: "sp-eng-platform",
		parentId: "n-plat-runbooks",
		name: "Certificate rotation.md",
		updatedAt: "2026-08-11T11:11:00Z",
		updatedBy: "Rafael Souza",
		summary:
			"Rotating TLS certificates without downtime, and what to do when one has expired.",
		content: doc(
			"Runbook: certificate rotation",
			"Rotating TLS certificates without downtime, and what to do when one has expired.",
			`
## Planned rotation

1. Issue the new certificate 30 days before expiry.
2. Deploy it next to the old one.
3. Switch the load balancer, then remove the old one after a day.

## Already expired

Switch the load balancer to the wildcard fallback certificate first, then follow the planned steps.
`,
		),
	}),

	// Engineering / Data Science
	file({
		id: "n-data-churn",
		spaceId: "sp-eng-data",
		name: "Churn model report.md",
		updatedAt: "2026-10-30T15:00:00Z",
		updatedBy: "Ana Ribeiro",
		summary:
			"Gradient boosted churn model: features, validation results and the rollout plan.",
		content: doc(
			"Churn model report",
			"Gradient boosted churn model: features, validation results and the rollout plan.",
			`
## Features

Logins in the last 30 days, support tickets, plan, seats in use and days since the last invoice.

## Validation

| Metric | Value |
| --- | ---: |
| AUC | 0.87 |
| Precision at top 10% | 0.61 |
| Recall at top 10% | 0.44 |

## Rollout

Score weekly, send the top 10% to customer success, measure retention against a holdout.
`,
		),
	}),
	file({
		id: "n-data-catalog",
		spaceId: "sp-eng-data",
		name: "Dataset catalog.csv",
		updatedAt: "2026-11-05T09:45:00Z",
		updatedBy: "Ana Ribeiro",
		summary:
			"Every dataset the team maintains, with its owner, freshness and sensitivity.",
		content: `Dataset,Owner,Refreshed,Sensitivity,Rows
accounts,Ana Ribeiro,Daily,Confidential,48210
invoices,Ana Ribeiro,Daily,Confidential,912455
product_events,Rafael Souza,Hourly,Internal,184200331
support_tickets,Ana Ribeiro,Daily,Confidential,75118
churn_scores,Ana Ribeiro,Weekly,Internal,48210
`,
	}),

	// Finance
	folder(
		"n-fin-closing",
		"sp-fin",
		null,
		"Monthly closing",
		"2026-11-04T19:00:00Z",
		"Carla Mendes",
	),
	file({
		id: "n-fin-budget",
		spaceId: "sp-fin",
		name: "Budget 2027.xlsx",
		updatedAt: "2026-11-14T16:25:00Z",
		updatedBy: "Carla Mendes",
		summary:
			"Approved 2027 budget per department, with headcount and capital expenses.",
		content: {
			url: budgetXlsx,
			size: 5732,
			passages: [
				{
					label: "Budget 2027, A4",
					sheet: "Budget 2027",
					cell: "A4",
					text: "FY2027 operating budget (draft). Revenue: Q1 1,240; Q2 1,290; Q3 1,335; Q4 1,410; FY2027 5,275; +11.2% vs FY2026.",
				},
				{
					label: "Budget 2027, A6",
					sheet: "Budget 2027",
					cell: "A6",
					text: "R&D: Q1 (210); Q2 (214); Q3 (220); Q4 (226); FY2027 (870); +6.4% vs FY2026. Sales & marketing: FY2027 (756); +5.2%. G&A: FY2027 (302); +2.1%.",
				},
				{
					label: "Budget 2027, A9",
					sheet: "Budget 2027",
					cell: "A9",
					text: "Operating income: Q1 302; Q2 326; Q3 344; Q4 376; FY2027 1,348.",
				},
			],
		},
	}),
	file({
		id: "n-fin-q3-report",
		spaceId: "sp-fin",
		name: "Q3 earnings report.pdf",
		updatedAt: "2026-10-30T18:14:00Z",
		updatedBy: "Carla Mendes",
		summary: "Q3 2026 results: revenue, margin and guidance, by segment.",
		content: {
			url: q3ReportPdf,
			size: 6337,
			passages: [
				{
					label: "Page 1",
					page: 1,
					text: "Summary. Revenue reached $1.19B, up 11.7% year over year. Growth came mostly from Cloud (+20.9%) and Services (+12.4%), while Hardware stayed flat. Gross margin improved to 61.8% (+1.2pp) and Q4 guidance was raised to 9-11% growth.",
				},
				{
					label: "Page 2",
					page: 2,
					text: "Monthly trend. Each month of the quarter grew on the one before, led by Cloud in September.",
				},
				{
					label: "Page 2",
					page: 2,
					text: "Risks to watch. Pricing pressure in EMEA: two large renewals moved to multi-year terms at lower rates. SMB churn: logo churn rose to 2.9% a month; the self-serve onboarding fix ships in Q4. Hardware supply: constraints eased in September but lead times remain above plan.",
				},
				{
					label: "Page 3",
					page: 3,
					text: "Appendix: methodology. Segment revenue is recognised under the company's standard policy. Figures are rounded to the nearest million and may not add up exactly. Year-over-year changes compare against the same quarter of the previous fiscal year, restated for the reorganisation of the Services segment.",
				},
			],
		},
	}),
	file({
		id: "n-fin-q3-financials",
		spaceId: "sp-fin",
		name: "Q3 financials.xlsx",
		updatedAt: "2026-10-30T18:02:00Z",
		updatedBy: "Bruno Almeida",
		summary:
			"The Q3 2026 income statement and segment revenue behind the earnings report.",
		content: {
			url: q3FinancialsXlsx,
			size: 26876,
			passages: [
				{
					label: "Summary, A5",
					sheet: "Summary",
					cell: "A5",
					text: "Q3 2026 revenue by segment, in $M, unaudited. Cloud: 412 in Q3 2025, 498 in Q3 2026. Services: 233, 262. Hardware: 301, 303. Licensing: 118, 126.",
				},
				{
					label: "Summary, A11",
					sheet: "Summary",
					cell: "A11",
					text: "Gross margin: 61.8%. Q4 guidance (growth): 9-11%. Buyback executed: $120M of the $400M authorization.",
				},
				{
					label: "Monthly, A2",
					sheet: "Monthly",
					cell: "A2",
					text: "Monthly revenue per segment. July: Cloud 158, Services 85, Hardware 96, Licensing 41. August: 164, 87, 99, 42. September: 176, 90, 108, 43.",
				},
				{
					label: "Transactions, A2",
					sheet: "Transactions",
					cell: "A2",
					text: "Transactions: id, date, segment, region (NA, EMEA, APAC, LATAM), customer, amount and status (paid, pending, overdue) for 400 invoices of the quarter.",
				},
			],
		},
	}),
	file({
		id: "n-fin-calendar",
		spaceId: "sp-fin",
		parentId: "n-fin-closing",
		name: "Closing calendar.csv",
		updatedAt: "2026-11-04T19:00:00Z",
		updatedBy: "Bruno Almeida",
		summary:
			"Deadlines for each closing step, from accruals to the board report.",
		content: `Working day,Step,Owner
1,Bank reconciliations,Bruno Almeida
2,Accruals and deferrals,Bruno Almeida
3,Intercompany,Bruno Almeida
4,Review of the trial balance,Carla Mendes
5,Management report,Carla Mendes
7,Board report,Carla Mendes
`,
	}),
	file({
		id: "n-fin-checklist",
		spaceId: "sp-fin",
		parentId: "n-fin-closing",
		name: "Closing checklist.md",
		updatedAt: "2026-10-01T08:00:00Z",
		updatedBy: "Bruno Almeida",
		summary: "The reconciliations and approvals needed before the books close.",
		content: doc(
			"Closing checklist",
			"The reconciliations and approvals needed before the books close.",
			`
- [ ] Every bank account reconciled
- [ ] Accruals reviewed against open purchase orders
- [ ] Intercompany balances agree
- [ ] Payroll posted
- [ ] Trial balance approved by the CFO
`,
		),
	}),

	// Finance / Treasury
	file({
		id: "n-tre-cash",
		spaceId: "sp-fin-treasury",
		name: "Cash forecast.csv",
		updatedAt: "2026-11-17T10:10:00Z",
		updatedBy: "Bruno Almeida",
		summary: "Thirteen-week cash forecast with the main inflows and outflows.",
		content: `Week,Opening ($M),Inflows ($M),Outflows ($M),Closing ($M)
2026-11-16,212.0,31.5,28.2,215.3
2026-11-23,215.3,29.8,41.0,204.1
2026-11-30,204.1,33.2,27.5,209.8
2026-12-07,209.8,30.1,26.9,213.0
2026-12-14,213.0,35.4,52.3,196.1
2026-12-21,196.1,22.0,25.1,193.0
`,
	}),
	file({
		id: "n-tre-hedge",
		spaceId: "sp-fin-treasury",
		name: "Hedging policy.md",
		updatedAt: "2026-04-20T14:00:00Z",
		updatedBy: "Carla Mendes",
		summary:
			"Which currency exposures we hedge, with what instruments and limits.",
		content: doc(
			"Hedging policy",
			"Which currency exposures we hedge, with what instruments and limits.",
			`
- Hedge **70% to 90%** of forecast exposures for the next six months.
- Instruments: forwards and plain options only.
- No single counterparty above 30% of the hedged amount.
`,
		),
	}),

	// Finance / M&A (restricted)
	folder(
		"n-mna-atlas",
		"sp-fin-mna",
		null,
		"Project Atlas",
		"2026-11-15T21:30:00Z",
		"Carla Mendes",
	),
	file({
		id: "n-mna-valuation",
		spaceId: "sp-fin-mna",
		parentId: "n-mna-atlas",
		name: "Valuation model.csv",
		updatedAt: "2026-11-15T21:30:00Z",
		updatedBy: "Carla Mendes",
		summary:
			"Discounted cash flow and comparable multiples for the Atlas target.",
		content: `Method,Low ($M),Base ($M),High ($M)
Discounted cash flow,410,465,520
Comparable companies,390,440,505
Precedent transactions,430,480,560
`,
	}),
	file({
		id: "n-mna-dd",
		spaceId: "sp-fin-mna",
		parentId: "n-mna-atlas",
		name: "Due diligence findings.md",
		updatedAt: "2026-11-09T17:15:00Z",
		updatedBy: "Carla Mendes",
		summary:
			"Legal, tax and commercial findings, with the open questions for the seller.",
		content: doc(
			"Project Atlas: due diligence findings",
			"Legal, tax and commercial findings, with the open questions for the seller.",
			`
## Legal

Two customer contracts have change-of-control clauses.

## Tax

A provision of $3M is needed for an open audit.

## Open questions for the seller

1. Churn of the top ten customers over three years.
2. Status of the patent application.
`,
		),
	}),

	// People
	file({
		id: "n-ppl-onboarding",
		spaceId: "sp-people",
		name: "Onboarding checklist.md",
		updatedAt: "2026-09-03T09:00:00Z",
		updatedBy: "Diego Farias",
		summary: "What a new hire needs in the first day, week and month.",
		content: doc(
			"Onboarding checklist",
			"What a new hire needs in the first day, week and month.",
			`
## First day

- [ ] Laptop and accounts
- [ ] Meet the team and the onboarding buddy

## First week

- [ ] Read the employee handbook
- [ ] Security training

## First month

- [ ] First project shipped
- [ ] 30-day conversation with the manager
`,
		),
	}),
	file({
		id: "n-ppl-bands",
		spaceId: "sp-people",
		name: "Salary bands 2027.csv",
		updatedAt: "2026-11-11T13:00:00Z",
		updatedBy: "Diego Farias",
		summary: "Salary ranges per level and location for 2027.",
		content: `Level,Sao Paulo (BRL),Lisbon (EUR),Austin (USD)
Junior,84000-108000,32000-42000,85000-105000
Mid,120000-168000,45000-60000,115000-145000
Senior,180000-252000,62000-85000,150000-190000
Staff,264000-360000,88000-115000,195000-245000
`,
	}),
	file({
		id: "n-tal-kit",
		spaceId: "sp-people-talent",
		name: "Interview kit - engineers.md",
		updatedAt: "2026-10-21T10:30:00Z",
		updatedBy: "Diego Farias",
		summary:
			"Interview stages, question bank and the scoring rubric for engineering roles.",
		content: doc(
			"Interview kit: engineers",
			"Interview stages, question bank and the scoring rubric for engineering roles.",
			`
## Stages

1. Recruiter call (30 min)
2. Technical conversation (60 min)
3. Pairing exercise (90 min)
4. Values interview (45 min)

## Scoring

Each interviewer scores 1 to 4 against the rubric and writes their notes **before** the debrief.
`,
		),
	}),

	// Groups
	file({
		id: "n-launch-plan",
		spaceId: "sp-group-launch",
		name: "Launch plan.md",
		updatedAt: "2026-11-18T12:00:00Z",
		updatedBy: "Marina Costa",
		summary: "Milestones, owners and the go/no-go criteria for the Q4 launch.",
		content: doc(
			"Q4 launch plan",
			"Milestones, owners and the go/no-go criteria for the Q4 launch.",
			`
| Milestone | Date | Owner |
| --- | --- | --- |
| Feature freeze | Nov 27 | Marina Costa |
| Pricing approved | Dec 1 | Bruno Almeida |
| Go/no-go | Dec 8 | Marina Costa |
| Launch | Dec 10 | Everyone |

## Go/no-go criteria

- No open severity-1 bugs.
- Support trained.
- Pricing page live in staging.
`,
		),
	}),
	file({
		id: "n-launch-pricing",
		spaceId: "sp-group-launch",
		name: "Pricing scenarios.csv",
		updatedAt: "2026-11-16T18:40:00Z",
		updatedBy: "Bruno Almeida",
		summary: "Three pricing scenarios and their effect on revenue and margin.",
		content: `Scenario,Price per seat ($),Expected seats,Revenue ($M),Gross margin
Conservative,18,42000,9.1,58%
Base,22,38000,10.0,62%
Premium,29,27000,9.4,67%
`,
	}),
	folder(
		"n-board-packs",
		"sp-group-board",
		null,
		"Board packs",
		"2026-11-13T08:00:00Z",
		"Helena Duarte",
	),
	file({
		id: "n-board-memo",
		spaceId: "sp-group-board",
		parentId: "n-board-packs",
		name: "Board memo - November.docx",
		updatedAt: "2026-11-13T08:00:00Z",
		updatedBy: "Helena Duarte",
		summary:
			"Results, strategy update and the resolutions put to the board in November.",
		content: {
			url: boardMemoDocx,
			size: 37320,
			passages: [
				{
					label: "Where we are",
					text: "Q3 revenue was $1.19B (+11.7% YoY). Cloud and Services carried the quarter; Hardware was flat. Gross margin reached 61.8%, the highest in eight quarters.",
				},
				{
					label: "What we're asking for",
					text: "Approve the FY2027 operating budget (attached spreadsheet). Extend the buyback authorization by $200M. Endorse the EMEA pricing review.",
				},
				{
					label: "Budget at a glance",
					text: "Revenue: 5,275 in FY2027 ($M), +11.2% vs FY2026. Operating income: 1,723, +15.4%. Headcount: 4,120, +6.0%. Risks: EMEA pricing pressure, SMB churn, hardware lead times.",
				},
			],
		},
	}),
	file({
		id: "n-board-succession",
		spaceId: "sp-group-board",
		name: "Succession plan.md",
		updatedAt: "2026-07-01T09:00:00Z",
		updatedBy: "Helena Duarte",
		summary:
			"Named successors for each executive role and their development plans.",
		content: doc(
			"Succession plan",
			"Named successors for each executive role and their development plans.",
			`
| Role | Ready now | Ready in two years |
| --- | --- | --- |
| CEO | - | Carla Mendes |
| CFO | - | Bruno Almeida |
| Head of Engineering | Rafael Souza | - |
`,
		),
	}),

	// Personal
	file({
		id: "n-me-notes",
		spaceId: personalSpaceId("u-leonardo"),
		name: "Rollout notes.md",
		updatedAt: "2026-11-19T19:30:00Z",
		updatedBy: "Leonardo Lombardi",
		summary:
			"Loose notes on rolling the Knowledge Base out department by department.",
		content: doc(
			"Rollout notes",
			"Loose notes on rolling the Knowledge Base out department by department.",
			`
- Start with People: they already keep the handbook current.
- Finance next, after the closing.
- Ask each department manager to name their team managers before the kickoff.
`,
		),
	}),
];
