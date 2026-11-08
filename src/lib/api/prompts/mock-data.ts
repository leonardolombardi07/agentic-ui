import type { Prompt } from "@/lib/api/types/prompt";

/* Mock data until the real API exists. */

export const PROMPTS: Prompt[] = [
	{
		id: "summarize-for-execs",
		name: "Summarize for executives",
		description: "A short summary with the decision needed up front",
		text: "Summarize the attached material for an executive audience.\n\n- Start with the decision or action needed.\n- Then at most four supporting points.\n- Flag risks and open questions last.\n- Keep it under 120 words.",
		publisher: "Acme",
		category: "Writing",
		updatedAt: "2026-10-20T10:00:00Z",
	},
	{
		id: "explain-like-new",
		name: "Explain it to a beginner",
		description: "Plain-language explanation with one example",
		text: "Explain this as if I have never seen the topic before. Avoid jargon; when you must use a term, define it in the same sentence. Finish with one concrete example.",
		publisher: "Acme",
		category: "Learning",
		updatedAt: "2026-09-30T14:00:00Z",
	},
	{
		id: "review-my-draft",
		name: "Review my draft",
		description: "Feedback on structure, clarity and tone, without rewriting",
		text: "Review my draft. Give feedback on structure, clarity and tone. Quote the lines you mean. Do not rewrite it unless I ask.",
		publisher: "Acme",
		category: "Writing",
		updatedAt: "2026-10-11T09:30:00Z",
	},
	{
		id: "bug-report",
		name: "Write a bug report",
		description: "Steps, expected, actual and environment",
		text: "Turn the notes above into a bug report with these sections: Summary, Steps to reproduce, Expected result, Actual result, Environment. Ask me for anything missing instead of guessing.",
		publisher: "Acme Engineering",
		category: "Development",
		updatedAt: "2026-10-18T16:20:00Z",
	},
	{
		id: "pros-and-cons",
		name: "Pros, cons and a pick",
		description: "Compare options and recommend one",
		text: "Compare the options I describe. For each, list pros and cons that matter for my situation, then recommend one and say what would change your mind.",
		publisher: "Acme",
		category: "Thinking",
		updatedAt: "2026-08-25T08:10:00Z",
	},
	{
		id: "translate-keep-tone",
		name: "Translate, keep the tone",
		description: "Faithful translation that preserves voice",
		text: "Translate the text into the language I name. Keep the tone and formatting. Do not localize idioms unless there is no equivalent; note any you changed.",
		publisher: "Acme",
		category: "Writing",
		updatedAt: "2026-09-02T12:00:00Z",
	},
];
