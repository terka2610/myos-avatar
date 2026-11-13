import type { Addon, Locale, Plan } from "./types";
import { renderedVideoMinutes, round1 } from "./time";

/**
 * Seeded from the consultation prototype, not from the reconstructed voice column.
 * Video Presence "60" in that column is the prototype's max clip length in seconds.
 * Executive Content has no 200-minute voice pool in the prototype.
 * Every figure is a pricing hypothesis until a commercial owner confirms it.
 */
export const PRICING_RECONCILIATION = {
  en: "Prices are hypotheses, not an offer. Video counts, video minutes, setup and monthly fees match the consultation prototype. Voice minutes are 0, 0, 250 and 750. A reconstructed table listed 60 and 200 voice minutes on the first two plans; 60 matches Video Presence's maximum clip length in seconds, and 200 does not appear in the prototype. Those two figures were not applied. Change them here if the commercial owner adopts a different hypothesis.",
  it: "I prezzi sono ipotesi, non un'offerta. Numero di video, minuti video, attivazione e canone seguono il prototipo. I minuti voce sono 0, 0, 250 e 750. Una tabella ricostruita indicava 60 e 200 minuti voce sui primi due piani: 60 coincide con la durata massima in secondi di Video Presence, e 200 non compare nel prototipo. Quelle due cifre non sono state applicate. Si possono modificare qui se il responsabile commerciale adotta un'altra ipotesi.",
} as const;

export const DEFAULT_PLANS: Plan[] = [
  {
    code: "presence",
    name: "Video Presence",
    monthlyCents: 9900,
    setupCents: 24900,
    videos: 6,
    videoMinutes: 6,
    voiceMinutes: 0,
    maxVideoSeconds: 60,
    includedAvatars: 1,
    sortOrder: 1,
    active: true,
  },
  {
    code: "content",
    name: "Executive Content",
    monthlyCents: 29900,
    setupCents: 49900,
    videos: 20,
    videoMinutes: 20,
    voiceMinutes: 0,
    maxVideoSeconds: 90,
    includedAvatars: 1,
    sortOrder: 2,
    active: true,
  },
  {
    code: "knowledge",
    name: "Knowledge + Onboarding",
    monthlyCents: 79900,
    setupCents: 150000,
    videos: 20,
    videoMinutes: 25,
    voiceMinutes: 250,
    maxVideoSeconds: 120,
    includedAvatars: 1,
    sortOrder: 3,
    active: true,
  },
  {
    code: "leadership",
    name: "Leadership Platform",
    monthlyCents: 149900,
    setupCents: 300000,
    videos: 40,
    videoMinutes: 50,
    voiceMinutes: 750,
    maxVideoSeconds: 120,
    includedAvatars: 2,
    sortOrder: 4,
    active: true,
  },
];

export const DEFAULT_ADDONS: Addon[] = [
  {
    code: "video_overage",
    nameEn: "Extra generated video",
    nameIt: "Video generato extra",
    unitCents: 1500,
    per: "video_minute",
    hypothesis: true,
    active: true,
  },
  {
    code: "voice_overage",
    nameEn: "Extra conversational voice",
    nameIt: "Voce conversazionale extra",
    unitCents: 25,
    per: "voice_minute",
    hypothesis: true,
    active: true,
  },
  {
    code: "italian_human",
    nameEn: "Italian-speaking human support",
    nameIt: "Supporto umano in italiano",
    unitCents: null,
    per: "month",
    hypothesis: true,
    active: true,
  },
  {
    code: "extra_avatar",
    nameEn: "Extra avatar",
    nameIt: "Avatar aggiuntivo",
    unitCents: null,
    per: "month",
    hypothesis: true,
    active: true,
  },
  {
    code: "live_video",
    nameEn: "Live video, tracked separately",
    nameIt: "Video live, conteggiato a parte",
    unitCents: null,
    per: "custom",
    hypothesis: true,
    active: true,
  },
  {
    code: "meeting_integration",
    nameEn: "Meeting integration",
    nameIt: "Integrazione riunioni",
    unitCents: null,
    per: "custom",
    hypothesis: true,
    active: true,
  },
  {
    code: "physical_kiosk",
    nameEn: "Physical reception kiosk",
    nameIt: "Chiosco fisico in reception",
    unitCents: null,
    per: "custom",
    hypothesis: true,
    active: true,
  },
];

export type UsageInput = {
  videosPerMonth: number;
  averageVideoSeconds: number;
  statedVideoMinutes: number | null;
  maxVideoSeconds: number;
  voiceMinutes: number;
  avatarCount: number;
  italianHuman: boolean;
  meetingIntegration: boolean;
  knowledgeBase: boolean;
  liveVideoMinutes: number;
  pain: string;
};

