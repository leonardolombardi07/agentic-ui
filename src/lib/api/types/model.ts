import { z } from "zod";

/** Ordered from least to most thinking. A model supports a subset (or none). */
export const EffortLevelSchema = z.enum([
	"low",
	"medium",
	"high",
	"xhigh",
	"max",
]);

export type EffortLevel = z.infer<typeof EffortLevelSchema>;

export const ModelSchema = z
	.object({
		id: z.string(),
		name: z.string(),
		description: z.string(),
		/** Empty when the model has no effort control. */
		effortLevels: z.array(EffortLevelSchema),
		/** Null exactly when `effortLevels` is empty. */
		defaultEffort: EffortLevelSchema.nullable(),
	})
	.refine(
		(model) =>
			model.effortLevels.length === 0
				? model.defaultEffort === null
				: model.defaultEffort !== null &&
					model.effortLevels.includes(model.defaultEffort),
		{ message: "defaultEffort must be one of effortLevels, or null if none" },
	);

export type Model = z.infer<typeof ModelSchema>;
