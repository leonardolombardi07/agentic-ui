import {
	type AdapterYieldChunk,
	EventType,
	type ModelMessage,
	type RunErrorEvent,
} from "@tanstack/ai";
import { fakeText } from "@tanstack/ai/testing";
import {
	createOpenRouterText,
	OpenRouterTextAdapter,
} from "@tanstack/ai-openrouter";
import { MissingEnvError, type ServerEnv } from "@/lib/api/env.server";

/** The adapter's model ids. Not exported by name from `@tanstack/ai-openrouter`. */
export type OpenRouterModelId = Parameters<typeof createOpenRouterText>[0];

/**
 * The model adapter for a run, per `MOCK_LLM` (see `env.server.ts`): OpenRouter,
 * OpenRouter with a mock reply when rate-limited, or the mock alone.
 */
export function createChatAdapter(modelId: OpenRouterModelId, env: ServerEnv) {
	if (env.mockLlm === "always") {
		// Typed as the real adapter, so `chat()` options stay the same in every mode.
		return asOpenRouterAdapter(mockModel("MOCK_LLM is set to always."));
	}
	if (env.openRouterApiKey === null) {
		throw new MissingEnvError("OPENROUTER_API_KEY is not set.");
	}
	if (env.mockLlm === "fallback") {
		return new OpenRouterWithMockFallback(
			{ apiKey: env.openRouterApiKey },
			modelId,
		);
	}
	return createOpenRouterText(modelId, env.openRouterApiKey);
}

/**
 * OpenRouter, except that a rate-limited call is answered by the mock model, so a
 * daily free-tier cap doesn't block UI work. Only before any output: once the model
 * has started answering, errors pass through untouched.
 */
class OpenRouterWithMockFallback<
	TModel extends OpenRouterModelId,
> extends OpenRouterTextAdapter<TModel> {
	override async *chatStream(
		options: Parameters<OpenRouterTextAdapter<TModel>["chatStream"]>[0],
	): AsyncIterable<AdapterYieldChunk> {
		// Held back until we know whether the call failed on a rate limit.
		const held: AdapterYieldChunk[] = [];
		let isAnswering = false;

		for await (const chunk of super.chatStream(options)) {
			if (isAnswering) {
				yield chunk;
				continue;
			}
			if (chunk.type === EventType.RUN_STARTED) {
				held.push(chunk);
				continue;
			}
			if (chunk.type === EventType.RUN_ERROR && isRateLimited(chunk)) {
				console.warn(
					`[api/chat] OpenRouter rate limit on ${this.model}; answering with the mock model. ${chunk.message}`,
				);
				yield* mockModel(
					`OpenRouter rate-limited ${this.model}: ${chunk.message}`,
				).chatStream(options);
				return;
			}
			isAnswering = true;
			yield* held;
			yield chunk;
		}
		if (!isAnswering) yield* held;
	}
}

/**
 * OpenRouter reports rate limits as HTTP 429, but the status doesn't always reach
 * `code`, so the error type and message count too.
 */
function isRateLimited(event: RunErrorEvent): boolean {
	const code = event.code ?? event.error?.code;
	if (code === "429") return true;
	if (event.errorType === "rate_limit_exceeded") return true;
	return /rate.?limit|too many requests|\b429\b/i.test(event.message);
}

/**
 * A canned, clearly labelled reply that streams like a real one (thinking first),
 * so the chat UI can be exercised without a provider. New per call: each fake
 * answers one queued response.
 */
function mockModel(reason: string) {
	const model = fakeText({ model: "mock", tokensPerSecond: 60 });
	model.setResponses([
		({ request }) => ({
			thinking: "This is the mock model: no provider was called.",
			text: [
				"[Mock reply] This isn't a real answer.",
				`Why: ${reason}`,
				`Your message: "${lastUserText(request.messages)}"`,
			].join("\n\n"),
		}),
	]);
	return model;
}

function lastUserText(messages: ReadonlyArray<ModelMessage>): string {
	// `findLast` needs ES2023; the tsconfig targets ES2022.
	const last = [...messages].reverse().find((m) => m.role === "user");
	if (!last) return "";
	if (typeof last.content === "string") return last.content;
	if (!Array.isArray(last.content)) return "";
	return last.content
		.flatMap((part) => (part.type === "text" ? [part.content] : []))
		.join(" ");
}

/*
 * The fake adapter implements the same `chatStream` contract, but its declared
 * provider types differ. `chat()` only streams from it, so the cast is safe.
 */
function asOpenRouterAdapter(
	adapter: ReturnType<typeof mockModel>,
): OpenRouterTextAdapter<OpenRouterModelId> {
	return adapter as unknown as OpenRouterTextAdapter<OpenRouterModelId>;
}
