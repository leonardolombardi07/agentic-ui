import type { Agent, AgentTool } from "@/lib/api/types/agent";

/* Mock data until the real API exists. Shared by the query options and the server. */
/* Shared tools, so several agents can list the same capability. */
const TOOLS = {
	webSearch: {
		id: "web-search",
		name: "Web search",
		description: "Searches the public web and returns ranked results.",
		source: "Built-in",
	},
	webFetch: {
		id: "web-fetch",
		name: "Web fetch",
		description: "Reads a web page and converts it to text.",
		source: "Built-in",
	},
	readFile: {
		id: "read-file",
		name: "Read file",
		description: "Opens files you attach or share with the session.",
		source: "Built-in",
	},
	writeFile: {
		id: "write-file",
		name: "Write file",
		description: "Creates or updates files in the session's workspace.",
		source: "Built-in",
	},
	runCode: {
		id: "run-code",
		name: "Run code",
		description: "Runs Python in a sandbox for analysis and file conversion.",
		source: "Built-in",
	},
	driveSearch: {
		id: "drive-search",
		name: "Search documents",
		description: "Finds documents in the company drive.",
		source: "SharePoint",
	},
	sqlQuery: {
		id: "sql-query",
		name: "Run SQL query",
		description: "Runs read-only queries against the data warehouse.",
		source: "Data Warehouse",
	},
	gitDiff: {
		id: "git-diff",
		name: "Read pull request",
		description: "Fetches a pull request's diff, comments and checks.",
		source: "GitHub",
	},
} satisfies Record<string, AgentTool>;

