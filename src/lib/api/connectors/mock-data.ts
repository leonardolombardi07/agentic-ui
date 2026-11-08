import type { Connector } from "@/lib/api/types/connector";

/* Mock data until the real API exists. */

export const CONNECTORS: Connector[] = [
	{
		id: "google-drive",
		name: "Google Drive",
		description: "Search, read, and upload files instantly",
		about:
			"Lets agents find documents, spreadsheets and slides in your Drive, read their contents and save new files back.",
		publisher: "Google",
		category: "Files",
		isVerified: true,
		color: "#1a73e8",
		monogram: "Dr",
		tools: [
			{
				name: "Search files",
				description: "Finds files by name or content.",
				access: "read",
			},
			{
				name: "Read file",
				description: "Opens a file and returns its text.",
				access: "read",
			},
			{
				name: "Upload file",
				description: "Saves a new file to a folder you choose.",
				access: "write",
			},
		],
	},
	{
		id: "gmail",
		name: "Gmail",
		description: "Draft replies, summarize threads, & search your inbox",
		about:
			"Gives agents access to your mailbox. They can read and search mail and prepare drafts; nothing is sent without your approval.",
		publisher: "Google",
		category: "Communication",
		isVerified: true,
		color: "#ea4335",
		monogram: "Gm",
		tools: [
			{
				name: "Search mail",
				description: "Searches messages and threads.",
				access: "read",
			},
			{
				name: "Read thread",
				description: "Returns every message in a thread.",
				access: "read",
			},
			{
				name: "Create draft",
				description: "Writes a draft reply. Never sends it.",
				access: "write",
			},
		],
	},
	{
		id: "github",
		name: "GitHub",
		description: "Browse repositories, issues and pull requests",
		about:
			"Connects agents to your repositories so they can read code, triage issues and comment on pull requests.",
		publisher: "GitHub",
		category: "Development",
		isVerified: true,
		color: "#24292f",
		monogram: "Gh",
		tools: [
			{
				name: "Search code",
				description: "Searches code across your repositories.",
				access: "read",
			},
			{
				name: "List issues",
				description: "Lists and filters issues.",
				access: "read",
			},
			{
				name: "Comment on pull request",
				description: "Posts a review comment.",
				access: "write",
			},
		],
	},
	{
		id: "slack",
		name: "Slack",
		description: "Search conversations and post messages to channels",
		about:
			"Lets agents read channels they are invited to and post messages on your behalf, after you approve.",
		publisher: "Slack",
		category: "Communication",
		isVerified: true,
		color: "#611f69",
		monogram: "Sl",
		tools: [
			{
				name: "Search messages",
				description: "Searches channels and DMs.",
				access: "read",
			},
			{
				name: "Post message",
				description: "Posts to a channel.",
				access: "write",
			},
		],
	},
	{
		id: "notion",
		name: "Notion",
		description: "Read and edit pages and databases in your workspace",
		about:
			"Connects agents to the pages and databases you share with the integration.",
		publisher: "Notion",
		category: "Productivity",
		isVerified: true,
		color: "#37352f",
		monogram: "No",
		tools: [
			{
				name: "Search pages",
				description: "Finds pages and database rows.",
				access: "read",
			},
			{
				name: "Update page",
				description: "Edits the content of a page.",
				access: "write",
			},
		],
	},
	{
		id: "linear",
		name: "Linear",
		description: "Create and update issues, projects and cycles",
		about: "Lets agents file and triage issues in your Linear workspace.",
		publisher: "Linear",
		category: "Development",
		isVerified: true,
		color: "#5e6ad2",
		monogram: "Li",
		tools: [
			{
				name: "List issues",
				description: "Lists issues for a team or project.",
				access: "read",
			},
			{
				name: "Create issue",
				description: "Opens a new issue.",
				access: "write",
			},
		],
	},
	{
		id: "pubmed",
		name: "PubMed",
		description: "Search biomedical literature and read abstracts",
		about: "Searches the NIH literature database. Read-only.",
		publisher: "NIH",
		category: "Science",
		isVerified: false,
		color: "#20558a",
		monogram: "Pm",
		tools: [
			{
				name: "Search articles",
				description: "Searches by keyword, author or journal.",
				access: "read",
			},
			{
				name: "Read abstract",
				description: "Returns an article's abstract.",
				access: "read",
			},
		],
	},
	{
		id: "sharepoint",
		name: "SharePoint",
		description: "Find documents across your company's sites",
		about:
			"Searches and reads documents from the SharePoint sites you can access.",
		publisher: "Microsoft",
		category: "Files",
		isVerified: true,
		color: "#038387",
		monogram: "Sp",
		tools: [
			{
				name: "Search documents",
				description: "Finds documents in company sites.",
				access: "read",
			},
		],
	},
];
