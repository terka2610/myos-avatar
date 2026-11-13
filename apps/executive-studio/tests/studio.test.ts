import { createHash } from "crypto";
import fs from "fs";
import os from "os";
import path from "path";
import { describe, expect, it } from "vitest";
import { CAPABILITIES } from "../lib/capabilities";
import { buildDashboard } from "../lib/dashboard";
import { openStore } from "../lib/db/store";
import { LOCAL_DRAFT_POLICY } from "../lib/draft";
import { allQuestions } from "../lib/discovery";
import { buildBrief } from "../lib/exportBrief";
import { CONSENT_COPY, REMOTE_GUIDES } from "../lib/onboarding";
import { DEFAULT_PLANS, formatEur, quote, usageFromAnswers } from "../lib/pricing";
import { acceptModelOutput } from "../lib/recommendation/guard";
import { requestModelRecommendation } from "../lib/recommendation/llm";
import { buildRecommendation, findContradictions, hasMeasurablePain, type EngineInput } from "../lib/recommendation/rules";
import { recommendationSchema } from "../lib/recommendation/schema";
import { createServices, ServiceError } from "../lib/services";
import { renderedVideoMinutes, weeklyBurden } from "../lib/time";
import type { Addon, Plan } from "../lib/types";

const plans = DEFAULT_PLANS;
const addons: Addon[] = [
  { code: "video_overage", nameEn: "Extra generated video", nameIt: "Video generato extra", unitCents: 1500, per: "video_minute", hypothesis: true, active: true },
  { code: "voice_overage", nameEn: "Extra conversational voice", nameIt: "Voce extra", unitCents: 25, per: "voice_minute", hypothesis: true, active: true },
  { code: "italian_human", nameEn: "Italian-speaking human support", nameIt: "Supporto umano in italiano", unitCents: null, per: "month", hypothesis: true, active: true },
  { code: "extra_avatar", nameEn: "Extra avatar", nameIt: "Avatar aggiuntivo", unitCents: null, per: "month", hypothesis: true, active: true },
  { code: "live_video", nameEn: "Live video", nameIt: "Video live", unitCents: null, per: "custom", hypothesis: true, active: true },
  { code: "meeting_integration", nameEn: "Meeting integration", nameIt: "Integrazione riunioni", unitCents: null, per: "custom", hypothesis: true, active: true },
  { code: "physical_kiosk", nameEn: "Kiosk", nameIt: "Chiosco", unitCents: null, per: "custom", hypothesis: true, active: true },
];

function engine(partial: Partial<EngineInput>): EngineInput {
  return {
    locale: partial.locale ?? "en",
    category: partial.category ?? "",
    audience: partial.audience ?? "employees",
    pain: partial.pain ?? "video",
    notes: partial.notes ?? "",
    answers: partial.answers ?? {},
    plans,
    addons,
    identityAuthorized: partial.identityAuthorized ?? false,
  };
}

function base(pain: string, answers: Record<string, string>, locale: EngineInput["locale"] = "en"): EngineInput {
  return engine({
    locale,
    pain,
    answers: {
      problem_narrative: answers.problem_narrative ?? "The same explanation is given every week.",
      last_example: "Last Tuesday's review.",
      frequency_per_week: "4",
      minutes_each: "30",
      consequence: "Work waits.",
      current_handling: "The chief of staff repeats it.",
      owner: "Chief of staff",
      already_tried: "A written FAQ.",
      pay_justification: "If the weekly review got shorter.",
      purchase_approver: "The CEO",
      pilot_success: "Ten people get an answer without booking time.",
      solve_for: "Reduce repeated explanations.",
      ...answers,
    },
  });
}

describe("time burden", () => {
  it("shows the monthly figure from the customer's frequency and duration", () => {
    const burden = weeklyBurden(4, 30);
    expect(burden.weeklyMinutes).toBe(120);
    expect(burden.monthlyMinutes).toBeCloseTo(120 * (52 / 12), 5);
    expect(burden.monthlyHours).toBeCloseTo(8.666, 2);
    expect(burden.guaranteedSavings).toBe(false);
    expect(burden.formula).toContain("52 / 12");
  });

  it("derives generated video minutes from count and duration", () => {
    expect(renderedVideoMinutes(6, 60)).toBe(6);
    expect(renderedVideoMinutes(10, 90)).toBe(15);
  });
});

