import { CONSENT_COPY } from "@/lib/onboarding";
import { fail, json, sessionToken } from "@/lib/http";
import { getServices } from "@/lib/runtime";
import { adminAccess } from "@/lib/services";
import type { ConsentKind, Locale } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Ctx = { params: Promise<{ path: string[] }> };
const KINDS = new Set(CONSENT_COPY.map((item) => item.kind));

async function dispatch(method: string, request: Request, ctx: Ctx) {
  const { path } = await ctx.params;
  const services = getServices();
  try {
    const token = await sessionToken();
    const key = `${method} ${path.join("/")}`;
    const body = method === "GET" ? {} : await readBody(request);

    if (key === "GET health") {
      return json({ ok: true, persistence: services.persistence, llmConfigured: Boolean(process.env.OPENAI_API_KEY), admin: adminAccess() });
    }
    if (key === "POST session") {
      const opened = services.openWorkspace({
        consultantName: str(body.consultantName),
        organizationName: str(body.organizationName),
        role: body.role === "admin" ? "admin" : "consultant",
        adminCode: str(body.adminCode),
      });
      return json({ session: opened.session, organizations: services.listOrganizations(opened.session) }, 200, opened.token);
    }
    if (key === "GET session") {
      const session = services.resume(token);
      if (!session) return json({ session: null, organizations: [], persistence: services.persistence, admin: adminAccess() });
      return json({ session, organizations: services.listOrganizations(session), persistence: services.persistence, admin: adminAccess() });
    }

    const session = services.requireSession(token);
    if (key === "GET organizations") return json({ organizations: services.listOrganizations(session), session });
    if (key === "POST session/admin") {
      if (!token) throw new Error("missing token");
      const next = services.grantAdmin(session, token, str(body.adminCode));
      return json({ session: next });
    }
    if (key === "POST organizations") {
      const created = services.createOrganization(session, str(body.name));
      return json({ organization: created });
    }
    if (key === "POST organizations/switch") {
      if (!token) throw new Error("missing token");
      const next = services.switchOrganization(token, str(body.orgId));
      return json({ session: next, organizations: services.listOrganizations(next) });
    }
    if (key === "GET plans") return json(services.listPlans());
    if (method === "PUT" && path[0] === "plans" && path[1]) {
      return json({
        plan: services.updatePlan(session, path[1], {
          monthlyCents: num(body.monthlyCents),
          setupCents: num(body.setupCents),
          videos: num(body.videos),
          videoMinutes: num(body.videoMinutes),
          voiceMinutes: num(body.voiceMinutes),
          maxVideoSeconds: num(body.maxVideoSeconds),
          includedAvatars: num(body.includedAvatars),
        }),
      });
    }
    if (method === "PUT" && path[0] === "addons" && path[1]) {
      return json({
        addon: services.updateAddon(session, path[1], {
          unitCents: body.unitCents == null || body.unitCents === "" ? null : num(body.unitCents),
        }),
      });
    }
    if (key === "GET dashboard") return json(services.dashboard(session));
    if (key === "POST consultations") {
      return json({
        consultation: services.createConsultation(session, {
          language: body.language === "it" ? "it" : "en",
          category: str(body.category),
          pain: str(body.pain),
          executiveLabel: str(body.executiveLabel),
        }),
      });
    }
    if (key === "GET consultations") return json({ consultations: services.listConsultations(session) });

    if (path[0] === "consultations" && path[1]) {
      const id = path[1];
      const action = path[2] ?? "";
      if (method === "GET" && !action) {
        return json({ consultation: services.getConsultation(session, id), consents: services.consents(session, id) });
      }
      if ((method === "PUT" || method === "PATCH") && action === "answers") {
        let consultation = services.getConsultation(session, id);
        if (body.answers && typeof body.answers === "object") {
          for (const [answerKey, value] of Object.entries(body.answers as Record<string, unknown>)) {
            consultation = services.saveAnswer(session, id, answerKey, String(value ?? ""));
          }
        } else {
          consultation = services.saveAnswer(session, id, str(body.key), String(body.value ?? ""));
        }
        return json({ consultation });
      }
      if (method === "POST" && action === "recommendation") {
        const mode = body.mode === "llm" ? "llm" : "rules";
        return json(await services.generateRecommendation(session, id, mode));
      }
      if (method === "POST" && action === "proposal") return json({ proposal: services.generateProposal(session, id) });
      if (method === "GET" && action === "export") return json(services.exportSummary(session, id));
      if (method === "GET" && action === "events") return json({ events: services.timeline(session, id) });
      if (method === "POST" && action === "consents") {
        const records = Array.isArray(body.records) ? body.records : [];
        const clean = records
          .filter((record): record is { kind: ConsentKind; granted: boolean } => {
            if (!record || typeof record !== "object") return false;
            const kind = (record as { kind?: string }).kind;
            return typeof kind === "string" && KINDS.has(kind as ConsentKind);
          })
          .map((record) => ({ kind: record.kind, granted: Boolean(record.granted) }));
        return json({ consents: services.recordConsent(session, id, clean) });
      }
      if (method === "POST" && action === "onboarding") {
        const mode = body.mode === "in_person" ? "in_person" : "remote";
        return json({ onboarding: services.saveOnboarding(session, id, mode, body.checklist ?? {}) });
      }
      if (method === "POST" && action === "assets") {
        return json({
          assets: services.addAssetMetadata(session, id, {
            kind: str(body.kind),
            filename: str(body.filename),
            bytes: num(body.bytes) ?? 0,
            width: body.width == null ? null : num(body.width) ?? null,
            height: body.height == null ? null : num(body.height) ?? null,
          }),
        });
      }
      if (method === "POST" && action === "sources") {
        return json({
          sources: services.addKnowledgeSource(session, id, {
            title: str(body.title),
            location: str(body.location),
            approved: Boolean(body.approved),
          }),
        });
      }
    }
    return json({ error: "not_found" }, 404);
  } catch (error) {
    return fail(error);
  }
}

async function readBody(request: Request): Promise<Record<string, unknown>> {
  const text = await request.text();
  if (!text) return {};
  const parsed = JSON.parse(text) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
  return parsed as Record<string, unknown>;
}

function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function num(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Number(value);
  return undefined;
}

export function GET(request: Request, ctx: Ctx) {
  return dispatch("GET", request, ctx);
}
export function POST(request: Request, ctx: Ctx) {
  return dispatch("POST", request, ctx);
}
export function PUT(request: Request, ctx: Ctx) {
  return dispatch("PUT", request, ctx);
}
export function PATCH(request: Request, ctx: Ctx) {
  return dispatch("PATCH", request, ctx);
}

export type { Locale };
