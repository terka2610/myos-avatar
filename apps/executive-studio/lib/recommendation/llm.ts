import { CAPABILITIES } from "../capabilities";
import { acceptModelOutput } from "./guard";
import type { EngineInput } from "./rules";
import type { Recommendation } from "./schema";

export type LlmOutcome =
  | { ok: true; recommendation: Recommendation }
  | { ok: false; reason: "no_key" | "timeout" | "invalid" | "http" };

export async function requestModelRecommendation(options: {
  apiKey: string | undefined;
  baseUrl?: string;
  model?: string;
  timeoutMs: number;
  fetchImpl?: typeof fetch;
  input: EngineInput;
}): Promise<LlmOutcome> {
  if (!options.apiKey) return { ok: false, reason: "no_key" };
  const fetchImpl = options.fetchImpl ?? fetch;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs);
  try {
    const response = await fetchImpl(`${options.baseUrl ?? "https://api.openai.com/v1"}/chat/completions`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${options.apiKey}`,
      },
      body: JSON.stringify({
        model: options.model || process.env.OPENAI_MODEL || "gpt-4o-mini",
        temperature: 0.1,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You write a sales-consultation recommendation as JSON. Use only facts present in the user payload. If a fact is missing, list it under missing_information and do not invent it. Never claim a capability marked not_operational, and never promise unlimited video or guaranteed time savings. Reply with a single JSON object matching the schema.",
          },
          {
            role: "user",
            content: JSON.stringify({
              schema_fields: [
                "problem_summary",
                "evidence_from_customer",
                "missing_information",
                "next_best_question",
                "recommended_solution",
                "recommended_features",
                "implementation_complexity",
                "technical_dependencies",
                "recommended_plan",
                "pricing_assumptions",
                "pilot_proposal",
                "success_metrics",
                "risks",
                "follow_up_actions",
              ],
              locale: options.input.locale,
              capabilities: CAPABILITIES.map((item) => ({
                name: item.name[options.input.locale],
                availability: item.availability,
                limitation: item.limitation[options.input.locale],
              })),
              consultation: {
                audience: options.input.audience,
                pain: options.input.pain,
                notes: options.input.notes,
                answers: options.input.answers,
              },
            }),
          },
        ],
      }),
    });
    if (!response.ok) return { ok: false, reason: "http" };
    const payload = (await response.json()) as { choices?: { message?: { content?: string } }[] };
    const content = payload.choices?.[0]?.message?.content;
    if (!content) return { ok: false, reason: "invalid" };
    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      return { ok: false, reason: "invalid" };
    }
    const accepted = acceptModelOutput(parsed, options.input);
    if (!accepted) return { ok: false, reason: "invalid" };
    return { ok: true, recommendation: accepted };
  } catch (error) {
    if (error instanceof Error && (error.name === "AbortError" || error.message.toLowerCase().includes("abort"))) {
      return { ok: false, reason: "timeout" };
    }
    return { ok: false, reason: "http" };
  } finally {
    clearTimeout(timer);
  }
}