describe("pricing hypotheses", () => {
  it("keeps the prototype voice allowances and rejects the reconstructed 60 and 200", () => {
    expect(plans.map((plan) => plan.voiceMinutes)).toEqual([0, 0, 250, 750]);
    expect(plans.map((plan) => [plan.videos, plan.videoMinutes])).toEqual([
      [6, 6],
      [20, 20],
      [20, 25],
      [40, 50],
    ]);
  });

  it("moves the package when quantities change and never marks video as unlimited", () => {
    const small = quote(plans, addons, usageFromAnswers({ videos_per_month: "4", average_video_seconds: "45", max_video_seconds: "45" }, "video"));
    expect(small.plan?.code).toBe("presence");
    expect(small.fit).toBe("included");
    expect(small.unlimited).toBe(false);
    const larger = quote(plans, addons, usageFromAnswers({ videos_per_month: "30", average_video_seconds: "60", max_video_seconds: "60" }, "video"));
    expect(larger.plan?.code).toBe("leadership");
    const beyond = quote(plans, addons, usageFromAnswers({ videos_per_month: "80", average_video_seconds: "60", max_video_seconds: "60" }, "video"));
    expect(beyond.fit).toBe("overage");
    expect(beyond.countExceeded).toBe(true);
    expect(beyond.overageVideoMinutes).toBeGreaterThan(0);
    expect(JSON.stringify(beyond)).not.toMatch(/unlimited video is included/i);
  });

  it("prices Italian support, live video and meetings as separate lines", () => {
    const priced = quote(
      plans,
      addons,
      usageFromAnswers(
        {
          videos_per_month: "4",
          average_video_seconds: "30",
          max_video_seconds: "30",
          voice_minutes: "100",
          italian_human: "true",
          live_video_minutes: "40",
          meeting_integration: "true",
        },
        "knowledge",
      ),
    );
    expect(priced.plan?.code).toBe("knowledge");
    const codes = priced.lines.map((line) => line.code);
    expect(codes).toContain("italian_human");
    expect(codes).toContain("live_video");
    expect(codes).toContain("meeting_integration");
    expect(priced.lines.find((line) => line.code === "plan_setup")?.kind).toBe("setup");
    expect(priced.lines.find((line) => line.code === "plan_monthly")?.kind).toBe("recurring");
    expect(priced.lines.find((line) => line.code === "meeting_integration")?.kind).toBe("excluded");
  });

  it("does not fold a meeting or a kiosk into a ready subscription", () => {
    const meetings = quote(plans, addons, usageFromAnswers({ voice_minutes: "100" }, "meetings"));
    expect(meetings.fit).toBe("gated");
    const kiosk = quote(plans, addons, usageFromAnswers({ videos_per_month: "2", average_video_seconds: "30" }, "kiosk"));
    expect(kiosk.fit).toBe("gated");
    expect(kiosk.lines.some((line) => line.code === "physical_kiosk")).toBe(true);
  });
});

