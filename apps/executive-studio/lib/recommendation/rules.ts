import { capability } from "../capabilities";
import { AUDIENCES, discoveryQuestions, isAnswered, nextUnanswered, PAINS } from "../discovery";
import { formatEur, quote, usageFromAnswers } from "../pricing";
import { monthlyVolumeBurden, round1, weeklyBurden } from "../time";
import type { Addon, Locale, Plan } from "../types";
import { parseRecommendation, type Recommendation } from "./schema";

export type EngineInput = {
  locale: Locale;
  category: string;
  audience: string;
  pain: string;
  notes: string;
  answers: Record<string, string>;
  plans: Plan[];
  addons: Addon[];
  identityAuthorized?: boolean;
};

function L(locale: Locale, en: string, it: string): string {
  return locale === "it" ? it : en;
}

function num(value: string | undefined): number | null {
  if (value == null || value.trim() === "") return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return parsed;
}

function corpus(input: EngineInput): string {
  return [input.notes, ...Object.values(input.answers)].join("\n");
}

function labelFor(id: string, pain: string, locale: Locale): string {
  const question = discoveryQuestions(pain).find((item) => item.id === id);
  return question?.label[locale] ?? id;
}

export function findContradictions(input: EngineInput): string[] {
  const { locale, answers, pain } = input;
  const text = corpus(input).toLowerCase();
  const found: string[] = [];
  const frequency = num(answers.frequency_per_week);
  const minutes = num(answers.minutes_each);
  const often = /every day|each day|daily|every week|weekly|ogni giorno|tutti i giorni|ogni settimana|quotidian|settimanal/;
  if (frequency === 0 && often.test(text)) {
    found.push(
      L(
        locale,
        "Frequency is 0, but the notes describe a daily or weekly recurrence.",
        "La frequenza è 0, ma le note descrivono una ricorrenza quotidiana o settimanale.",
      ),
    );
  }
  const videos = num(answers.videos_per_month) ?? 0;
  if (videos > 0 && /no video|without video|non ci servono video|senza video|non servono video/.test(text)) {
    found.push(
      L(
        locale,
        "A video quantity is set, but the notes say video is not needed.",
        "È indicata una quantità di video, ma le note dicono che il video non serve.",
      ),
    );
  }
  if (frequency !== null && frequency > 0 && minutes === 0) {
    found.push(
      L(
        locale,
        "Frequency is set, but the duration of each occurrence is 0.",
        "La frequenza è indicata, ma la durata di ogni occorrenza è 0.",
      ),
    );
  }
  const stated = num(answers.total_video_minutes);
  const average = num(answers.average_video_seconds) ?? 0;
  if (stated !== null && videos > 0 && average > 0) {
    const derived = (videos * average) / 60;
    if (Math.abs(stated - derived) > 0.5) {
      found.push(
        L(
          locale,
          `Total video minutes (${round1(stated)}) do not match videos × duration (${round1(derived)}).`,
          `I minuti video totali (${round1(stated)}) non coincidono con video × durata (${round1(derived)}).`,
        ),
      );
    }
  }
  if (pain === "meetings" && answers.meeting_goal === "participate" && /decisions stay human|resta a una persona|deve restare/.test(text) === false) {
    // Participation is unsupported, not by itself a contradiction. Handled as a capability limit.
  }
  return found;
}

export function hasMeasurablePain(input: EngineInput): boolean {
  const answers = input.answers;
  const frequency = num(answers.frequency_per_week) ?? 0;
  const minutes = num(answers.minutes_each) ?? 0;
  if (frequency > 0 && minutes > 0) return true;
  const clients = num(answers.client_per_month) ?? 0;
  const clientMinutes = num(answers.client_duration) ?? 0;
  if (clients > 0 && clientMinutes > 0) return true;
  const joiners = num(answers.employee_joiners) ?? 0;
  if (joiners > 0 && minutes > 0) return true;
  if ((num(answers.video_volume) ?? 0) > 0) return true;
  if ((num(answers.videos_per_month) ?? 0) > 0 && (num(answers.average_video_seconds) ?? 0) > 0) return true;
  if ((num(answers.meeting_weekly_count) ?? 0) > 0 && minutes > 0) return true;
  return false;
}

function audienceName(id: string, locale: Locale): string {
  return AUDIENCES.find((item) => item.id === id)?.[locale] ?? "";
}

function painName(id: string, locale: Locale): string {
  return PAINS.find((item) => item.id === id)?.[locale] ?? "";
}

function feature(id: string, locale: Locale): { name: string; availability: Recommendation["recommended_features"][number]["availability"] } {
  const item = capability(id);
  return { name: item.name[locale], availability: item.availability };
}

