import { type Model, ModelSchema } from "@/lib/api/types/model";

/*
 * Mock data until the real API exists. Shared by the query options and the server.
 * Ids are OpenRouter model ids: the server passes them straight to the adapter.
 *
 * OpenRouter's free models (`:free`): rate-limited, and OpenRouter adds and retires
 * them often, so check https://openrouter.ai/models?max_price=0 when one stops working.
 * No effort control: the adapter doesn't declare reasoning levels for these, so it
 * would ignore the setting anyway. The first model is the default.
 */
export const MODELS: Model[] = ModelSchema.array().parse([
	{
		id: "nvidia/nemotron-3.5-super-vl:free",
		name: "Nemotron 3.5 Super VL",
		description: "NVIDIA. Largest context (1M tokens), reads images.",
		effortLevels: [],
		defaultEffort: null,
	},
	{
		id: "recursive/flint-v1.0:free",
		name: "Flint",
		description: "Recursive. Text only, 262K-token context.",
		effortLevels: [],
		defaultEffort: null,
	},
	{
		id: "xingchen-agi/xing4.0-29b-a4b:free",
		name: "Xing4.0 29B",
		description: "XingChen. Small and fast, 262K-token context.",
		effortLevels: [],
		defaultEffort: null,
	},
]);

/** What new sessions start with. */
export const DEFAULT_MODEL: Model = MODELS[0];