export const AGENTS: Agent[] = [
	{
		id: "research",
		name: "Research",
		description:
			"Searches the web and internal docs, then writes a cited summary.",
		instructions:
			"You are Research. Your one job: answer questions with sources. Search the web and internal documents, read the most relevant ones in full, and write a short summary where every claim is cited. Say so when sources disagree or when you could not find something.",
		color: "#2bb5a0",
		avatarUrl: "/avatars/research.svg",
		publisher: "Agentic UI",
		category: "Research",
		version: 4,
		updatedAt: "2026-10-23T12:00:00Z",
		installCount: 1756,
		skills: [
			{
				id: "deep-research",
				name: "Deep research",
				description: "Plans a search, reads widely and writes a report.",
				version: 3,
			},
			{
				id: "citations",
				name: "Citations",
				description: "Formats sources and links each claim to one.",
				version: 2,
			},
		],
		tools: [TOOLS.webSearch, TOOLS.webFetch, TOOLS.driveSearch],
	},
	{
		id: "slides",
		name: "Slides",
		description: "Turns notes and data into a slide deck.",
		instructions:
			"You are Slides. Turn the user's notes, documents or data into a clear deck: one idea per slide, short titles that state the takeaway, and charts instead of tables when the data allows it.",
		color: "#8b5cf6",
		publisher: "Agentic UI",
		category: "Productivity",
		version: 3,
		updatedAt: "2026-10-18T12:00:00Z",
		installCount: 1896,
		skills: [
			{
				id: "deck-outline",
				name: "Deck outline",
				description: "Drafts the storyline before building slides.",
				version: 2,
			},
			{
				id: "pptx",
				name: "PowerPoint files",
				description: "Builds and edits .pptx files.",
				version: 5,
			},
		],
		tools: [TOOLS.readFile, TOOLS.writeFile, TOOLS.runCode],
	},
	{
		id: "excel-analyst",
		name: "Excel Analyst",
		description: "Cleans spreadsheets, builds formulas and charts.",
		instructions:
			"You are Excel Analyst. Clean and restructure spreadsheets, write formulas that stay readable, and build charts. Always explain what you changed and never overwrite the user's original file.",
		color: "#22c55e",
		publisher: "Agentic UI",
		category: "Data",
		version: 2,
		updatedAt: "2026-09-30T12:00:00Z",
		installCount: 1207,
		skills: [
			{
				id: "xlsx",
				name: "Excel files",
				description: "Reads, cleans and writes .xlsx files.",
				version: 4,
			},
			{
				id: "charts",
				name: "Charts",
				description: "Picks the right chart and styles it consistently.",
				version: 2,
			},
		],
		tools: [TOOLS.readFile, TOOLS.writeFile, TOOLS.runCode],
	},
	{
		id: "code-reviewer",
		name: "Code Reviewer",
		description: "Reviews diffs for bugs, security and style.",
		instructions:
			"You are Code Reviewer. Review the diff for correctness first, then security, then style. Comment only on what matters, propose a concrete fix for each issue, and approve when there is nothing blocking.",
		color: "#3b82f6",
		publisher: "Agentic UI",
		category: "Engineering",
		version: 5,
		updatedAt: "2026-10-27T12:00:00Z",
		installCount: 1595,
		skills: [
			{
				id: "security-review",
				name: "Security review",
				description: "Checks for injection, auth and secrets issues.",
				version: 3,
			},
		],
		tools: [TOOLS.gitDiff, TOOLS.readFile],
	},
	{
		id: "writer",
		name: "Writer",
		description: "Drafts and edits documents in your voice.",
		instructions:
			"You are Writer. Draft and edit documents in the user's voice. Keep it short, cut filler, and ask before changing the meaning of anything.",
		color: "#f5b82e",
		publisher: "Agentic UI",
		category: "Writing",
		version: 3,
		updatedAt: "2026-10-12T12:00:00Z",
		installCount: 2220,
		skills: [
			{
				id: "writing-style",
				name: "Writing style",
				description: "Learns and applies the user's voice.",
				version: 2,
			},
			{
				id: "docx",
				name: "Word files",
				description: "Builds and edits .docx files.",
				version: 4,
			},
		],
		tools: [TOOLS.readFile, TOOLS.writeFile, TOOLS.driveSearch],
	},
	{
		id: "meeting-notes",
		name: "Meeting Notes",
		description: "Turns transcripts into decisions and action items.",
		instructions:
			"You are Meeting Notes. Turn a transcript into decisions, action items with owners and dates, and open questions. Don't invent owners or dates that weren't said.",
		color: "#f97316",
		publisher: "Agentic UI",
		category: "Productivity",
		version: 1,
		updatedAt: "2026-08-14T12:00:00Z",
		installCount: 954,
		skills: [
			{
				id: "action-items",
				name: "Action items",
				description: "Extracts owners, dates and follow-ups.",
				version: 1,
			},
		],
		tools: [TOOLS.readFile],
	},
	{
		id: "sql-helper",
		name: "SQL Helper",
		description: "Writes and explains queries against your warehouse.",
		instructions:
			"You are SQL Helper. Write correct, readable SQL against the warehouse, explain what each query does, and run it only in read-only mode.",
		color: "#06b6d4",
		publisher: "Data Platform",
		category: "Data",
		version: 2,
		updatedAt: "2026-10-02T12:00:00Z",
		installCount: 642,
		skills: [
			{
				id: "warehouse-schema",
				name: "Warehouse schema",
				description: "Knows the tables, joins and metric definitions.",
				version: 6,
			},
		],
		tools: [TOOLS.sqlQuery, TOOLS.runCode],
	},
	{
		id: "translator",
		name: "Translator",
		description: "Translates documents while keeping their formatting.",
		instructions:
			"You are Translator. Translate documents faithfully, keep the original formatting, and flag terms that have no direct equivalent.",
		color: "#ec4899",
		publisher: "Agentic UI",
		category: "Writing",
		version: 2,
		updatedAt: "2026-07-21T12:00:00Z",
		installCount: 811,
		skills: [
			{
				id: "glossary",
				name: "Glossary",
				description: "Keeps company terms consistent across languages.",
				version: 1,
			},
		],
		tools: [TOOLS.readFile, TOOLS.writeFile],
	},
	{
		id: "compliance-checker",
		name: "Compliance Checker",
		description: "Flags policy and regulatory issues in drafts.",
		instructions:
			"You are Compliance Checker. Read the draft against company policy and the relevant regulations, flag each issue with the rule it breaks, and suggest compliant wording. You do not approve documents.",
		color: "#ef4444",
		publisher: "Compliance",
		category: "Compliance",
		version: 3,
		updatedAt: "2026-10-09T12:00:00Z",
		installCount: 388,
		skills: [
			{
				id: "policy-library",
				name: "Policy library",
				description: "Looks up the current internal policies.",
				version: 3,
			},
		],
		tools: [TOOLS.readFile, TOOLS.driveSearch],
	},
];