describe("recommendation scenarios", () => {
  it("validates the schema for a social-video consultation", () => {
    const result = buildRecommendation(
      base("video", {
        problem_narrative: "Social clips take a week.",
        video_volume: "8",
        video_length: "45 seconds",
        video_script_owner: "Marketing",
        video_approver: "The CEO",
        video_languages: "Italian and English",
        video_cost: "400 euro",
        video_production_time: "5 days",
        video_channels: "LinkedIn",
        videos_per_month: "8",
        average_video_seconds: "45",
        max_video_seconds: "45",
      }),
    );
    expect(recommendationSchema.safeParse(result).success).toBe(true);
    expect(result.recommended_solution.name).toBe("AI Video Studio");
    expect(result.recommended_plan?.code).toBe("content");
    expect(result.evidence_from_customer.join(" ")).toContain("Social clips take a week.");
    expect(result.evidence_from_customer.join(" ")).not.toContain("Reduce repeated explanations.");
  });

  it("treats repetitive meetings and Zoom as not operational", () => {
    const result = buildRecommendation(
      base("meetings", {
        meeting_which: "The Monday pipeline review",
        meeting_attendees: "12 managers",
        meeting_weekly_count: "1",
        meeting_predictable_questions: "What changed in the pipeline?",
        meeting_avatar_needs: "The approved pipeline note",
        meeting_platform: "zoom",
        meeting_goal: "participate",
        meeting_stay_human: "Any decision about a customer",
      }),
    );
    expect(result.recommended_solution.availability).toBe("not_operational");
    expect(result.recommended_plan).toBeNull();
    expect(result.recommended_features.some((feature) => /zoom/i.test(feature.name) && feature.availability === "not_operational")).toBe(true);
    expect(result.risks.join(" ")).toMatch(/not an available product|non è un prodotto disponibile/i);
  });

  it("scopes employee onboarding to a knowledge twin and keeps access as a dependency", () => {
    const result = buildRecommendation(
      base("employee_onboarding", {
        audience: "new_hires",
        employee_joiners: "6",
        employee_repeated: "Why the strategy changed",
        employee_knowledge_location: "The intranet and one slide deck",
        employee_escalation: "Compensation and personal cases",
        employee_access: "New hires only, not contractors",
      }),
    );
    expect(result.recommended_solution.name).toMatch(/Knowledge-based digital twin/);
    expect(result.recommended_plan?.code).toBe("knowledge");
    expect(result.technical_dependencies.join(" ")).toMatch(/sources|approver/i);
  });

  it("does not claim a live CRM for client onboarding", () => {
    const result = buildRecommendation(
      base("client_onboarding", {
        audience: "clients",
        client_per_month: "15",
        client_repeated_requests: "How do we start, and who is our contact?",
        client_duration: "40",
        client_senior_steps: "The commercial terms",
        client_auto_collect: "Company profile and goals",
        client_crm: "HubSpot",
        client_human_share: "About a third",
      }),
    );
    expect(result.recommended_solution.name).toMatch(/Client onboarding/);
    expect(result.recommended_features.some((feature) => /CRM/i.test(feature.name) && feature.availability === "not_operational")).toBe(true);
    expect(result.technical_dependencies.join(" ")).toContain("HubSpot");
    expect(result.technical_dependencies.join(" ")).toMatch(/No connector/);
  });

  it("keeps reception and holograms out of the subscription", () => {
    const result = buildRecommendation(
      base("kiosk", {
        audience: "visitors",
        reception_location: "Milan lobby",
        reception_visitor_needs: "A welcome and a badge",
        reception_hardware: "One portrait screen",
        reception_handoff: "Any complaint",
      }),
    );
    expect(result.recommended_solution.availability).toBe("demo_only");
    expect(result.recommended_plan).toBeNull();
    expect(result.recommended_features.some((feature) => feature.availability === "not_operational" && /holograph/i.test(feature.name))).toBe(true);
  });

  it("flags contradictory information and does not price through it", () => {
    const input = base("video", {
      frequency_per_week: "0",
      minutes_each: "0",
      problem_narrative: "This happens every day and we need no video.",
      videos_per_month: "12",
      average_video_seconds: "30",
    });
    expect(findContradictions(input).length).toBeGreaterThan(0);
    const result = buildRecommendation(input);
    expect(result.recommended_plan).toBeNull();
    expect(result.missing_information.join(" ")).toMatch(/contradiction/i);
    expect(result.risks.join(" ")).toMatch(/Frequency is 0/);
  });

  it("does not recommend a package when there is no measurable pain", () => {
    const result = buildRecommendation(
      engine({
        pain: "knowledge",
        answers: { problem_narrative: "People sometimes ask questions." },
      }),
    );
    expect(hasMeasurablePain(engine({ pain: "knowledge", answers: {} }))).toBe(false);
    expect(result.recommended_plan).toBeNull();
    expect(result.pilot_proposal.summary).toMatch(/Do not scope a pilot/);
    expect(result.next_best_question.length).toBeGreaterThan(10);
  });

  it("does not treat the consultant note as something the customer said", () => {
    const result = buildRecommendation(
      engine({
        pain: "video",
        notes: "Secret working theory about the budget.",
        answers: {},
      }),
    );
    expect(result.evidence_from_customer.join("\n")).not.toContain("Secret working theory");
    expect(result.problem_summary).toContain("Working note, not yet confirmed");
  });

  it("writes the next question and the summary in Italian", () => {
    const result = buildRecommendation(engine({ locale: "it", pain: "video", audience: "employees", answers: {} }));
    expect(result.problem_summary).toContain("Il problema non è ancora definito.");
    expect(result.next_best_question).toBe("Qual è il problema, con le parole del cliente?");
    expect(result.problem_summary).not.toContain("The problem is not established");
    expect(result.pricing_assumptions.join(" ")).not.toContain("Prices are hypotheses");
  });

  it("rejects a model that invents evidence or claims Zoom is ready", () => {
    const input = base("meetings", { meeting_platform: "zoom", meeting_goal: "answer" });
    const invented = acceptModelOutput(
      {
        ...buildRecommendation(input),
        evidence_from_customer: ["They already signed a Zoom contract for 40 seats."],
      },
      input,
    );
    expect(invented?.evidence_from_customer.join(" ")).not.toContain("40 seats");
    expect(invented?.risks.join(" ")).toMatch(/removed/);
    const claimed = acceptModelOutput(
      {
        ...buildRecommendation(input),
        recommended_features: [{ name: "Zoom bot in production", availability: "configurable" }],
      },
      input,
    );
    expect(claimed).toBeNull();
  });
});

