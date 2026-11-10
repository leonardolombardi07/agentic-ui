import type { ModelMessage } from "@tanstack/ai";

/*
 * Long tables: 60 tickets across six pages, links in cells, decimals and
 * negative values (breached SLAs), plus API metrics written as "1.2M".
 */

export const SUPPORT_SESSION_ID = "s-support-backlog";

const CUSTOMERS = [
	"Northwind Traders",
	"Contoso Health",
	"Fabrikam Logistics",
	"Tailspin Air",
	"Adventure Works",
	"Litware Labs",
	"Proseware",
	"Alpine Ski House",
	"Woodgrove Bank",
	"Relecloud",
];
const ASSIGNEES = ["Mia", "Noah", "Priya", "Lucas", "Sofia", "Kenji"];
const STATUSES = ["Open", "In progress", "Pending customer", "Escalated"];
const SUBJECTS = [
	"SSO login loops after password reset",
	"Export to CSV times out",
	"Webhook retries flood our endpoint",
	"Invoice shows wrong currency",
	"Dashboard charts empty since update",
	"API returns 429 below the documented limit",
	"Cannot remove a deactivated user",
	"Audit log missing entries",
	"Slow search on large workspaces",
	"Mobile app crashes on upload",
];
/** Hours to first resolution, by priority. */
const SLA_HOURS = { P1: 4, P2: 8, P3: 24, P4: 72 } as const;
const PRIORITIES = ["P1", "P2", "P2", "P3", "P3", "P3", "P4", "P4"] as const;

/** A fixed-seed generator, so the table is the same on every start. */
function seededRandom(seed: number): () => number {
	let state = seed;
	return () => {
		state = (state * 1_664_525 + 1_013_904_223) % 4_294_967_296;
		return state / 4_294_967_296;
	};
}

function pick<T>(random: () => number, items: ReadonlyArray<T>): T {
	const item = items[Math.floor(random() * items.length)];
	if (item === undefined) throw new Error("pick() needs a non-empty list");
	return item;
}

type Ticket = { priority: keyof typeof SLA_HOURS; left: number; row: string };

function generateTickets(): Ticket[] {
	const random = seededRandom(42);
	return Array.from({ length: 60 }, (_, index): Ticket => {
		const id = 4800 + index * 7;
		const priority = pick(random, PRIORITIES);
		const sla = SLA_HOURS[priority];
		// Most tickets are inside their SLA; about one in five has breached it.
		const age = Math.round(random() * sla * 1.25 * 10) / 10;
		const left = Math.round((sla - age) * 10) / 10;
		const row = `| [#${id}](https://support.example.com/tickets/${id}) | ${pick(random, SUBJECTS)} | ${pick(random, CUSTOMERS)} | ${priority} | ${pick(random, STATUSES)} | ${pick(random, ASSIGNEES)} | ${age.toFixed(1)} | ${left.toFixed(1)} |`;
		return { priority, left, row };
	});
}

const TICKETS = generateTickets();
const BREACHED = TICKETS.filter((ticket) => ticket.left < 0);
/** "3 P2, 5 P3, 4 P4": only the priorities that have breaches. */
function breachedByPriority(): string {
	return (["P1", "P2", "P3", "P4"] as const)
		.map((priority) => ({
			priority,
			count: BREACHED.filter((ticket) => ticket.priority === priority).length,
		}))
		.filter(({ count }) => count > 0)
		.map(({ priority, count }) => `${count} ${priority}`)
		.join(", ");
}

function ticketsTable(): string {
	const rows = TICKETS.map((ticket) => ticket.row);
	return [
		"| Ticket | Subject | Customer | Priority | Status | Assignee | Age (h) | SLA left (h) |",
		"| --- | --- | --- | --- | --- | --- | ---: | ---: |",
		...rows,
	].join("\n");
}

const ENDPOINTS = `| Endpoint | Method | Requests (7d) | p95 (ms) | Error rate | Owner |
| --- | :---: | ---: | ---: | ---: | --- |
| \`/v1/sessions\` | GET | 4.8M | 182 | 0.12% | Platform |
| \`/v1/sessions\` | POST | 1.2M | 340 | 0.41% | Platform |
| \`/v1/messages\` | POST | 9.6M | 1,240 | 0.87% | Agents |
| \`/v1/files\` | POST | 0.6M | 2,890 | 2.30% | Storage |
| \`/v1/files/{id}\` | GET | 3.1M | 95 | 0.05% | Storage |
| \`/v1/exports\` | POST | 0.04M | 18,400 | 6.10% | Data |
| \`/v1/search\` | GET | 2.2M | 760 | 0.33% | Search |
| \`/v1/webhooks\` | POST | 0.9M | 210 | 1.70% | Integrations |`;

const BACKLOG_ANSWER = `There are **60 open tickets**. Sort by **SLA left** to see what's already breached (negative hours), or filter by **Priority** and **Assignee**.

${ticketsTable()}

> [!CAUTION]
> **${BREACHED.length} tickets** have breached their SLA (${breachedByPriority()}). Filter **SLA left** to a max of \`-0.1\` to see just those.
`;

const API_ANSWER = `Errors cluster in two endpoints. \`/v1/exports\` fails **6.1%** of the time, which lines up with the "Export to CSV times out" tickets, and \`/v1/files\` uploads fail **2.3%**.

${ENDPOINTS}

The totals row shows the overall volume; switch **Error rate** to **Max** to find the worst endpoint quickly.
`;

export const SUPPORT_TRANSCRIPT: ModelMessage[] = [
	{
		id: "m-support-1",
		role: "user",
		content:
			"Pull every open support ticket with its SLA status. I want to see what's breached or about to be.",
	},
	{ id: "m-support-2", role: "assistant", content: BACKLOG_ANSWER },
	{
		id: "m-support-3",
		role: "user",
		content:
			"Are these related to API errors? Show me error rates by endpoint.",
	},
	{ id: "m-support-4", role: "assistant", content: API_ANSWER },
];
