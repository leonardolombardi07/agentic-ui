import { z } from "zod";
import { createPersistedStore } from "@/lib/store";

/* Home isn't a workspace tab, so its draft gets its own store: it survives leaving Home and reloads. */
export const homeDraft = createPersistedStore({
	key: "agentic-ui:home-draft:v1",
	schema: z.string(),
	initialState: "",
});
