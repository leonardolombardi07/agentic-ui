import type { ModelMessage } from "@tanstack/ai";

/*
 * Financial tables, which stress number parsing: $ in millions, negatives in
 * parentheses, percentage points, and columns that mix all of them.
 */

export const EARNINGS_SESSION_ID = "s-q3-earnings";

/* Mixed units in every number column: filterable, but no totals row. */
const INCOME_STATEMENT = `| Line item | Q3 2025 | Q3 2026 | Change |
| --- | ---: | ---: | ---: |
| Revenue | $1,064.0 | $1,189.0 | +11.7% |
| Cost of revenue | ($418.2) | ($454.2) | +8.6% |
| **Gross profit** | $645.8 | $734.8 | +13.8% |
| Gross margin | 60.7% | 61.8% | +1.1pp |
| Operating expenses | ($412.5) | ($441.0) | +6.9% |
| **Operating income** | $233.3 | $293.8 | +25.9% |
| Operating margin | 21.9% | 24.7% | +2.8pp |
| Net income | $182.4 | $230.1 | +26.2% |
| EPS (diluted) | $0.78 | $0.92 | +17.9% |`;

/* The author's own Total row: pinned as the footer. */
const SEGMENTS = `| Segment | Q3 2025 | Q3 2026 | Change | Share of revenue |
| --- | ---: | ---: | ---: | ---: |
| Cloud | $412M | $498M | +20.9% | 41.9% |
| Services | $233M | $262M | +12.4% | 22.0% |
| Hardware | $301M | $303M | +0.7% | 25.5% |
| Licensing | $118M | $126M | +6.8% | 10.6% |
| **Total** | **$1,064M** | **$1,189M** | **+11.7%** | **100%** |`;

const QUARTERS = [
	"Q4 2024",
	"Q1 2025",
	"Q2 2025",
	"Q3 2025",
	"Q4 2025",
	"Q1 2026",
	"Q2 2026",
	"Q3 2026",
];

const TREND: Array<[segment: string, revenue: number[]]> = [
	["Cloud", [371, 389, 401, 412, 436, 455, 476, 498]],
	["Services", [221, 225, 229, 233, 240, 248, 255, 262]],
	["Hardware", [309, 296, 299, 301, 318, 297, 300, 303]],
	["Licensing", [112, 114, 116, 118, 121, 122, 124, 126]],
];

/* Ten columns: scrolls sideways, with a computed total per quarter. */
function trendTable(): string {
	const rows = TREND.map(([segment, revenue]) => {
		const first = revenue[0] ?? 1;
		const last = revenue.at(-1) ?? first;
		const growth = ((last / first - 1) * 100).toFixed(1);
		const sign = last >= first ? "+" : "";
		return `| ${segment} | ${revenue.join(" | ")} | ${sign}${growth}% |`;
	});
	return [
		`| Segment | ${QUARTERS.join(" | ")} | Growth since Q4 2024 |`,
		`| --- | ${QUARTERS.map(() => "---:").join(" | ")} | ---: |`,
		...rows,
	].join("\n");
}

/* Three rows of ranges and "n/a": stays a plain text table. */
const GUIDANCE = `| Metric | Q4 guidance | Consensus |
| --- | --- | --- |
| Revenue growth | 9-11% | 8.5% |
| Gross margin | 61.5-62.0% | 61.2% |
| Buyback | $150M | n/a |`;

const SUMMARY_ANSWER = `Q3 was a strong quarter: revenue grew **11.7%** to **$1.19B**, and operating income grew more than twice as fast as revenue.

## Income statement ($M)

${INCOME_STATEMENT}

> [!NOTE]
> Costs are shown in parentheses. Margins change in percentage points (pp), not percent.

## Revenue by segment

${SEGMENTS}

Cloud is now **42%** of revenue, up from 39% a year ago, and drives most of the margin gain.

## Q4 guidance vs. consensus

${GUIDANCE}
`;

const TREND_ANSWER = `Here's the eight-quarter view, in $M. Scroll sideways for the latest quarters; the last row totals each quarter.

${trendTable()}

Hardware is the only segment below where it started, and it dipped in Q1 2026 after the Q4 2025 refresh cycle.
`;

export const EARNINGS_TRANSCRIPT: ModelMessage[] = [
	{
		id: "m-earnings-1",
		role: "user",
		content:
			"Summarize Q3 against last year from the uploaded files: the P&L, the segments, and what guidance looks like.",
	},
	{ id: "m-earnings-2", role: "assistant", content: SUMMARY_ANSWER },
	{
		id: "m-earnings-3",
		role: "user",
		content: "Can I see the trend by segment over the last two years?",
	},
	{ id: "m-earnings-4", role: "assistant", content: TREND_ANSWER },
];
