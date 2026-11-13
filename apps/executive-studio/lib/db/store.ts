import { createHash, randomBytes, randomUUID } from "crypto";
import fs from "fs";
import path from "path";
import { DatabaseSync } from "node:sqlite";
import { DEFAULT_ADDONS, DEFAULT_PLANS } from "../pricing";
import type { Addon, ConsentKind, ConsentRecord, Consultation, ConsultationStatus, Locale, Plan, Role, Session, StoredEvent } from "../types";

export type Persistence = "memory" | "ephemeral" | "file";

export type Workspace = { token: string; session: Session };

export type Store = {
  persistence: Persistence;
  path: string;
  createWorkspace(input: { consultantName: string; organizationName: string; role: Role }): Workspace;
  sessionFromToken(token: string): Session | null;
  createOrganization(userId: string, name: string): { id: string; name: string; role: Role };
  switchOrganization(token: string, orgId: string): Session | null;
  listOrganizations(userId: string): { id: string; name: string; role: Role }[];
  setRole(userId: string, orgId: string, role: Role): void;
  createConsultation(input: {
    orgId: string;
    userId: string;
    language: Locale;
    category: string;
    pain: string;
    executiveLabel: string;
  }): Consultation;
  saveAnswer(orgId: string, consultationId: string, key: string, value: string): Consultation | null;
  getConsultation(orgId: string, id: string): Consultation | null;
  listConsultations(orgId: string): Consultation[];
  events(orgId: string, consultationId: string): StoredEvent[];
  recordConsent(input: {
    orgId: string;
    consultationId: string;
    kind: ConsentKind;
    granted: boolean;
    textVersion: string;
    locale: Locale;
  }): ConsentRecord | null;
  latestConsent(orgId: string, consultationId: string, kind: ConsentKind): ConsentRecord | null;
  listConsents(orgId: string, consultationId: string): ConsentRecord[];
  saveRecommendation(orgId: string, consultationId: string, source: string, payload: unknown): boolean;
  latestRecommendation(orgId: string, consultationId: string): { source: string; payload: unknown; createdAt: string } | null;
  saveProposal(orgId: string, consultationId: string, payload: unknown): boolean;
  latestProposal(orgId: string, consultationId: string): unknown | null;
  saveOnboarding(orgId: string, consultationId: string, mode: string, checklist: unknown): boolean;
  getOnboarding(orgId: string, consultationId: string): { mode: string; checklist: unknown } | null;
  addAsset(input: {
    orgId: string;
    consultationId: string;
    kind: string;
    filename: string;
    bytes: number;
    width: number | null;
    height: number | null;
  }): boolean;
  listAssets(orgId: string, consultationId: string): { kind: string; filename: string; status: string; note: string }[];
  addKnowledgeSource(orgId: string, consultationId: string, title: string, location: string, approved: boolean): boolean;
  listKnowledgeSources(orgId: string, consultationId: string): { title: string; location: string; approved: boolean }[];
  listPlans(): Plan[];
  listAddons(): Addon[];
  updatePlan(actorUserId: string, code: string, patch: Partial<Plan>): Plan | null;
  updateAddon(actorUserId: string, code: string, patch: Partial<Addon>): Addon | null;
  close(): void;
};