export type QuoteLine = {
  code: string;
  kind: "recurring" | "setup" | "usage" | "excluded";
  cents: number | null;
  hypothesis: boolean;
  detail: { en: string; it: string };
};

export type Quote = {
  fit: "insufficient_usage" | "included" | "overage" | "gated" | "needs_quote";
  plan: Plan | null;
  alternative: Plan | null;
  recurringCents: number;
  setupCents: number;
  lines: QuoteLine[];
  videoMinutesNeeded: number;
  overageVideoMinutes: number;
  overageVoiceMinutes: number;
  countExceeded: boolean;
  durationExceeded: boolean;
  assumptions: { en: string; it: string }[];
  unlimited: false;
};

const GATED = new Set(["meetings", "kiosk"]);
const KNOWLEDGE_PAINS = new Set(["knowledge", "employee_onboarding", "client_onboarding", "executive_communication"]);

export function quote(plans: Plan[], addons: Addon[], usage: UsageInput): Quote {
  const active = plans.filter((plan) => plan.active).slice().sort((a, b) => a.sortOrder - b.sortOrder);
  const derived = renderedVideoMinutes(usage.videosPerMonth, usage.averageVideoSeconds);
  const stated = usage.statedVideoMinutes ?? 0;
  const videoMinutesNeeded = round1(Math.max(derived, stated));
  const assumptions: Quote["assumptions"] = [
    {
      en: "Monthly and setup figures are hypotheses. They are not a signed commercial offer.",
      it: "Canone e attivazione sono ipotesi. Non sono un'offerta commerciale firmata.",
    },
    {
      en: "Generated video is capped by the plan. Nothing in the catalog is unlimited.",
      it: "Il video generato ha un tetto di piano. Nessuna voce del catalogo è illimitata.",
    },
  ];
  if (stated > 0 && derived > 0 && Math.abs(stated - derived) > 0.5) {
    assumptions.push({
      en: `Stated video minutes (${round1(stated)}) differ from videos × duration (${round1(derived)}). The higher figure is used so the cap is not understated.`,
      it: `I minuti video dichiarati (${round1(stated)}) non coincidono con video × durata (${round1(derived)}). Si usa la cifra più alta per non sottostimare il tetto.`,
    });
  }
  assumptions.push({
    en: "Extra languages and re-renders can consume more generated minutes. That extra is not priced until the customer states it.",
    it: "Lingue aggiuntive e nuove renderizzazioni possono consumare altri minuti generati. Quel consumo non è prezzato finché il cliente non lo indica.",
  });
  assumptions.push({
    en: "Included avatar counts are a working hypothesis. Leadership Platform uses two, following the prototype note about two audiences.",
    it: "Il numero di avatar inclusi è un'ipotesi di lavoro. Leadership Platform ne prevede due, in linea con la nota del prototipo su due pubblici.",
  });

  const empty: Quote = {
    fit: "insufficient_usage",
    plan: null,
    alternative: null,
    recurringCents: 0,
    setupCents: 0,
    lines: [],
    videoMinutesNeeded,
    overageVideoMinutes: 0,
    overageVoiceMinutes: 0,
    countExceeded: false,
    durationExceeded: false,
    assumptions,
    unlimited: false,
  };

  const hasUsage =
    usage.videosPerMonth > 0 ||
    videoMinutesNeeded > 0 ||
    usage.voiceMinutes > 0 ||
    usage.liveVideoMinutes > 0 ||
    usage.italianHuman ||
    usage.meetingIntegration ||
    usage.knowledgeBase;
  if (!hasUsage || active.length === 0) return empty;

  const knowledgeNeeded = usage.knowledgeBase || KNOWLEDGE_PAINS.has(usage.pain);
  const pool = knowledgeNeeded ? active.filter((plan) => plan.voiceMinutes > 0) : active;
  const candidates = pool.length > 0 ? pool : active;

  const fits = (plan: Plan) =>
    usage.videosPerMonth <= plan.videos &&
    videoMinutesNeeded <= plan.videoMinutes &&
    usage.voiceMinutes <= plan.voiceMinutes &&
    (usage.maxVideoSeconds || 0) <= plan.maxVideoSeconds;

  let plan = candidates.find((item) => fits(item)) ?? null;
  let overageVideoMinutes = 0;
  let overageVoiceMinutes = 0;
  let countExceeded = false;
  let durationExceeded = false;
  let fit: Quote["fit"] = "included";

  if (!plan) {
    plan = candidates[candidates.length - 1];
    fit = "overage";
    overageVideoMinutes = round1(Math.max(0, videoMinutesNeeded - plan.videoMinutes));
    overageVoiceMinutes = round1(Math.max(0, usage.voiceMinutes - plan.voiceMinutes));
    countExceeded = usage.videosPerMonth > plan.videos;
    durationExceeded = (usage.maxVideoSeconds || 0) > plan.maxVideoSeconds;
  }

  if (GATED.has(usage.pain)) {
    fit = "gated";
    assumptions.push({
      en: "Meetings and physical reception are not sold as a ready package. The figure below is only a low-risk alternative for a web experience, after a feasibility review.",
      it: "Riunioni e reception fisica non si vendono come pacchetto già pronto. La cifra sotto è solo un'alternativa a basso rischio per un'esperienza web, dopo una verifica di fattibilità.",
    });
  }

  const lines: QuoteLine[] = [
    {
      code: "plan_monthly",
      kind: "recurring",
      cents: plan.monthlyCents,
      hypothesis: true,
      detail: {
        en: `${plan.name} monthly hypothesis`,
        it: `Ipotesi di canone ${plan.name}`,
      },
    },
    {
      code: "plan_setup",
      kind: "setup",
      cents: plan.setupCents,
      hypothesis: true,
      detail: {
        en: `${plan.name} setup hypothesis, billed separately from the monthly fee`,
        it: `Ipotesi di attivazione ${plan.name}, separata dal canone`,
      },
    },
  ];

  let recurring = plan.monthlyCents;
  const setup = plan.setupCents;
  const byCode = new Map(addons.filter((addon) => addon.active).map((addon) => [addon.code, addon]));

  if (overageVideoMinutes > 0) {
    const addon = byCode.get("video_overage");
    const cents = addon?.unitCents != null ? Math.round(overageVideoMinutes * addon.unitCents) : null;
    if (cents != null) recurring += cents;
    lines.push({
      code: "video_overage",
      kind: cents == null ? "excluded" : "usage",
      cents,
      hypothesis: true,
      detail: {
        en: `${overageVideoMinutes} generated minutes above the included ${plan.videoMinutes}. Not unlimited.`,
        it: `${overageVideoMinutes} minuti generati oltre i ${plan.videoMinutes} inclusi. Non è un tetto illimitato.`,
      },
    });
  }
  if (overageVoiceMinutes > 0) {
    const addon = byCode.get("voice_overage");
    const cents = addon?.unitCents != null ? Math.round(overageVoiceMinutes * addon.unitCents) : null;
    if (cents != null) recurring += cents;
    lines.push({
      code: "voice_overage",
      kind: cents == null ? "excluded" : "usage",
      cents,
      hypothesis: true,
      detail: {
        en: `${overageVoiceMinutes} voice minutes above the included ${plan.voiceMinutes}.`,
        it: `${overageVoiceMinutes} minuti voce oltre i ${plan.voiceMinutes} inclusi.`,
      },
    });
  }

  const extraAvatars = Math.max(0, usage.avatarCount - plan.includedAvatars);
  if (extraAvatars > 0) {
    const addon = byCode.get("extra_avatar");
    const cents = addon?.unitCents != null ? extraAvatars * addon.unitCents : null;
    if (cents != null) recurring += cents;
    else fit = fit === "gated" ? "gated" : "needs_quote";
    lines.push({
      code: "extra_avatar",
      kind: cents == null ? "excluded" : "recurring",
      cents,
      hypothesis: true,
      detail: {
        en: `${extraAvatars} avatar${extraAvatars === 1 ? "" : "s"} above the ${plan.includedAvatars} included. ${cents == null ? "Quoted separately." : "Hypothesis."}`,
        it: `${extraAvatars} avatar oltre i ${plan.includedAvatars} inclusi. ${cents == null ? "Da quotare a parte." : "Ipotesi."}`,
      },
    });
  }

  if (usage.italianHuman) {
    const addon = byCode.get("italian_human");
    const cents = addon?.unitCents ?? null;
    if (cents != null) recurring += cents;
    lines.push({
      code: "italian_human",
      kind: cents == null ? "excluded" : "recurring",
      cents,
      hypothesis: true,
      detail: {
        en: cents == null
          ? "Italian-speaking human support is requested and quoted separately, subject to staffing."
          : "Italian-speaking human support, hypothesis, subject to staffing.",
        it: cents == null
          ? "Il supporto umano in italiano è richiesto e si quota a parte, se c'è disponibilità di persone."
          : "Supporto umano in italiano, ipotesi, se c'è disponibilità di persone.",
      },
    });
  }

  if (usage.meetingIntegration || usage.pain === "meetings") {
    const addon = byCode.get("meeting_integration");
    lines.push({
      code: "meeting_integration",
      kind: "excluded",
      cents: addon?.unitCents ?? null,
      hypothesis: true,
      detail: {
        en: "Meeting integration is not operational. It is not included in the monthly fee.",
        it: "L'integrazione con le riunioni non è operativa. Non è inclusa nel canone.",
      },
    });
    assumptions.push({
      en: "Zoom, Teams and other meeting platforms need a separate feasibility review. No bot is connected.",
      it: "Zoom, Teams e le altre piattaforme richiedono una verifica di fattibilità separata. Nessun bot è collegato.",
    });
  }

  if (usage.pain === "kiosk") {
    lines.push({
      code: "physical_kiosk",
      kind: "excluded",
      cents: byCode.get("physical_kiosk")?.unitCents ?? null,
      hypothesis: true,
      detail: {
        en: "A physical kiosk or holographic display is a separate quote. Hardware is not included.",
        it: "Un chiosco fisico o un display olografico è un preventivo a parte. L'hardware non è incluso.",
      },
    });
  }

  if (usage.liveVideoMinutes > 0) {
    const addon = byCode.get("live_video");
    const cents = addon?.unitCents != null ? Math.round(usage.liveVideoMinutes * addon.unitCents) : null;
    if (cents != null) recurring += cents;
    lines.push({
      code: "live_video",
      kind: cents == null ? "excluded" : "usage",
      cents,
      hypothesis: true,
      detail: {
        en: `${usage.liveVideoMinutes} live minutes are tracked apart from generated video minutes and are not drawn from that pool.`,
        it: `${usage.liveVideoMinutes} minuti live sono conteggiati a parte rispetto ai minuti video generati e non attingono a quel tetto.`,
      },
    });
  }

  if (countExceeded) {
    assumptions.push({
      en: `The requested video count exceeds the ${plan.videos} included in ${plan.name}. The count allowance is not unlimited and needs confirmation.`,
      it: `Il numero di video richiesto supera i ${plan.videos} inclusi in ${plan.name}. Il tetto di quantità non è illimitato e va confermato.`,
    });
  }
  if (durationExceeded) {
    assumptions.push({
      en: `The requested maximum duration exceeds ${plan.maxVideoSeconds} seconds on ${plan.name}.`,
      it: `La durata massima richiesta supera i ${plan.maxVideoSeconds} secondi di ${plan.name}.`,
    });
  }

  const alternative = GATED.has(usage.pain)
    ? active.find((item) => item.voiceMinutes > 0) ?? plan
    : null;

  return {
    fit,
    plan,
    alternative,
    recurringCents: recurring,
    setupCents: setup,
    lines,
    videoMinutesNeeded,
    overageVideoMinutes,
    overageVoiceMinutes,
    countExceeded,
    durationExceeded,
    assumptions,
    unlimited: false,
  };
}