describe("language and onboarding copy", () => {
  it("has Italian and English for every question", () => {
    for (const question of allQuestions()) {
      expect(question.label.en.trim().length).toBeGreaterThan(3);
      expect(question.label.it.trim().length).toBeGreaterThan(3);
      expect(question.label.en).not.toBe(question.label.it);
    }
  });

  it("states the remote capture requirements and separate podcast consents", () => {
    const remote = REMOTE_GUIDES.map((guide) => `${guide.body.en}\n${guide.body.it}`).join("\n");
    for (const phrase of ["2048", "1080p", "16:9", "20"]) expect(remote).toContain(phrase);
    expect(remote).toMatch(/neutral background/);
    expect(remote).toMatch(/sfondo neutro/i);
    expect(remote).toMatch(/Provider-specific requirements must be verified/);
    expect(remote).toMatch(/prima della registrazione/);
    const podcast = CONSENT_COPY.filter((item) => item.group === "podcast").map((item) => item.kind);
    expect(podcast).toEqual(["podcast_recording", "podcast_editing", "podcast_publication", "podcast_distribution"]);
  });
});

describe("persistence, tenancy and consent", () => {
  function workspace() {
    const store = openStore(":memory:");
    const services = createServices(store);
    return { store, services };
  }

  it("saves, updates and reopens a consultation inside one organization", () => {
    const { store, services } = workspace();
    const opened = services.openWorkspace({ consultantName: "Terezia", organizationName: "Northwind" });
    const consultation = services.createConsultation(opened.session, { language: "en", category: "video_studio", pain: "video", executiveLabel: "the CEO" });
    services.saveAnswer(opened.session, consultation.id, "videos_per_month", "4");
    services.saveAnswer(opened.session, consultation.id, "videos_per_month", "8");
    const again = services.getConsultation(opened.session, consultation.id);
    expect(again.answers.videos_per_month).toBe("8");
    const changes = services.timeline(opened.session, consultation.id).filter((event) => event.type === "answer_updated");
    expect(changes[1]?.payload).toMatchObject({ key: "videos_per_month", from: "4", to: "8" });
    store.close();
  });

  it("keeps two organizations apart and blocks a cross-organization read", () => {
    const { store, services } = workspace();
    const first = services.openWorkspace({ consultantName: "Ada", organizationName: "Alpha" });
    const second = services.openWorkspace({ consultantName: "Bea", organizationName: "Beta" });
    const other = services.createOrganization(first.session, "Alpha Labs");
    const consultation = services.createConsultation(first.session, { language: "it", category: "knowledge_twin", pain: "knowledge" });
    services.saveAnswer(first.session, consultation.id, "problem_narrative", "Le persone chiedono la stessa cosa.");
    expect(() => services.getConsultation(second.session, consultation.id)).toThrow(ServiceError);
    const switched = services.switchOrganization(first.token, other.id);
    expect(() => services.getConsultation(switched, consultation.id)).toThrow(ServiceError);
    const back = services.switchOrganization(first.token, first.session.orgId);
    expect(services.getConsultation(back, consultation.id).answers.problem_narrative).toContain("stessa cosa");
    expect(services.listConsultations(back)).toHaveLength(1);
    expect(services.listConsultations(switched)).toHaveLength(0);
    store.close();
  });

  it("refuses an external model without consent, without a key, and on timeout", async () => {
    const store = openStore(":memory:");
    let calls = 0;
    const services = createServices(store, {
      llm: async () => {
        calls += 1;
        return { ok: false, reason: "timeout" };
      },
    });
    const opened = services.openWorkspace({ consultantName: "Ada", organizationName: "Alpha" });
    const consultation = services.createConsultation(opened.session, { language: "en", category: "video_studio", pain: "video" });
    await expect(services.generateRecommendation(opened.session, consultation.id, "llm")).rejects.toMatchObject({ code: "consent_required" });
    expect(calls).toBe(0);
    services.recordConsent(opened.session, consultation.id, [{ kind: "ai_provider", granted: false }]);
    await expect(services.generateRecommendation(opened.session, consultation.id, "llm")).rejects.toMatchObject({ code: "consent_required" });
    services.recordConsent(opened.session, consultation.id, [{ kind: "ai_provider", granted: true }]);
    const fallback = await services.generateRecommendation(opened.session, consultation.id, "llm");
    expect(fallback.source).toBe("rules");
    expect(fallback.fallbackReason).toBe("timeout");
    expect(calls).toBe(1);
    const missing = await requestModelRecommendation({ apiKey: undefined, timeoutMs: 50, input: base("video", {}), fetchImpl: fetch });
    expect(missing).toEqual({ ok: false, reason: "no_key" });
    const timed = await requestModelRecommendation({
      apiKey: "test-key",
      timeoutMs: 20,
      input: base("video", {}),
      fetchImpl: (_input, init) =>
        new Promise((_resolve, reject) => {
          const abort = () => {
            const error = new Error("The operation was aborted");
            error.name = "AbortError";
            reject(error);
          };
          if (init?.signal?.aborted) abort();
          init?.signal?.addEventListener("abort", abort);
        }),
    });
    expect(timed.reason).toBe("timeout");
    store.close();
  });

  it("blocks likeness metadata until identity consent is recorded", () => {
    const { store, services } = workspace();
    const opened = services.openWorkspace({ consultantName: "Ada", organizationName: "Alpha" });
    const consultation = services.createConsultation(opened.session, { language: "en", category: "video_studio", pain: "video" });
    expect(() =>
      services.addAssetMetadata(opened.session, consultation.id, { kind: "headshot", filename: "portrait.png", bytes: 10, width: 2048, height: 2048 }),
    ).toThrow(ServiceError);
    services.recordConsent(opened.session, consultation.id, [
      { kind: "likeness", granted: true },
      { kind: "voice_cloning", granted: true },
      { kind: "audience_scope", granted: true },
      { kind: "use_cases", granted: true },
      { kind: "content_generation", granted: true },
      { kind: "revocation_acknowledged", granted: true },
    ]);
    const assets = services.addAssetMetadata(opened.session, consultation.id, {
      kind: "headshot",
      filename: "portrait.png",
      bytes: 10,
      width: 2048,
      height: 2048,
    });
    expect(assets[0]?.status).toBe("metadata_only");
    expect(assets[0]?.note).toMatch(/not stored/i);
    store.close();
  });

  it("lets an admin change a price and keeps a consultant from doing so", () => {
    const { store, services } = workspace();
    const consultant = services.openWorkspace({ consultantName: "Ada", organizationName: "Alpha" });
    expect(() => services.updatePlan(consultant.session, "presence", { monthlyCents: 12300 })).toThrow(ServiceError);
    const admin = services.openWorkspace({ consultantName: "Owner", organizationName: "MyOS", role: "admin" });
    const updated = services.updatePlan(admin.session, "presence", { monthlyCents: 12300 });
    expect(updated.monthlyCents).toBe(12300);
    const priced = quote(services.listPlans().plans, services.listPlans().addons, usageFromAnswers({ videos_per_month: "2", average_video_seconds: "30", max_video_seconds: "30" }, "video"));
    expect(priced.plan?.code).toBe("presence");
    expect(priced.recurringCents).toBe(12300);
    store.close();
  });

  it("exports a brief and aggregates the dashboard without inventing usage metrics", () => {
    const { store, services } = workspace();
    const opened = services.openWorkspace({ consultantName: "Ada", organizationName: "Alpha" });
    const consultation = services.createConsultation(opened.session, { language: "it", category: "video_studio", pain: "video" });
    services.saveAnswer(opened.session, consultation.id, "problem_narrative", "I video social richiedono una settimana.");
    services.saveAnswer(opened.session, consultation.id, "frequency_per_week", "2");
    services.saveAnswer(opened.session, consultation.id, "minutes_each", "45");
    services.saveAnswer(opened.session, consultation.id, "language", "it");
    const generated = services.generateRecommendation(opened.session, consultation.id, "rules");
    return Promise.resolve(generated).then(async () => {
      const exported = services.exportSummary(opened.session, consultation.id);
      expect(exported.brief).toContain("sintesi della consulenza");
      expect(exported.brief).not.toContain("MYOS — consultation summary");
      expect(exported.brief).toContain("Non è un risparmio misurato.");
      const dashboard = services.dashboard(opened.session);
      expect(dashboard.consultationCount).toBe(1);
      expect(dashboard.instrumentation).toBe("not_connected");
      expect(dashboard.usageMetrics).toBeNull();
      expect(dashboard.painPoints[0]?.id).toBe("video");
      const empty = buildDashboard([], new Map());
      expect(empty.consultationCount).toBe(0);
      store.close();
    });
  });

  it("refuses to open a production database", () => {
    const previous = process.env.APP_ENV;
    process.env.APP_ENV = "production";
    expect(() => openStore(path.join(os.tmpdir(), "studio-test.db"))).toThrow(/production/);
    if (previous === undefined) delete process.env.APP_ENV;
    else process.env.APP_ENV = previous;
  });
});

