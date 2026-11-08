import type { Skill } from "@/lib/api/types/skill";

/* Mock data until the real API exists. */

export const SKILLS: Skill[] = [
	{
		id: "vercel",
		name: "vercel",
		description: "Build and deploy web apps and agents",
		publisher: "Anthropic Directory",
		category: "Development",
		version: 3,
		updatedAt: "2026-10-28T09:00:00Z",
		instructions:
			"# Vercel\n\nUse this skill when the user wants to build, preview or deploy a web app.\n\n1. Detect the framework from `package.json`.\n2. Run the build locally before deploying.\n3. Deploy a preview first; promote to production only when asked.\n4. Report the deployment URL and any build warnings.",
		files: ["SKILL.md", "references/frameworks.md"],
	},
	{
		id: "agent-estimate",
		name: "agent-estimate",
		description:
			"Effort estimation for AI coding agents - PERT three-point estimation with METR reliability thresholds and review overhead",
		publisher: "Anthropic Directory",
		category: "Planning",
		version: 1,
		updatedAt: "2026-10-30T12:00:00Z",
		instructions:
			"# Agent estimate\n\nEstimate how long an agent needs for a task.\n\n- Give optimistic, likely and pessimistic durations (PERT).\n- Flag tasks above the 50% reliability horizon.\n- Add review overhead for every change a human must read.",
		files: ["SKILL.md"],
	},
	{
		id: "data-analysis",
		name: "data-analysis",
		description:
			"Query, chart and explain your data - SQL, spreadsheets and dashboards in one place",
		publisher: "Anthropic",
		category: "Data",
		version: 5,
		updatedAt: "2026-10-12T10:30:00Z",
		instructions:
			"# Data analysis\n\nWhen given a dataset or a database:\n\n1. Profile it first: shape, types, nulls, duplicates.\n2. State the question as a testable claim.\n3. Prefer a chart when comparing more than five values.\n4. Always say what the data cannot answer.",
		files: ["SKILL.md", "scripts/profile.py", "references/charts.md"],
	},
	{
		id: "pdf",
		name: "pdf",
		description: "Read, merge, split, fill and create PDF files",
		publisher: "Anthropic",
		category: "Documents",
		version: 4,
		updatedAt: "2026-09-21T08:00:00Z",
		instructions:
			"# PDF\n\nUse for any task that reads or writes a PDF.\n\n- Extract text and tables before summarizing.\n- Run OCR on scanned pages.\n- Never overwrite the original; write a new file.",
		files: ["SKILL.md", "scripts/extract.py"],
	},
	{
		id: "xlsx",
		name: "xlsx",
		description: "Create, read and fix spreadsheets, keeping formulas intact",
		publisher: "Anthropic",
		category: "Documents",
		version: 4,
		updatedAt: "2026-09-21T08:00:00Z",
		instructions:
			"# Spreadsheets\n\n- Keep formulas; never paste computed values over them.\n- Name every new sheet.\n- Check for #REF! and #DIV/0! before handing the file back.",
		files: ["SKILL.md"],
	},
	{
		id: "code-review",
		name: "code-review",
		description: "Review a diff for correctness, security and performance",
		publisher: "Acme Engineering",
		category: "Development",
		version: 2,
		updatedAt: "2026-10-02T15:45:00Z",
		instructions:
			"# Code review\n\nRead the whole diff before commenting.\n\nRank findings: bugs, then security, then performance, then style. Skip style findings the linter already catches.",
		files: ["SKILL.md", "references/checklist.md"],
	},
	{
		id: "brand-voice",
		name: "brand-voice",
		description: "Write in the company's tone: plain, warm and specific",
		publisher: "Acme Marketing",
		category: "Writing",
		version: 1,
		updatedAt: "2026-08-14T11:00:00Z",
		instructions:
			"# Brand voice\n\n- Short sentences. Active voice.\n- Say what the product does before what it is.\n- No exclamation marks.",
		files: ["SKILL.md"],
	},
	{
		id: "meeting-notes",
		name: "meeting-notes",
		description: "Turn a transcript into decisions, owners and next steps",
		publisher: "Anthropic Directory",
		category: "Productivity",
		version: 2,
		updatedAt: "2026-10-05T09:15:00Z",
		instructions:
			"# Meeting notes\n\nOutput three sections: Decisions, Action items (owner + date), Open questions. Quote nobody unless asked.",
		files: ["SKILL.md"],
	},
];
