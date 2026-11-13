export type Locale = "en" | "it";

export type Role = "consultant" | "admin";

export type ConsultationStatus = "discovery" | "proposed" | "pilot" | "decided" | "paused";

export type Availability =
  | "configurable"
  | "demo_only"
  | "not_operational"
  | "requires_consent"
  | "subject_to_staffing"
  | "feasibility_required"
  | "proposal";

export type Plan = {
  code: string;
  name: string;
  monthlyCents: number;
  setupCents: number;
  videos: number;
  videoMinutes: number;
  voiceMinutes: number;
  maxVideoSeconds: number;
  includedAvatars: number;
  sortOrder: number;
  active: boolean;
};

export type Addon = {
  code: string;
  nameEn: string;
  nameIt: string;
  unitCents: number | null;
  per: "video_minute" | "voice_minute" | "month" | "custom";
  hypothesis: boolean;
  active: boolean;
};

export type Consultation = {
  id: string;
  orgId: string;
  createdBy: string;
  language: Locale;
  status: ConsultationStatus;
  category: string;
  audience: string;
  pain: string;
  executiveLabel: string;
  currentStep: number;
  notes: string;
  createdAt: string;
  updatedAt: string;
  answers: Record<string, string>;
};

export type Session = {
  userId: string;
  name: string;
  orgId: string;
  orgName: string;
  role: Role;
};

export type ConsentKind =
  | "ai_provider"
  | "meeting_recording"
  | "likeness"
  | "voice_cloning"
  | "audience_scope"
  | "use_cases"
  | "content_generation"
  | "revocation_acknowledged"
  | "podcast_recording"
  | "podcast_editing"
  | "podcast_publication"
  | "podcast_distribution";

export const CONSENT_VERSION = "2026-11-13";

export type ConsentRecord = {
  id: string;
  orgId: string;
  consultationId: string;
  kind: ConsentKind;
  granted: boolean;
  textVersion: string;
  locale: Locale;
  createdAt: string;
};

export type StoredEvent = {
  id: string;
  consultationId: string;
  orgId: string;
  type: string;
  payload: Record<string, unknown>;
  createdAt: string;
};