describe("protected applications", () => {
  it("does not modify the original consultation demo or the existing app", () => {
    const root = path.resolve(__dirname, "../../..");
    const files = {
      "ceo-consultation/index.html": "7861532be4b1fbd320d3e890b0ba4a613534cd045dc9392e3baf19ff4847eeee",
      "src/app/page.tsx": "caf936d71790b2f099250cec58e548d7b09ea8946c9530397728c55a2a6b716e",
      "src/app/layout.tsx": "174e7faba945d2ec31fcef75610d1002025c4863a2694e7cc12c67dfecc6fdae",
      "src/app/globals.css": "4a1b4beae6821dbc09521a4c5e6a5745eb495231e5212a6029bb7aff988c48f2",
    };
    for (const [file, hash] of Object.entries(files)) {
      const body = fs.readFileSync(path.join(root, file));
      expect(createHash("sha256").update(body).digest("hex")).toBe(hash);
    }
  });

  it("does not auto-save confidential answers into browser storage", () => {
    expect(LOCAL_DRAFT_POLICY.autoSave).toBe(false);
    expect(LOCAL_DRAFT_POLICY.requiresExplicitAction).toBe(true);
  });
});

describe("money format", () => {
  it("formats euro amounts for both languages", () => {
    expect(formatEur(9900, "en")).toContain("99");
    expect(formatEur(150000, "it")).toContain("1.500");
  });
});

describe("capability catalog", () => {
  it("marks meeting, CRM, hologram and usage metrics as not operational", () => {
    const unavailable = CAPABILITIES.filter((item) => item.availability === "not_operational").map((item) => item.id);
    expect(unavailable).toEqual(expect.arrayContaining(["zoom_bot", "teams_bot", "crm_write", "holographic", "usage_metrics", "meeting_participation"]));
  });
});
