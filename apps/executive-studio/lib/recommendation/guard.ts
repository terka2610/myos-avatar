import type { EngineInput } from "./rules";
import { recommendationSchema, type Recommendation } from "./schema";

function L(locale: EngineInput["locale"], en: string, it: string): string {
  return locale === "it" ? it : en;
}

function corpus(input: EngineInput): string {
  return [input.audience, input.pain, input.notes, ...Object.values(input.answers)].join("\n").toLowerCase();
}

/** Drop model output that invents evidence or claims a capability this studio does not operate. */
export function acceptModelOutput(value: unknown, input: EngineInput): Recommendation | null {
  const parsed = recommendationSchema.safeParse(value);
  if (!parsed.success) return null;
  const source = corpus(input);
  const evidence = parsed.data.evidence_from_customer.filter((line) => {
    const chunk = (line.includes(":") ? line.split(":").slice(1).join(":") : line).trim().toLowerCase();
    if (chunk.length < 3) return false;
    return source.includes(chunk.slice(0, Math.min(chunk.length, 80)));
  });
  const removed = evidence.length !== parsed.data.evidence_from_customer.length;
  const next: Recommendation = {
    ...parsed.data,
    evidence_from_customer: evidence,
    risks: removed
      ? [
          ...parsed.data.risks,
          L(
            input.locale,
            "A model line was removed because it was not in the customer record.",
            "Una riga del modello è stata tolta perché non era nel verbale del cliente.",
          ),
        ]
      : parsed.data.risks,
  };
  if (claimsUnavailableCapability(next)) return null;
  return next;
}

function claimsUnavailableCapability(recommendation: Recommendation): boolean {
  const operational = new Set(["configurable", "proposal"]);
  const blocked = /zoom|teams|holograph|olograf|crm|unlimited video|video illimitat/;
  if (operational.has(recommendation.recommended_solution.availability) && blocked.test(recommendation.recommended_solution.name.toLowerCase())) {
    return true;
  }
  return recommendation.recommended_features.some((feature) => {
    if (!operational.has(feature.availability)) return false;
    return blocked.test(feature.name.toLowerCase());
  });
}