const SCHEMA = `
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS organizations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS memberships (
  user_id TEXT NOT NULL,
  org_id TEXT NOT NULL,
  role TEXT NOT NULL,
  PRIMARY KEY (user_id, org_id)
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  org_id TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS consultations (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  created_by TEXT NOT NULL,
  language TEXT NOT NULL,
  status TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT '',
  audience TEXT NOT NULL DEFAULT '',
  pain TEXT NOT NULL DEFAULT '',
  executive_label TEXT NOT NULL DEFAULT '',
  current_step INTEGER NOT NULL DEFAULT 0,
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS consultation_answers (
  id TEXT PRIMARY KEY,
  consultation_id TEXT NOT NULL,
  org_id TEXT NOT NULL,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (consultation_id, key)
);

CREATE TABLE IF NOT EXISTS consultation_events (
  id TEXT PRIMARY KEY,
  consultation_id TEXT NOT NULL,
  org_id TEXT NOT NULL,
  type TEXT NOT NULL,
  payload TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS solution_recommendations (
  id TEXT PRIMARY KEY,
  consultation_id TEXT NOT NULL,
  org_id TEXT NOT NULL,
  source TEXT NOT NULL,
  payload TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS subscription_plans (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  monthly_cents INTEGER NOT NULL,
  setup_cents INTEGER NOT NULL,
  videos INTEGER NOT NULL,
  video_minutes INTEGER NOT NULL,
  voice_minutes INTEGER NOT NULL,
  max_video_seconds INTEGER NOT NULL,
  included_avatars INTEGER NOT NULL,
  sort_order INTEGER NOT NULL,
  active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS pricing_addons (
  code TEXT PRIMARY KEY,
  name_en TEXT NOT NULL,
  name_it TEXT NOT NULL,
  unit_cents INTEGER,
  per TEXT NOT NULL,
  hypothesis INTEGER NOT NULL,
  active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS pricing_revisions (
  id TEXT PRIMARY KEY,
  actor_user_id TEXT NOT NULL,
  code TEXT NOT NULL,
  before_json TEXT NOT NULL,
  after_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS customer_proposals (
  id TEXT PRIMARY KEY,
  consultation_id TEXT NOT NULL,
  org_id TEXT NOT NULL,
  payload TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS executive_onboarding (
  id TEXT PRIMARY KEY,
  consultation_id TEXT NOT NULL,
  org_id TEXT NOT NULL,
  mode TEXT NOT NULL,
  checklist TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (consultation_id)
);

CREATE TABLE IF NOT EXISTS avatar_assets (
  id TEXT PRIMARY KEY,
  consultation_id TEXT NOT NULL,
  org_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  filename TEXT,
  bytes INTEGER,
  width INTEGER,
  height INTEGER,
  status TEXT NOT NULL,
  note TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS consent_records (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  consultation_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  granted INTEGER NOT NULL,
  text_version TEXT NOT NULL,
  locale TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS knowledge_sources (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  consultation_id TEXT NOT NULL,
  title TEXT NOT NULL,
  location TEXT NOT NULL,
  approved INTEGER NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS usage_events (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  consultation_id TEXT,
  kind TEXT NOT NULL,
  quantity REAL NOT NULL,
  unit TEXT NOT NULL,
  cost_cents INTEGER,
  instrumentation TEXT NOT NULL,
  recorded_at TEXT NOT NULL
);
`;

export function assertSafeEnvironment(filename: string): void {
  const lower = filename.toLowerCase();
  if (lower.includes("production.db") || /\/prod(\/|$)/.test(lower)) {
    throw new Error("Refusing a database path that looks like production.");
  }
  const production = process.env.VERCEL_ENV === "production" || process.env.APP_ENV === "production";
  const ephemeral = filename === ":memory:" || filename.startsWith("/tmp/");
  if (production && !ephemeral) {
    throw new Error("Refusing to open a durable studio database while the environment is production.");
  }
}

export function resolveDatabasePath(): { path: string; persistence: Persistence } {
  const configured = process.env.STUDIO_DB_PATH;
  if (configured) {
    return {
      path: configured,
      persistence: configured === ":memory:" ? "memory" : configured.startsWith("/tmp/") ? "ephemeral" : "file",
    };
  }
  if (process.env.VERCEL) {
    return { path: "/tmp/myos-executive-studio.db", persistence: "ephemeral" };
  }
  return { path: path.join(process.cwd(), "data", "studio.db"), persistence: "file" };
}

