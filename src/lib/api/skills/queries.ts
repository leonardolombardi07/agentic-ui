import { mutationOptions, queryOptions } from "@tanstack/react-query";
import { notFound } from "@tanstack/react-router";
import { SKILLS } from "./mock-data";

/* Mock backend until the real API exists. Only the query/mutation options are public. */

/** Skills the current user has added. Real ownership comes with the API. */
const MY_SKILL_IDS = new Set(["pdf", "xlsx", "data-analysis"]);

function delay(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Every skill in the directory. */
export function skillsListQueryOptions() {
	return queryOptions({
		queryKey: ["skills"],
		queryFn: async () => {
			await delay(150);
			return SKILLS;
		},
	});
}

/** The ids of the skills the user added. */
export function mySkillIdsQueryOptions() {
	return queryOptions({
		// Not under ["skills", ...]: that prefix holds per-id details, and an id could be "mine".
		queryKey: ["my-skills"],
		queryFn: async () => {
			await delay(100);
			return [...MY_SKILL_IDS];
		},
	});
}

export function skillQueryOptions(skillId: string) {
	return queryOptions({
		queryKey: ["skills", skillId],
		queryFn: async () => {
			await delay(100);
			const skill = SKILLS.find((s) => s.id === skillId);
			if (!skill) throw notFound();
			return skill;
		},
		retry: false,
	});
}

/** Adds a skill to the user's skills. The variable is the skill id. */
export function addSkillMutationOptions() {
	return mutationOptions({
		mutationKey: ["my-skills", "add"],
		mutationFn: async (skillId: string) => {
			await delay(200);
			MY_SKILL_IDS.add(skillId);
		},
		onSuccess: (_data, _skillId, _onMutateResult, { client }) =>
			client.invalidateQueries({ queryKey: mySkillIdsQueryOptions().queryKey }),
	});
}

/** Removes a skill from the user's skills. The variable is the skill id. */
export function removeSkillMutationOptions() {
	return mutationOptions({
		mutationKey: ["my-skills", "remove"],
		mutationFn: async (skillId: string) => {
			await delay(200);
			MY_SKILL_IDS.delete(skillId);
		},
		onSuccess: (_data, _skillId, _onMutateResult, { client }) =>
			client.invalidateQueries({ queryKey: mySkillIdsQueryOptions().queryKey }),
	});
}