export function formatEur(cents: number, locale: Locale): string {
  const negative = cents < 0;
  const absolute = Math.abs(Math.round(cents));
  const euros = Math.floor(absolute / 100);
  const remainder = absolute % 100;
  const separator = locale === "it" ? "." : ",";
  const grouped = String(euros).replace(/\B(?=(\d{3})+(?!\d))/g, separator);
  const decimal = locale === "it" ? "," : ".";
  const amount = remainder === 0 ? grouped : `${grouped}${decimal}${String(remainder).padStart(2, "0")}`;
  const body = `${negative ? "-" : ""}${amount}`;
  return locale === "it" ? `${body} €` : `€${body}`;
}

export function usageFromAnswers(answers: Record<string, string>, pain: string): UsageInput {
  return {
    videosPerMonth: num(answers.videos_per_month),
    averageVideoSeconds: num(answers.average_video_seconds),
    statedVideoMinutes: answers.total_video_minutes?.trim() ? num(answers.total_video_minutes) : null,
    maxVideoSeconds: num(answers.max_video_seconds || answers.average_video_seconds),
    voiceMinutes: num(answers.voice_minutes),
    avatarCount: answers.avatar_count?.trim() ? num(answers.avatar_count) : 1,
    italianHuman: flag(answers.italian_human),
    meetingIntegration: flag(answers.meeting_integration) || pain === "meetings",
    knowledgeBase: flag(answers.knowledge_base) || ["knowledge", "employee_onboarding", "client_onboarding"].includes(pain),
    liveVideoMinutes: num(answers.live_video_minutes),
    pain,
  };
}

function num(value: string | undefined): number {
  if (!value || !value.trim()) return 0;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return parsed;
}

function flag(value: string | undefined): boolean {
  return value === "true" || value === "1" || value === "yes";
}
