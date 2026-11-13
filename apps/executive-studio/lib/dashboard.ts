import { usageFromAnswers } from "./pricing";
import { renderedVideoMinutes } from "./time";
import type { Consultation, ConsultationStatus } from "./types";
import type { Recommendation } from "./recommendation/schema";

export type Dashboard = {
  consultationCount: number;
  painPoints: { id: string; count: number }[];
  proposedPlans: { code: string; count: number }[];
  expectedVideoMinutes: number;
  expectedVoiceMinutes: number;
  openFollowUps: number;
  byStatus: Record<ConsultationStatus, number>;
  decisions: number;
  knowledgeGaps: { text: string; count: number }[];
  instrumentation: "not_connected";
  usageMetrics: null;
};

const STATUSES: ConsultationStatus[] = ["discovery", "proposed", "pilot", "decided", "paused"];

export function buildDashboard(
  consultations: Consultation[],
  recommendations: Map<string, Recommendation | null>,
): Dashboard {
  const pains = new Map<string, number>();
  const plans = new Map<string, number>();
  const gaps = new Map<string, number>();
  const byStatus = Object.fromEntries(STATUSES.map((status) => [status, 0])) as Record<ConsultationStatus, number>;
  let expectedVideoMinutes = 0;
  let expectedVoiceMinutes = 0;
  let openFollowUps = 0;

  for (const consultation of consultations) {
    byStatus[consultation.status] += 1;
    if (consultation.pain) pains.set(consultation.pain, (pains.get(consultation.pain) ?? 0) + 1);
    const usage = usageFromAnswers(consultation.answers, consultation.pain);
    const derived = renderedVideoMinutes(usage.videosPerMonth, usage.averageVideoSeconds);
    expectedVideoMinutes += Math.max(derived, usage.statedVideoMinutes ?? 0);
    expectedVoiceMinutes += usage.voiceMinutes;
    if (consultation.status !== "decided" && consultation.status !== "paused") openFollowUps += 1;
    const recommendation = recommendations.get(consultation.id);
    if (recommendation?.recommended_plan?.code) {
      const code = recommendation.recommended_plan.code;
      plans.set(code, (plans.get(code) ?? 0) + 1);
    }
    for (const gap of recommendation?.missing_information ?? []) {
      gaps.set(gap, (gaps.get(gap) ?? 0) + 1);
    }
  }

  return {
    consultationCount: consultations.length,
    painPoints: [...pains.entries()].map(([id, count]) => ({ id, count })).sort((a, b) => b.count - a.count),
    proposedPlans: [...plans.entries()].map(([code, count]) => ({ code, count })).sort((a, b) => b.count - a.count),
    expectedVideoMinutes,
    expectedVoiceMinutes,
    openFollowUps,
    byStatus,
    decisions: byStatus.decided,
    knowledgeGaps: [...gaps.entries()].map(([text, count]) => ({ text, count })).sort((a, b) => b.count - a.count).slice(0, 12),
    instrumentation: "not_connected",
    usageMetrics: null,
  };
}