type Shape = {
  name: string;
  summary: string;
  availability: Recommendation["recommended_solution"]["availability"];
  features: Recommendation["recommended_features"];
  complexity: Recommendation["implementation_complexity"];
};

function shapeFor(input: EngineInput, measurable: boolean): Shape {
  const { locale, pain, answers } = input;
  const platform = answers.meeting_platform;
  if (!pain || pain === "other") {
    return {
      name: L(locale, "Continued discovery", "Scoperta ancora aperta"),
      summary: L(
        locale,
        "There is not enough of a defined problem to propose a module.",
        "Il problema non è abbastanza definito per proporre un modulo.",
      ),
      availability: "feasibility_required",
      features: [],
      complexity: "medium",
    };
  }
  if (pain === "meetings") {
    const features = [
      feature("meeting_participation", locale),
      feature(platform === "teams" ? "teams_bot" : "zoom_bot", locale),
      feature("knowledge_answers", locale),
      feature("human_handoff", locale),
    ];
    const participate = answers.meeting_goal === "participate";
    return {
      name: L(locale, "Meeting avatar — feasibility review", "Avatar in riunione — verifica di fattibilità"),
      summary: participate
        ? L(
            locale,
            "Participation inside the live meeting is not an available product. A person keeps decisions, summaries and anything the customer said must stay human. A web twin can be scoped later, only for predictable questions.",
            "La partecipazione dentro la riunione dal vivo non è un prodotto disponibile. Decisioni, sintesi e tutto ciò che il cliente vuole lasciare a una persona restano umani. Un gemello web si può valutare dopo, solo per le domande prevedibili.",
          )
        : L(
            locale,
            "No meeting bot is connected. The next step is a feasibility review of platform, permissions and consent. The only thing that can be proposed now is a source-backed web experience for predictable questions.",
            "Nessun bot di riunione è collegato. Il passo successivo è una verifica di fattibilità su piattaforma, permessi e consenso. Ora si può proporre solo un'esperienza web basata su fonti, per le domande prevedibili.",
          ),
      availability: "not_operational",
      features,
      complexity: "high",
    };
  }
  if (pain === "kiosk") {
    return {
      name: L(locale, "Reception screen — concept only", "Schermo in reception — solo un concept"),
      summary: L(
        locale,
        "The on-screen welcome is an interactive demo. A physical kiosk and any holographic display are not included and are not operational.",
        "Il benvenuto su schermo è una demo interattiva. Un chiosco fisico e qualsiasi display olografico non sono inclusi e non sono operativi.",
      ),
      availability: "demo_only",
      features: [feature("kiosk_screen", locale), feature("holographic", locale), feature("human_handoff", locale)],
      complexity: "high",
    };
  }
  if (pain === "client_onboarding") {
    return {
      name: L(locale, "Client onboarding assistant", "Assistente per l'onboarding clienti"),
      summary: L(
        locale,
        "A branded assistant can collect the repeated questions and hand the rest to a person. Writing into the CRM is not operational.",
        "Un assistente con il marchio può raccogliere le domande ripetute e passare il resto a una persona. La scrittura nel CRM non è operativa.",
      ),
      availability: measurable ? "proposal" : "feasibility_required",
      features: [feature("web_avatar", locale), feature("knowledge_answers", locale), feature("human_handoff", locale), feature("crm_write", locale)],
      complexity: "medium",
    };
  }
  if (pain === "employee_onboarding" || pain === "knowledge") {
    return {
      name: L(locale, "Knowledge-based digital twin", "Gemello digitale basato sulla conoscenza"),
      summary: L(
        locale,
        "Employees can ask the recurring questions against approved sources, with a citation and an escalation when the answer is not in the source.",
        "I dipendenti possono porre le domande ricorrenti sulle fonti approvate, con una citazione e un'escalation quando la risposta non è nella fonte.",
      ),
      availability: measurable ? "proposal" : "feasibility_required",
      features: [feature("knowledge_answers", locale), feature("human_handoff", locale), feature("likeness", locale), feature("voice_clone", locale)],
      complexity: "medium",
    };
  }
  if (pain === "video" || pain === "executive_communication" || pain === "multilingual") {
    return {
      name: "AI Video Studio",
      summary: L(
        locale,
        "Approved scripts can become short executive videos inside the generated-minute cap. Extra languages are extra minutes, not an open allowance.",
        "Gli script approvati possono diventare brevi video della direzione, dentro il tetto di minuti generati. Le lingue in più sono minuti in più, non un tetto aperto.",
      ),
      availability: measurable ? "proposal" : "feasibility_required",
      features: [feature("scripted_video", locale), feature("likeness", locale), feature("voice_clone", locale)],
      complexity: "low",
    };
  }
  return {
    name: L(locale, "Continued discovery", "Scoperta ancora aperta"),
    summary: L(locale, "Stay with the problem before naming a product.", "Restare sul problema prima di nominare un prodotto."),
    availability: "feasibility_required",
    features: [],
    complexity: "medium",
  };
}

