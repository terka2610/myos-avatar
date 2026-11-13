import { z } from "zod";

export const availabilitySchema = z.enum([
  "configurable",
  "demo_only",
  "not_operational",
  "requires_consent",
  "subject_to_staffing",
  "feasibility_required",
  "proposal",
]);

export const recommendationSchema = z.object({
  problem_summary: z.string().min(1),
  evidence_from_customer: z.array(z.string()),
  missing_information: z.array(z.string()),
  next_best_question: z.string().min(1),
  recommended_solution: z.object({
    name: z.string().min(1),
    summary: z.string().min(1),
    availability: availabilitySchema,
  }),
  recommended_features: z.array(
    z.object({
      name: z.string().min(1),
      availability: availabilitySchema,
    }),
  ),
  implementation_complexity: z.enum(["low", "medium", "high"]),
  technical_dependencies: z.array(z.string()),
  recommended_plan: z
    .object({
      code: z.string().nullable(),
      name: z.string(),
      reason: z.string(),
      monthly_eur: z.number().nullable(),
      setup_eur: z.number().nullable(),
    })
    .nullable(),
  pricing_assumptions: z.array(z.string()),
  pilot_proposal: z.object({
    summary: z.string().min(1),
    success_would_show: z.string().min(1),
  }),
  success_metrics: z.array(z.string()),
  risks: z.array(z.string()),
  follow_up_actions: z.array(z.string()),
});

export type Recommendation = z.infer<typeof recommendationSchema>;

export function parseRecommendation(value: unknown): Recommendation {
  return recommendationSchema.parse(value);
}