export function openStore(filename = resolveDatabasePath().path, persistence?: Persistence): Store {
  assertSafeEnvironment(filename);
  if (filename !== ":memory:") fs.mkdirSync(path.dirname(filename), { recursive: true });
  const db = new DatabaseSync(filename);
  db.exec(SCHEMA);
  seed(db);
  const resolvedPersistence = persistence ?? (filename === ":memory:" ? "memory" : filename.startsWith("/tmp/") ? "ephemeral" : "file");
  return bind(db, filename, resolvedPersistence);
}

function seed(db: DatabaseSync): void {
  const plans = db.prepare("SELECT COUNT(*) AS count FROM subscription_plans").get();
  if (Number(plans?.count ?? 0) === 0) {
    const insert = db.prepare(
      `INSERT INTO subscription_plans (code, name, monthly_cents, setup_cents, videos, video_minutes, voice_minutes, max_video_seconds, included_avatars, sort_order, active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
    );
    for (const plan of DEFAULT_PLANS) {
      insert.run(plan.code, plan.name, plan.monthlyCents, plan.setupCents, plan.videos, plan.videoMinutes, plan.voiceMinutes, plan.maxVideoSeconds, plan.includedAvatars, plan.sortOrder);
    }
  }
  const addons = db.prepare("SELECT COUNT(*) AS count FROM pricing_addons").get();
  if (Number(addons?.count ?? 0) === 0) {
    const insert = db.prepare(
      `INSERT INTO pricing_addons (code, name_en, name_it, unit_cents, per, hypothesis, active) VALUES (?, ?, ?, ?, ?, 1, 1)`,
    );
    for (const addon of DEFAULT_ADDONS) insert.run(addon.code, addon.nameEn, addon.nameIt, addon.unitCents, addon.per);
  }
}

function bind(db: DatabaseSync, filename: string, persistence: Persistence): Store {
  const api: Store = {
    persistence,
    path: filename,
    createWorkspace(input) {
      const orgId = randomUUID();
      const userId = randomUUID();
      const token = randomBytes(32).toString("base64url");
      const stamp = now();
      transaction(db, () => {
        db.prepare("INSERT INTO organizations (id, name, created_at) VALUES (?, ?, ?)").run(orgId, input.organizationName.trim(), stamp);
        db.prepare("INSERT INTO users (id, name, created_at) VALUES (?, ?, ?)").run(userId, input.consultantName.trim(), stamp);
        db.prepare("INSERT INTO memberships (user_id, org_id, role) VALUES (?, ?, ?)").run(userId, orgId, input.role);
        db.prepare("INSERT INTO sessions (token_hash, user_id, org_id, created_at) VALUES (?, ?, ?, ?)").run(hashToken(token), userId, orgId, stamp);
      });
      return { token, session: must(api.sessionFromToken(token)) };
    },
    sessionFromToken(token) {
      const row = db
        .prepare(
          `SELECT s.user_id, s.org_id, u.name AS user_name, o.name AS org_name, m.role
           FROM sessions s
           JOIN users u ON u.id = s.user_id
           JOIN organizations o ON o.id = s.org_id
           JOIN memberships m ON m.user_id = s.user_id AND m.org_id = s.org_id
           WHERE s.token_hash = ?`,
        )
        .get(hashToken(token));
      if (!row) return null;
      return {
        userId: text(row.user_id),
        name: text(row.user_name),
        orgId: text(row.org_id),
        orgName: text(row.org_name),
        role: text(row.role) === "admin" ? "admin" : "consultant",
      };
    },
    createOrganization(userId, name) {
      const orgId = randomUUID();
      const stamp = now();
      transaction(db, () => {
        db.prepare("INSERT INTO organizations (id, name, created_at) VALUES (?, ?, ?)").run(orgId, name.trim(), stamp);
        db.prepare("INSERT INTO memberships (user_id, org_id, role) VALUES (?, ?, 'consultant')").run(userId, orgId);
      });
      return { id: orgId, name: name.trim(), role: "consultant" };
    },
    switchOrganization(token, orgId) {
      const current = api.sessionFromToken(token);
      if (!current) return null;
      const member = db.prepare("SELECT role FROM memberships WHERE user_id = ? AND org_id = ?").get(current.userId, orgId);
      if (!member) return null;
      db.prepare("UPDATE sessions SET org_id = ? WHERE token_hash = ?").run(orgId, hashToken(token));
      return api.sessionFromToken(token);
    },
    setRole(userId, orgId, role) {
      db.prepare("UPDATE memberships SET role = ? WHERE user_id = ? AND org_id = ?").run(role, userId, orgId);
    },
    listOrganizations(userId) {
      return db
        .prepare(
          `SELECT o.id, o.name, m.role FROM memberships m JOIN organizations o ON o.id = m.org_id WHERE m.user_id = ? ORDER BY o.created_at`,
        )
        .all(userId)
        .map((row) => ({ id: text(row.id), name: text(row.name), role: text(row.role) === "admin" ? "admin" as const : "consultant" as const }));
    },
    createConsultation(input) {
      const id = randomUUID();
      const stamp = now();
      transaction(db, () => {
        db.prepare(
          `INSERT INTO consultations (id, org_id, created_by, language, status, category, audience, pain, executive_label, current_step, notes, created_at, updated_at)
           VALUES (?, ?, ?, ?, 'discovery', ?, '', ?, ?, 0, '', ?, ?)`,
        ).run(id, input.orgId, input.userId, input.language, input.category, input.pain, input.executiveLabel, stamp, stamp);
        event(db, input.orgId, id, "consultation_created", { category: input.category, pain: input.pain });
      });
      return must(api.getConsultation(input.orgId, id));
    },
    saveAnswer(orgId, consultationId, key, value) {
      const existing = api.getConsultation(orgId, consultationId);
      if (!existing) return null;
      const previous = existing.answers[key] ?? "";
      const stamp = now();
      transaction(db, () => {
        db.prepare(
          `INSERT INTO consultation_answers (id, consultation_id, org_id, key, value, updated_at)
           VALUES (?, ?, ?, ?, ?, ?)
           ON CONFLICT(consultation_id, key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
        ).run(randomUUID(), consultationId, orgId, key, value, stamp);
        applyColumn(db, orgId, consultationId, key, value, stamp);
        event(db, orgId, consultationId, "answer_updated", { key, from: previous, to: value });
      });
      return api.getConsultation(orgId, consultationId);
    },
    getConsultation(orgId, id) {
      const row = db.prepare("SELECT * FROM consultations WHERE id = ? AND org_id = ?").get(id, orgId);
      if (!row) return null;
      const answers = db.prepare("SELECT key, value FROM consultation_answers WHERE consultation_id = ? AND org_id = ?").all(id, orgId);
      const map: Record<string, string> = {};
      for (const answer of answers) map[text(answer.key)] = text(answer.value);
      return {
        id: text(row.id),
        orgId: text(row.org_id),
        createdBy: text(row.created_by),
        language: text(row.language) === "it" ? "it" : "en",
        status: text(row.status) as ConsultationStatus,
        category: text(row.category),
        audience: text(row.audience),
        pain: text(row.pain),
        executiveLabel: text(row.executive_label),
        currentStep: Number(row.current_step),
        notes: text(row.notes),
        createdAt: text(row.created_at),
        updatedAt: text(row.updated_at),
        answers: map,
      };
    },
    listConsultations(orgId) {
      const rows = db.prepare("SELECT id FROM consultations WHERE org_id = ? ORDER BY updated_at DESC").all(orgId);
      return rows.map((row) => must(api.getConsultation(orgId, text(row.id))));
    },
    events(orgId, consultationId) {
      if (!api.getConsultation(orgId, consultationId)) return [];
      return db
        .prepare("SELECT * FROM consultation_events WHERE consultation_id = ? AND org_id = ? ORDER BY created_at ASC, rowid ASC")
        .all(consultationId, orgId)
        .map((row) => ({
          id: text(row.id),
          consultationId: text(row.consultation_id),
          orgId: text(row.org_id),
          type: text(row.type),
          payload: JSON.parse(text(row.payload)) as Record<string, unknown>,
          createdAt: text(row.created_at),
        }));
    },
    recordConsent(input) {
      if (!api.getConsultation(input.orgId, input.consultationId)) return null;
      const id = randomUUID();
      const stamp = now();
      db.prepare(
        `INSERT INTO consent_records (id, org_id, consultation_id, kind, granted, text_version, locale, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(id, input.orgId, input.consultationId, input.kind, input.granted ? 1 : 0, input.textVersion, input.locale, stamp);
      event(db, input.orgId, input.consultationId, "consent_recorded", { kind: input.kind, granted: input.granted });
      return must(api.latestConsent(input.orgId, input.consultationId, input.kind));
    },
    latestConsent(orgId, consultationId, kind) {
      const row = db
        .prepare(
          `SELECT * FROM consent_records WHERE org_id = ? AND consultation_id = ? AND kind = ? ORDER BY created_at DESC, rowid DESC LIMIT 1`,
        )
        .get(orgId, consultationId, kind);
      return row ? mapConsent(row) : null;
    },
    listConsents(orgId, consultationId) {
      if (!api.getConsultation(orgId, consultationId)) return [];
      return db
        .prepare("SELECT * FROM consent_records WHERE org_id = ? AND consultation_id = ? ORDER BY created_at ASC")
        .all(orgId, consultationId)
        .map(mapConsent);
    },
    saveRecommendation(orgId, consultationId, source, payload) {
      if (!api.getConsultation(orgId, consultationId)) return false;
      const stamp = now();
      db.prepare(
        `INSERT INTO solution_recommendations (id, consultation_id, org_id, source, payload, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
      ).run(randomUUID(), consultationId, orgId, source, JSON.stringify(payload), stamp);
      event(db, orgId, consultationId, "recommendation_saved", { source });
      return true;
    },
    latestRecommendation(orgId, consultationId) {
      const row = db
        .prepare(
          `SELECT source, payload, created_at FROM solution_recommendations WHERE org_id = ? AND consultation_id = ? ORDER BY created_at DESC, rowid DESC LIMIT 1`,
        )
        .get(orgId, consultationId);
      if (!row) return null;
      return { source: text(row.source), payload: JSON.parse(text(row.payload)), createdAt: text(row.created_at) };
    },
    saveProposal(orgId, consultationId, payload) {
      if (!api.getConsultation(orgId, consultationId)) return false;
      const stamp = now();
      db.prepare(`INSERT INTO customer_proposals (id, consultation_id, org_id, payload, created_at) VALUES (?, ?, ?, ?, ?)`).run(
        randomUUID(),
        consultationId,
        orgId,
        JSON.stringify(payload),
        stamp,
      );
      event(db, orgId, consultationId, "proposal_saved", {});
      return true;
    },
    latestProposal(orgId, consultationId) {
      const row = db
        .prepare(`SELECT payload FROM customer_proposals WHERE org_id = ? AND consultation_id = ? ORDER BY created_at DESC, rowid DESC LIMIT 1`)
        .get(orgId, consultationId);
      return row ? JSON.parse(text(row.payload)) : null;
    },
    saveOnboarding(orgId, consultationId, mode, checklist) {
      if (!api.getConsultation(orgId, consultationId)) return false;
      const stamp = now();
      db.prepare(
        `INSERT INTO executive_onboarding (id, consultation_id, org_id, mode, checklist, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(consultation_id) DO UPDATE SET mode = excluded.mode, checklist = excluded.checklist, updated_at = excluded.updated_at`,
      ).run(randomUUID(), consultationId, orgId, mode, JSON.stringify(checklist), stamp);
      event(db, orgId, consultationId, "onboarding_saved", { mode });
      return true;
    },
    getOnboarding(orgId, consultationId) {
      const row = db.prepare("SELECT mode, checklist FROM executive_onboarding WHERE org_id = ? AND consultation_id = ?").get(orgId, consultationId);
      if (!row) return null;
      return { mode: text(row.mode), checklist: JSON.parse(text(row.checklist)) };
    },
    addAsset(input) {
      if (!api.getConsultation(input.orgId, input.consultationId)) return false;
      db.prepare(
        `INSERT INTO avatar_assets (id, consultation_id, org_id, kind, filename, bytes, width, height, status, note, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'metadata_only', 'Binary likeness and voice are not stored in this preview.', ?)`,
      ).run(randomUUID(), input.consultationId, input.orgId, input.kind, input.filename, input.bytes, input.width, input.height, now());
      event(db, input.orgId, input.consultationId, "asset_metadata_recorded", { kind: input.kind, filename: input.filename });
      return true;
    },
    listAssets(orgId, consultationId) {
      if (!api.getConsultation(orgId, consultationId)) return [];
      return db
        .prepare("SELECT kind, filename, status, note FROM avatar_assets WHERE org_id = ? AND consultation_id = ?")
        .all(orgId, consultationId)
        .map((row) => ({ kind: text(row.kind), filename: text(row.filename), status: text(row.status), note: text(row.note) }));
    },
    addKnowledgeSource(orgId, consultationId, title, location, approved) {
      if (!api.getConsultation(orgId, consultationId)) return false;
      db.prepare(
        `INSERT INTO knowledge_sources (id, org_id, consultation_id, title, location, approved, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ).run(randomUUID(), orgId, consultationId, title, location, approved ? 1 : 0, now());
      return true;
    },
    listKnowledgeSources(orgId, consultationId) {
      if (!api.getConsultation(orgId, consultationId)) return [];
      return db
        .prepare("SELECT title, location, approved FROM knowledge_sources WHERE org_id = ? AND consultation_id = ?")
        .all(orgId, consultationId)
        .map((row) => ({ title: text(row.title), location: text(row.location), approved: Number(row.approved) === 1 }));
    },
    listPlans() {
      return db.prepare("SELECT * FROM subscription_plans ORDER BY sort_order").all().map(mapPlan);
    },
    listAddons() {
      return db.prepare("SELECT * FROM pricing_addons ORDER BY code").all().map(mapAddon);
    },
    updatePlan(actorUserId, code, patch) {
      const before = api.listPlans().find((plan) => plan.code === code);
      if (!before) return null;
      const next = { ...before, ...patch, code: before.code, name: patch.name ?? before.name };
      db.prepare(
        `UPDATE subscription_plans
         SET name = ?, monthly_cents = ?, setup_cents = ?, videos = ?, video_minutes = ?, voice_minutes = ?, max_video_seconds = ?, included_avatars = ?, active = ?
         WHERE code = ?`,
      ).run(
        next.name,
        next.monthlyCents,
        next.setupCents,
        next.videos,
        next.videoMinutes,
        next.voiceMinutes,
        next.maxVideoSeconds,
        next.includedAvatars,
        next.active ? 1 : 0,
        code,
      );
      db.prepare(`INSERT INTO pricing_revisions (id, actor_user_id, code, before_json, after_json, created_at) VALUES (?, ?, ?, ?, ?, ?)`).run(
        randomUUID(),
        actorUserId,
        code,
        JSON.stringify(before),
        JSON.stringify(next),
        now(),
      );
      return api.listPlans().find((plan) => plan.code === code) ?? null;
    },
    updateAddon(actorUserId, code, patch) {
      const before = api.listAddons().find((addon) => addon.code === code);
      if (!before) return null;
      const next = { ...before, ...patch, code };
      db.prepare(`UPDATE pricing_addons SET name_en = ?, name_it = ?, unit_cents = ?, per = ?, hypothesis = ?, active = ? WHERE code = ?`).run(
        next.nameEn,
        next.nameIt,
        next.unitCents,
        next.per,
        next.hypothesis ? 1 : 0,
        next.active ? 1 : 0,
        code,
      );
      db.prepare(`INSERT INTO pricing_revisions (id, actor_user_id, code, before_json, after_json, created_at) VALUES (?, ?, ?, ?, ?, ?)`).run(
        randomUUID(),
        actorUserId,
        code,
        JSON.stringify(before),
        JSON.stringify(next),
        now(),
      );
      return api.listAddons().find((addon) => addon.code === code) ?? null;
    },
    close() {
      db.close();
    },
  };
  return api;
}

function applyColumn(db: DatabaseSync, orgId: string, consultationId: string, key: string, value: string, stamp: string): void {
  const columns: Record<string, string> = {
    audience: "audience",
    pain: "pain",
    solve_for: "notes",
    language: "language",
    status: "status",
    executive_label: "executive_label",
  };
  if (key === "current_step") {
    db.prepare("UPDATE consultations SET current_step = ?, updated_at = ? WHERE id = ? AND org_id = ?").run(Number(value) || 0, stamp, consultationId, orgId);
    return;
  }
  const column = columns[key];
  if (!column) {
    db.prepare("UPDATE consultations SET updated_at = ? WHERE id = ? AND org_id = ?").run(stamp, consultationId, orgId);
    return;
  }
  db.prepare(`UPDATE consultations SET ${column} = ?, updated_at = ? WHERE id = ? AND org_id = ?`).run(value, stamp, consultationId, orgId);
}

function event(db: DatabaseSync, orgId: string, consultationId: string, type: string, payload: Record<string, unknown>): void {
  db.prepare("INSERT INTO consultation_events (id, consultation_id, org_id, type, payload, created_at) VALUES (?, ?, ?, ?, ?, ?)").run(
    randomUUID(),
    consultationId,
    orgId,
    type,
    JSON.stringify(payload),
    now(),
  );
}

function mapPlan(row: Record<string, unknown>): Plan {
  return {
    code: text(row.code),
    name: text(row.name),
    monthlyCents: Number(row.monthly_cents),
    setupCents: Number(row.setup_cents),
    videos: Number(row.videos),
    videoMinutes: Number(row.video_minutes),
    voiceMinutes: Number(row.voice_minutes),
    maxVideoSeconds: Number(row.max_video_seconds),
    includedAvatars: Number(row.included_avatars),
    sortOrder: Number(row.sort_order),
    active: Number(row.active) === 1,
  };
}

function mapAddon(row: Record<string, unknown>): Addon {
  return {
    code: text(row.code),
    nameEn: text(row.name_en),
    nameIt: text(row.name_it),
    unitCents: row.unit_cents == null ? null : Number(row.unit_cents),
    per: text(row.per) as Addon["per"],
    hypothesis: Number(row.hypothesis) === 1,
    active: Number(row.active) === 1,
  };
}

function mapConsent(row: Record<string, unknown>): ConsentRecord {
  return {
    id: text(row.id),
    orgId: text(row.org_id),
    consultationId: text(row.consultation_id),
    kind: text(row.kind) as ConsentKind,
    granted: Number(row.granted) === 1,
    textVersion: text(row.text_version),
    locale: text(row.locale) === "it" ? "it" : "en",
    createdAt: text(row.created_at),
  };
}

function transaction(db: DatabaseSync, work: () => void): void {
  db.exec("BEGIN");
  try {
    work();
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function now(): string {
  return new Date().toISOString();
}

function text(value: unknown): string {
  return value == null ? "" : String(value);
}

function must<T>(value: T | null): T {
  if (value == null) throw new Error("Expected a database row.");
  return value;
}
