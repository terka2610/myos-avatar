import { buildDashboard, type Dashboard } from "./dashboard";
import type { Store } from "./db/store";
import { buildBrief } from "./exportBrief";
import { identityAuthorized } from "./onboarding";
import { quote, usageFromAnswers } from "./pricing";
import { requestModelRecommendation, type LlmOutcome } from "./recommendation/llm";
import { buildRecommendation, type EngineInput } from "./recommendation/rules";
import type { Recommendation } from "./recommendation/schema";
import { CONSENT_VERSION, type ConsentKind, type Consultation, type Locale, type Role, type Session } from "./types";

export class ServiceError extends Error {
  constructor(
    public code: string,
    public status: number,
  ) {
    super(code);
  }
}

export type RecommendationResult = {
  source: "rules" | "llm";
  fallbackReason: LlmOutcome["reason"] | null;
  recommendation: Recommendation;
};

type LlmClient = (input: EngineInput) => Promise<LlmOutcome>;

export function createServices(store: Store, options?: { llm?: LlmClient }) {
  function requireConsultation(session: Session, id: string): Consultation {
    const consultation = store.getConsultation(session.orgId, id);
    if (!consultation) throw new ServiceError("not_found", 404);
    return consultation;
  }

  function engineInput(session: Session, consultation: Consultation): EngineInput {
    const granted = store
      .listConsents(session.orgId, consultation.id)
      .filter((record) => record.granted)
      .map((record) => record.kind);
    return {
      locale: consultation.language,
      category: consultation.category,
      audience: consultation.audience,
      pain: consultation.pain,
      notes: consultation.notes,
      answers: consultation.answers,
      plans: store.listPlans().filter((plan) => plan.active),
      addons: store.listAddons().filter((addon) => addon.active),
      identityAuthorized: identityAuthorized(granted),
    };
  }

  return {
    persistence: store.persistence,
    openWorkspace(input: { consultantName: string; organizationName: string; role?: Role; adminCode?: string }) {
      const name = input.consultantName.trim();
      const organization = input.organizationName.trim();
      if (!name || !organization) throw new ServiceError("name_required", 400);
      const role = input.role === "admin" ? "admin" : "consultant";
      if (role === "admin" && !adminPermitted(input.adminCode)) throw new ServiceError("admin_code_required", 403);
      return store.createWorkspace({ consultantName: name, organizationName: organization, role });
    },
    resume(token: string | null | undefined): Session | null {
      if (!token) return null;
      return store.sessionFromToken(token);
    },
    requireSession(token: string | null | undefined): Session {
      const session = token ? store.sessionFromToken(token) : null;
      if (!session) throw new ServiceError("unauthorized", 401);
      return session;
    },
    createOrganization(session: Session, name: string) {
      if (!name.trim()) throw new ServiceError("name_required", 400);
      return store.createOrganization(session.userId, name);
    },
    listOrganizations(session: Session) {
      return store.listOrganizations(session.userId);
    },
    switchOrganization(token: string, orgId: string): Session {
      const session = store.switchOrganization(token, orgId);
      if (!session) throw new ServiceError("not_found", 404);
      return session;
    },
    createConsultation(session: Session, input: { language: Locale; category: string; pain: string; executiveLabel?: string }) {
      return store.createConsultation({
        orgId: session.orgId,
        userId: session.userId,
        language: input.language === "it" ? "it" : "en",
        category: input.category,
        pain: input.pain,
        executiveLabel: input.executiveLabel?.trim() ?? "",
      });
    },
    saveAnswer(session: Session, id: string, key: string, value: string) {
      if (!key.trim()) throw new ServiceError("invalid_answer", 400);
      const saved = store.saveAnswer(session.orgId, id, key, value);
      if (!saved) throw new ServiceError("not_found", 404);
      return saved;
    },
    getConsultation(session: Session, id: string) {
      return requireConsultation(session, id);
    },
    listConsultations(session: Session) {
      return store.listConsultations(session.orgId);
    },
    timeline(session: Session, id: string) {
      requireConsultation(session, id);
      return store.events(session.orgId, id);
    },
    async generateRecommendation(session: Session, id: string, mode: "rules" | "llm"): Promise<RecommendationResult> {
      const consultation = requireConsultation(session, id);
      const input = engineInput(session, consultation);
      if (mode === "llm") {
        const consent = store.latestConsent(session.orgId, id, "ai_provider");
        if (!consent?.granted) throw new ServiceError("consent_required", 403);
        const outcome = options?.llm
          ? await options.llm(input)
          : await requestModelRecommendation({
              apiKey: process.env.OPENAI_API_KEY,
              baseUrl: process.env.OPENAI_BASE_URL,
              model: process.env.OPENAI_MODEL,
              timeoutMs: Number(process.env.STUDIO_LLM_TIMEOUT_MS || 8000),
              input,
            });
        if (outcome.ok) {
          store.saveRecommendation(session.orgId, id, "llm", outcome.recommendation);
          return { source: "llm", fallbackReason: null, recommendation: outcome.recommendation };
        }
        const recommendation = buildRecommendation(input);
        store.saveRecommendation(session.orgId, id, "rules", recommendation);
        return { source: "rules", fallbackReason: outcome.reason, recommendation };
      }
      const recommendation = buildRecommendation(input);
      store.saveRecommendation(session.orgId, id, "rules", recommendation);
      return { source: "rules", fallbackReason: null, recommendation };
    },
    generateProposal(session: Session, id: string) {
      const consultation = requireConsultation(session, id);
      const stored = store.latestRecommendation(session.orgId, id);
      const recommendation = (stored?.payload as Recommendation | undefined) ?? buildRecommendation(engineInput(session, consultation));
      if (!stored) store.saveRecommendation(session.orgId, id, "rules", recommendation);
      const priced = quote(store.listPlans(), store.listAddons(), usageFromAnswers(consultation.answers, consultation.pain));
      const proposal = {
        painPoints: [consultation.pain].filter(Boolean),
        currentWorkflow: consultation.answers.current_handling ?? "",
        estimatedTimeBurden: recommendation.problem_summary,
        recommendedSolution: recommendation.recommended_solution,
        features: recommendation.recommended_features,
        estimatedMonthlyUsage: {
          videos: consultation.answers.videos_per_month ?? "",
          videoMinutes: priced.videoMinutesNeeded,
          voiceMinutes: consultation.answers.voice_minutes ?? "",
          liveVideoMinutes: consultation.answers.live_video_minutes ?? "",
        },
        proposedSubscription: recommendation.recommended_plan,
        setupRequirements: recommendation.technical_dependencies,
        unansweredQuestions: recommendation.missing_information,
        nextSteps: recommendation.follow_up_actions,
        pricing: {
          recurringCents: priced.recurringCents,
          setupCents: priced.setupCents,
          lines: priced.lines,
          unlimited: false,
        },
        guaranteedSavings: false,
      };
      store.saveProposal(session.orgId, id, proposal);
      return proposal;
    },
    exportSummary(session: Session, id: string) {
      const consultation = requireConsultation(session, id);
      const stored = store.latestRecommendation(session.orgId, id);
      const recommendation = (stored?.payload as Recommendation | undefined) ?? null;
      const priced = quote(store.listPlans(), store.listAddons(), usageFromAnswers(consultation.answers, consultation.pain));
      const brief = buildBrief({ consultation, recommendation, quote: priced, locale: consultation.language });
      return {
        brief,
        document: {
          consultation,
          recommendation,
          quote: priced,
          consents: store.listConsents(session.orgId, id).map((record) => ({ kind: record.kind, granted: record.granted, at: record.createdAt })),
          onboarding: store.getOnboarding(session.orgId, id),
          knowledgeSources: store.listKnowledgeSources(session.orgId, id),
          prototype: false,
          guaranteedSavings: false,
        },
      };
    },
    recordConsent(session: Session, id: string, records: { kind: ConsentKind; granted: boolean }[]) {
      requireConsultation(session, id);
      const consultation = requireConsultation(session, id);
      const saved = records.map((record) => {
        const row = store.recordConsent({
          orgId: session.orgId,
          consultationId: id,
          kind: record.kind,
          granted: record.granted,
          textVersion: CONSENT_VERSION,
          locale: consultation.language,
        });
        if (!row) throw new ServiceError("not_found", 404);
        return row;
      });
      return saved;
    },
    saveOnboarding(session: Session, id: string, mode: "in_person" | "remote", checklist: unknown) {
      if (!store.saveOnboarding(session.orgId, id, mode, checklist)) throw new ServiceError("not_found", 404);
      return store.getOnboarding(session.orgId, id);
    },
    addAssetMetadata(
      session: Session,
      id: string,
      asset: { kind: string; filename: string; bytes: number; width: number | null; height: number | null },
    ) {
      const granted = store
        .listConsents(session.orgId, id)
        .filter((record) => record.granted)
        .map((record) => record.kind);
      if (!identityAuthorized(granted)) throw new ServiceError("identity_consent_required", 403);
      const ok = store.addAsset({
      orgId: session.orgId,
      consultationId: id,
      kind: asset.kind,
      filename: asset.filename,
      bytes: asset.bytes,
      width: asset.width,
      height: asset.height,
    });
      if (!ok) throw new ServiceError("not_found", 404);
      return store.listAssets(session.orgId, id);
    },
    addKnowledgeSource(session: Session, id: string, source: { title: string; location: string; approved: boolean }) {
      if (!source.title.trim()) throw new ServiceError("name_required", 400);
      const ok = store.addKnowledgeSource(session.orgId, id, source.title.trim(), source.location.trim(), source.approved);
      if (!ok) throw new ServiceError("not_found", 404);
      return store.listKnowledgeSources(session.orgId, id);
    },
    listPlans() {
      return { plans: store.listPlans(), addons: store.listAddons() };
    },
    updatePlan(session: Session, code: string, patch: { monthlyCents?: number; setupCents?: number; videos?: number; videoMinutes?: number; voiceMinutes?: number; maxVideoSeconds?: number; includedAvatars?: number; active?: boolean }) {
      if (session.role !== "admin") throw new ServiceError("forbidden", 403);
      for (const value of Object.values(patch)) {
        if (typeof value === "number" && (!Number.isFinite(value) || value < 0)) throw new ServiceError("invalid_price", 400);
      }
      const updated = store.updatePlan(session.userId, code, patch);
      if (!updated) throw new ServiceError("not_found", 404);
      return updated;
    },
    updateAddon(session: Session, code: string, patch: { unitCents?: number | null; active?: boolean }) {
      if (session.role !== "admin") throw new ServiceError("forbidden", 403);
      if (typeof patch.unitCents === "number" && patch.unitCents < 0) throw new ServiceError("invalid_price", 400);
      const updated = store.updateAddon(session.userId, code, patch);
      if (!updated) throw new ServiceError("not_found", 404);
      return updated;
    },
    quoteFor(session: Session, id: string) {
      const consultation = requireConsultation(session, id);
      return quote(store.listPlans(), store.listAddons(), usageFromAnswers(consultation.answers, consultation.pain));
    },
    dashboard(session: Session): Dashboard {
      const consultations = store.listConsultations(session.orgId);
      const recommendations = new Map<string, Recommendation | null>();
      for (const consultation of consultations) {
        const stored = store.latestRecommendation(session.orgId, consultation.id);
        recommendations.set(consultation.id, (stored?.payload as Recommendation | undefined) ?? null);
      }
      return buildDashboard(consultations, recommendations);
    },
  };
}

export type Services = ReturnType<typeof createServices>;

function adminPermitted(provided: string | undefined): boolean {
  const expected = process.env.STUDIO_ADMIN_CODE;
  if (expected) return provided === expected;
  const env = process.env.APP_ENV || process.env.VERCEL_ENV || "development";
  return env === "development" || env === "test";
}