function burdenSentences(input: EngineInput): string[] {
  const { locale, answers } = input;
  const lines: string[] = [];
  const frequency = num(answers.frequency_per_week);
  const minutes = num(answers.minutes_each);
  if (frequency !== null && minutes !== null && (frequency > 0 || minutes > 0)) {
    const burden = weeklyBurden(frequency, minutes);
    lines.push(
      L(
        locale,
        `On the figures given (${frequency} times a week × ${minutes} minutes × 52/12), about ${round1(burden.monthlyHours)} hours a month are involved. This is time currently involved, not a saving.`,
        `Sulle cifre indicate (${frequency} volte a settimana × ${minutes} minuti × 52/12), sono coinvolte circa ${round1(burden.monthlyHours)} ore al mese. È tempo oggi impegnato, non un risparmio.`,
      ),
    );
  }
  const clients = num(answers.client_per_month);
  const clientMinutes = num(answers.client_duration);
  if (clients && clientMinutes) {
    const burden = monthlyVolumeBurden(clients, clientMinutes);
    lines.push(
      L(
        locale,
        `Client onboarding, as stated: ${clients} clients × ${clientMinutes} minutes = ${round1(burden.monthlyHours)} hours a month. Not a saving, and not added to the weekly figure in case the two overlap.`,
        `Onboarding clienti, come dichiarato: ${clients} clienti × ${clientMinutes} minuti = ${round1(burden.monthlyHours)} ore al mese. Non è un risparmio, e non si somma alla cifra settimanale perché i due conteggi possono sovrapporsi.`,
      ),
    );
  }
  return lines;
}

