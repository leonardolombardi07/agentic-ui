import type { SessionFile } from "@/lib/api/types/file";

/*
 * Fictional files for the seeded sessions (`sessions/store.server.ts`), so the Files
 * pane and its previews have something to show in dev. One of each preview type.
 */

type SeedFile = Omit<SessionFile, "size"> & { content: string };

const Q3 = "s-q3-earnings";
const AUTH = "s-auth-pr";
const DECK = "s-board-deck";

export const SEED_FILES: SeedFile[] = [
	{
		id: "f-q3-analyst-notes",
		sessionId: Q3,
		name: "analyst-call-notes.txt",
		mediaType: "text/plain",
		origin: "uploaded",
		messageId: null,
		createdAt: "2026-10-30T18:00:00.000Z",
		content: `Q3 analyst call - raw notes

- CFO: revenue up 14% YoY, driven by Cloud and Services
- Hardware flat; supply constraints eased in September
- Gross margin 61.8% (+1.2pp), opex discipline continues
- Guidance for Q4 raised to 9-11% growth
- Q&A: questions on pricing in EMEA, churn in SMB segment
- Buyback: $400M authorized, $120M executed in Q3
`,
	},
	{
		id: "f-q3-revenue-csv",
		sessionId: Q3,
		name: "revenue-by-segment.csv",
		mediaType: "text/csv",
		origin: "uploaded",
		messageId: null,
		createdAt: "2026-10-30T18:01:00.000Z",
		content: `Segment,Q3 2025 ($M),Q3 2026 ($M),Change
Cloud,412,498,+20.9%
Services,233,262,+12.4%
Hardware,301,303,+0.7%
Licensing,118,126,+6.8%
Total,1064,1189,+11.7%
`,
	},
	{
		id: "f-q3-summary-md",
		sessionId: Q3,
		name: "q3-earnings-summary.md",
		mediaType: "text/markdown",
		origin: "generated",
		messageId: null,
		createdAt: "2026-10-30T18:12:00.000Z",
		content: `# Q3 2026 earnings summary

Revenue reached **$1.19B**, up 11.7% year over year. Growth came mostly from
**Cloud** (+20.9%) and **Services** (+12.4%), while Hardware stayed flat.

## Highlights

- Gross margin improved to **61.8%** (+1.2pp)
- Q4 guidance raised to **9-11%** growth
- $120M of the $400M buyback executed

## By segment

| Segment   | Q3 2025 | Q3 2026 | Change |
| --------- | ------: | ------: | -----: |
| Cloud     |    $412M |   $498M | +20.9% |
| Services  |    $233M |   $262M | +12.4% |
| Hardware  |    $301M |   $303M |  +0.7% |
| Licensing |    $118M |   $126M |  +6.8% |

## Risks to watch

1. Pricing pressure in EMEA
2. Churn in the SMB segment
3. Hardware supply, if constraints return

> Sources: the uploaded call notes and segment table.
`,
	},
	{
		id: "f-q3-chart-svg",
		sessionId: Q3,
		name: "revenue-chart.svg",
		mediaType: "image/svg+xml",
		origin: "generated",
		messageId: null,
		createdAt: "2026-10-30T18:14:00.000Z",
		content: revenueChartSvg(),
	},
	{
		id: "f-auth-middleware",
		sessionId: AUTH,
		name: "auth-middleware.ts",
		mediaType: "text/typescript",
		origin: "uploaded",
		messageId: null,
		createdAt: "2026-10-29T14:00:00.000Z",
		content: `import { verifyToken } from "./tokens";

/** Rejects requests without a valid bearer token. */
export async function authMiddleware(request: Request, next: () => Promise<Response>) {
	const header = request.headers.get("authorization");
	if (!header?.startsWith("Bearer ")) {
		return new Response("Unauthorized", { status: 401 });
	}
	const token = header.slice("Bearer ".length);
	const claims = await verifyToken(token);
	if (!claims) return new Response("Unauthorized", { status: 401 });
	// TODO: check claims.exp against clock skew
	return next();
}
`,
	},
	{
		id: "f-deck-outline",
		sessionId: DECK,
		name: "board-deck-outline.md",
		mediaType: "text/markdown",
		origin: "generated",
		messageId: null,
		createdAt: "2026-10-30T16:00:00.000Z",
		content: `# Board meeting - outline

1. **Opening** - agenda and minutes
2. **Q3 results** - revenue, margin, cash
3. **Product** - roadmap for H1 2027
4. **People** - hiring plan and attrition
5. **Asks** - approve the 2027 budget

_Draft, 12 slides planned._
`,
	},
];

/** A simple bar chart of the segment table, as an image the preview can show. */
function revenueChartSvg(): string {
	const rows: [string, number, number][] = [
		["Cloud", 412, 498],
		["Services", 233, 262],
		["Hardware", 301, 303],
		["Licensing", 118, 126],
	];
	const scale = 0.5;
	const bars = rows
		.map(([label, before, after], i) => {
			const x = 60 + i * 130;
			return `
  <rect x="${x}" y="${300 - before * scale}" width="40" height="${before * scale}" fill="#94a3b8" rx="3"/>
  <rect x="${x + 46}" y="${300 - after * scale}" width="40" height="${after * scale}" fill="#3b82f6" rx="3"/>
  <text x="${x + 43}" y="322" text-anchor="middle" font-size="14" fill="#64748b">${label}</text>`;
		})
		.join("");
	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 360" width="600" height="360" font-family="system-ui, sans-serif">
  <rect width="600" height="360" fill="#ffffff"/>
  <text x="30" y="34" font-size="18" font-weight="600" fill="#0f172a">Revenue by segment ($M)</text>
  <rect x="380" y="20" width="12" height="12" fill="#94a3b8" rx="2"/><text x="398" y="31" font-size="13" fill="#475569">Q3 2025</text>
  <rect x="470" y="20" width="12" height="12" fill="#3b82f6" rx="2"/><text x="488" y="31" font-size="13" fill="#475569">Q3 2026</text>
  <line x1="40" y1="300" x2="580" y2="300" stroke="#cbd5e1"/>${bars}
</svg>
`;
}
