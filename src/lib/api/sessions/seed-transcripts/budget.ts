import type { ModelMessage } from "@tanstack/ai";

/*
 * Spreadsheet cleanup: from the simplest table (two rows, no tools) to ones
 * with empty cells, inline code, negatives in parentheses and Yes/No columns.
 */

export const BUDGET_SESSION_ID = "s-budget-cleanup";

/* The simplest table: two rows, no search, filters or totals. */
const SHEETS = `| Sheet | Status |
| --- | --- |
| Summary | Fixed |
| Departments | Fixed |`;

/* Empty cells, inline code, long text that wraps, and a total that goes negative. */
const ISSUES = `| Cell | Problem | Fix | Impact |
| --- | --- | --- | ---: |
| \`B14\` | Hard-coded total instead of a formula | \`=SUM(B3:B13)\` | $12,400 |
| \`C7\` | Headcount typed as text ("12 ") | Converted to a number | |
| \`D3:D9\` | Merged cells broke sorting and filters | Unmerged | |
| \`F22\` | 2025 exchange rate still in use | Linked to \`Rates!B2\` | ($3,150) |
| \`Departments!A30\` | Duplicate "Marketing" row counted twice | Removed the duplicate | ($48,000) |
| \`H5\` | \`#REF!\` after a column was deleted | Rebuilt the lookup with \`XLOOKUP\` | |
| \`B40\` | Rounded to thousands while the rest isn't | Removed \`ROUND\` | $310 |`;

/* Category filter on Owner, totals on money and headcount, average on change. */
const DEPARTMENTS = `| Department | Owner | 2026 actual | 2027 budget | Change | Headcount |
| --- | --- | ---: | ---: | ---: | ---: |
| Engineering | CTO | $4,820,000 | $5,310,000 | +10.2% | 46 |
| Sales | CRO | $3,150,000 | $3,420,000 | +8.6% | 31 |
| Marketing | CMO | $1,980,000 | $1,890,000 | -4.5% | 14 |
| Customer Success | CRO | $1,240,000 | $1,380,000 | +11.3% | 18 |
| Finance | CFO | $760,000 | $790,000 | +3.9% | 8 |
| People | CFO | $540,000 | $585,000 | +8.3% | 6 |
| Legal | CFO | $410,000 | $430,000 | +4.9% | 3 |
| IT | CTO | $690,000 | $720,000 | +4.3% | 5 |`;

/* Text only, centered Yes/No columns: filters, but no totals. */
const OPTIONS = `| Option | Keeps headcount | Within cap | Needs board approval | Risk |
| --- | :---: | :---: | :---: | --- |
| **A.** Flat budget | Yes | Yes | No | Low |
| **B.** +5% across the board | Yes | No | Yes | Medium |
| **C.** Freeze hiring in G&A | No | Yes | No | Low |
| **D.** Shift Marketing spend to Sales | Yes | Yes | No | Medium |
| **E.** Defer the IT laptop refresh | Yes | Yes | No | Low |
| **F.** Cut contractors | No | Yes | No | High |
| **G.** C and E together | No | Yes | No | Low |`;

const CLEANUP_ANSWER = `Done. Both sheets are clean:

${SHEETS}

### What I fixed

${ISSUES}

> [!IMPORTANT]
> Net effect: the 2027 total drops by **$38,440**, mostly from the duplicate Marketing row.

### 2027 budget by department

${DEPARTMENTS}
`;

const OPTIONS_ANSWER = `The budget is **$14.5M** against a cap of **$14.2M**, so something has to give. These are the options I see:

${OPTIONS}

**C**, **E** and **G** stay within the cap without board approval; **G** is the only one that closes the full gap.
`;

export const BUDGET_TRANSCRIPT: ModelMessage[] = [
	{
		id: "m-budget-1",
		role: "user",
		content:
			"Clean up the 2027 budget sheet and tell me what you changed. Then show me the budget by department.",
	},
	{ id: "m-budget-2", role: "assistant", content: CLEANUP_ANSWER },
	{
		id: "m-budget-3",
		role: "user",
		content: "We're over the cap. What are our options?",
	},
	{ id: "m-budget-4", role: "assistant", content: OPTIONS_ANSWER },
];