export function buildRecommendation(input: EngineInput): Recommendation {
  const locale = input.locale;
  const answers = { ...input.answers };
  if (input.notes.trim() && !isAnswered(answers.solve_for)) answers.solve_for = input.notes.trim();
  const working: EngineInput = { ...input, answers };
  const contradictions = findContradictions(working);
  const measurable = hasMeasurablePain(working) && contradictions.length === 0;
  const pending = nextUnanswered(working.pain, answers, locale);
  const shape = shapeFor(working, measurable);
  const usage = usageFromAnswers(answers, working.pain);
  const priced = quote(working.plans, working.addons, usage);

  const evidence: string[] = [];
  const audience = audienceName(working.audience, locale);
  if (audience) evidence.push(`${L(locale, "Audience", "Pubblico")}: ${audience}`);
  const pain = painName(working.pain, locale);
  if (pain) evidence.push(`${L(locale, "Problem area", "Area del problema")}: ${pain}`);
  for (const question of discoveryQuestions(working.pain)) {
    if (question.id === "solve_for") continue;
    if (!isAnswered(answers[question.id])) continue;
    evidence.push(`${question.label[locale]}: ${answers[question.id].trim()}`);
  }

  const missing = discoveryQuestions(working.pain)
    .filter((question) => question.required && !isAnswered(answers[question.id]))
    .map((question) => question.label[locale]);
  for (const item of contradictions) {
    missing.push(`${L(locale, "Resolve the contradiction", "Chiudere la contraddizione")}: ${item}`);
  }

  const narrative = answers.problem_narrative?.trim() ?? "";
  const note = (answers.solve_for || working.notes).trim();
  const summaryParts: string[] = [];
  if (narrative) summaryParts.push(narrative);
  else if (note) {
    summaryParts.push(
      L(
        locale,
        `Working note, not yet confirmed by the customer: ${note}`,
        `Nota di lavoro, non ancora confermata dal cliente: ${note}`,
      ),
    );
  } else {
    summaryParts.push(
      L(locale, "The problem is not established yet.", "Il problema non è ancora definito."),
    );
  }
  if (audience && pain) {
    summaryParts.push(
      L(
        locale,
        `The customer pointed to ${pain.toLowerCase()} for ${audience.toLowerCase()}.`,
        `Il cliente ha indicato «${pain}» per «${audience}».`,
      ),
    );
  }
  summaryParts.push(...burdenSentences(working));

  const risks: string[] = [
    L(
      locale,
      "Time figures describe involvement, not a guaranteed saving.",
      "Le cifre di tempo descrivono il tempo impegnato, non un risparmio garantito.",
    ),
  ];
  if (!working.identityAuthorized) {
    risks.push(capability("likeness").limitation[locale]);
  }
  risks.push(...contradictions);
  const text = corpus(working).toLowerCase();
  if (/unlimited|illimitat/.test(text)) {
    risks.push(
      L(
        locale,
        "Unlimited video is not offered. Every plan has a video count and a minute cap.",
        "Il video illimitato non è previsto. Ogni piano ha un numero di video e un tetto di minuti.",
      ),
    );
  }
  if (/guaranteed saving|risparmio garantito/.test(text)) {
    risks.push(
      L(
        locale,
        "A guaranteed saving was mentioned. This studio does not promise one.",
        "È stato citato un risparmio garantito. Questo studio non lo promette.",
      ),
    );
  }
  if (working.pain === "kiosk" || /hologram|ologramm/.test(text)) {
    risks.push(capability("holographic").limitation[locale]);
  }
  if (working.pain === "meetings") risks.push(capability("meeting_participation").limitation[locale]);
  if (answers.meeting_platform === "zoom") risks.push(capability("zoom_bot").limitation[locale]);
  if (answers.meeting_platform === "teams") risks.push(capability("teams_bot").limitation[locale]);
  if (working.pain === "client_onboarding") risks.push(capability("crm_write").limitation[locale]);
  if (answers.italian_human === "true") risks.push(capability("italian_human").limitation[locale]);
  if (answers.podcast_interest === "true") risks.push(capability("podcast").limitation[locale]);

  const assumptions = [
    ...priced.assumptions.map((item) => item[locale]),
    L(
      locale,
      "Voice minutes follow the prototype: 0, 0, 250, 750. A reconstructed 60 and 200 on the first two plans were not applied.",
      "I minuti voce seguono il prototipo: 0, 0, 250, 750. I 60 e 200 ricostruiti sui primi due piani non sono stati applicati.",
    ),
  ];

  let recommendedPlan: Recommendation["recommended_plan"] = null;
  const gated = priced.fit === "gated" || working.pain === "meetings" || working.pain === "kiosk";
  if (measurable && !gated && priced.plan && priced.fit !== "insufficient_usage") {
    recommendedPlan = {
      code: priced.plan.code,
      name: priced.plan.name,
      reason: L(
        locale,
        `Smallest hypothesis whose included videos (${priced.plan.videos}), video minutes (${priced.plan.videoMinutes}) and voice minutes (${priced.plan.voiceMinutes}) cover the stated usage, before overage.`,
        `L'ipotesi più piccola i cui video inclusi (${priced.plan.videos}), minuti video (${priced.plan.videoMinutes}) e minuti voce (${priced.plan.voiceMinutes}) coprono l'uso dichiarato, prima degli extra.`,
      ),
      monthly_eur: priced.recurringCents / 100,
      setup_eur: priced.setupCents / 100,
    };
    if (priced.fit === "overage" || priced.fit === "needs_quote") {
      recommendedPlan.reason += L(
        locale,
        " Part of the request sits outside the included pool and is itemized, not treated as unlimited.",
        " Una parte della richiesta esce dal tetto incluso ed è voce a parte, non un uso illimitato.",
      );
    }
    if ((num(answers.videos_per_month) ?? 0) === 0 && (num(answers.voice_minutes) ?? 0) === 0) {
      recommendedPlan.reason += L(
        locale,
        " Video and voice quantities are still empty, so this is the entry hypothesis for the problem, not a sized quote.",
        " Le quantità di video e di voce sono ancora vuote: è l'ipotesi di ingresso per il problema, non un preventivo dimensionato.",
      );
    }
  } else if (gated && priced.plan) {
    assumptions.push(
      L(
        locale,
        `An indicative web alternative would be ${priced.plan.name} at ${formatEur(priced.plan.monthlyCents, locale)} per month plus ${formatEur(priced.plan.setupCents, locale)} setup. That price is not a meeting or kiosk deployment.`,
        `Un'alternativa web indicativa sarebbe ${priced.plan.name} a ${formatEur(priced.plan.monthlyCents, locale)} al mese più ${formatEur(priced.plan.setupCents, locale)} di attivazione. Quel prezzo non è un deployment per riunioni o chioschi.`,
      ),
    );
  } else if (!measurable) {
    assumptions.push(
      L(
        locale,
        "No package is recommended until the customer gives a frequency and a duration, or another measurable volume.",
        "Nessun pacchetto è consigliato finché il cliente non indica una frequenza e una durata, o un altro volume misurabile.",
      ),
    );
  }

  const pilotSuccess = answers.pilot_success?.trim();
  const pilot = measurable
    ? {
        summary: L(
          locale,
          "A four-week pilot on one audience, using only sources the customer has approved. Scope stays inside the capabilities that are actually available.",
          "Un pilota di quattro settimane su un solo pubblico, solo con fonti che il cliente ha approvato. Il perimetro resta dentro le capacità davvero disponibili.",
        ),
        success_would_show: pilotSuccess
          ? pilotSuccess
          : L(
              locale,
              "Not agreed yet. Ask what a successful pilot would show before writing a success metric.",
              "Non è ancora concordato. Chiedere che cosa dovrebbe dimostrare un pilota, prima di scrivere una metrica.",
            ),
      }
    : {
        summary: L(
          locale,
          "Do not scope a pilot yet. The problem, the frequency or the consequence is still missing.",
          "Non definire ancora un pilota. Manca il problema, la frequenza o la conseguenza.",
        ),
        success_would_show: pilotSuccess
          ? pilotSuccess
          : L(locale, "Not yet stated by the customer.", "Non ancora indicato dal cliente."),
      };

  const metrics = pilotSuccess
    ? [pilotSuccess]
    : [
        L(
          locale,
          "No success metric has been agreed. Do not invent one.",
          "Nessuna metrica di successo è stata concordata. Non se ne inventa una.",
        ),
      ];

  const followUps: string[] = [];
  if (pending) followUps.push(pending.question);
  if (isAnswered(answers.next_step)) {
    followUps.push(`${L(locale, "Agreed next action", "Prossima azione concordata")}: ${answers.next_step.trim()}`);
  }
  if (answers.italian_human === "true") {
    followUps.push(
      L(locale, "Confirm whether an Italian-speaking person is actually available.", "Confermare se una persona di lingua italiana è davvero disponibile."),
    );
  }
  if (answers.podcast_interest === "true") {
    followUps.push(
      L(
        locale,
        "Collect separate consent for podcast recording, editing, publication and distribution.",
        "Raccogliere consensi separati per registrazione, montaggio, pubblicazione e distribuzione del podcast.",
      ),
    );
  }
  if (gated) {
    followUps.push(
      L(
        locale,
        "Book a feasibility review before describing a meeting or reception integration as available.",
        "Fissare una verifica di fattibilità prima di descrivere come disponibile un'integrazione per riunioni o reception.",
      ),
    );
  }
  if (followUps.length === 0) {
    followUps.push(
      L(locale, "Review the proposal with the purchase approver.", "Rivedere la proposta con chi approva l'acquisto."),
    );
  }

  const dependencies = [
    capability("likeness").limitation[locale],
    capability("voice_clone").limitation[locale],
    L(
      locale,
      "A named approver for sources and for anything the twin is allowed to say.",
      "Un responsabile nominato per le fonti e per ciò che il gemello può dire.",
    ),
  ];
  if (working.pain === "client_onboarding" && isAnswered(answers.client_crm)) {
    dependencies.push(
      L(
        locale,
        `The customer named this system: ${answers.client_crm.trim()}. No connector to it is live.`,
        `Il cliente ha indicato questo sistema: ${answers.client_crm.trim()}. Nessun connettore verso quel sistema è attivo.`,
      ),
    );
  }
  if (working.pain === "employee_onboarding") {
    dependencies.push(capability("knowledge_answers").limitation[locale]);
  }

  const nextQuestion = pending
    ? pending.question
    : L(
        locale,
        "Which remaining risk should we close before talking about a pilot?",
        "Quale rischio rimasto va chiuso prima di parlare di un pilota?",
      );

  if (!measurable && shape.availability === "proposal") {
    shape.availability = "feasibility_required";
  }

  return parseRecommendation({
    problem_summary: summaryParts.join(" "),
    evidence_from_customer: evidence,
    missing_information: missing,
    next_best_question: nextQuestion,
    recommended_solution: {
      name: shape.name,
      summary: shape.summary,
      availability: shape.availability,
    },
    recommended_features: shape.features,
    implementation_complexity: shape.complexity,
    technical_dependencies: dependencies,
    recommended_plan: recommendedPlan,
    pricing_assumptions: assumptions,
    pilot_proposal: pilot,
    success_metrics: metrics,
    risks,
    follow_up_actions: followUps,
  });
}

export function questionLabel(id: string, pain: string, locale: Locale): string {
  return labelFor(id, pain, locale);
}
