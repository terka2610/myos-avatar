import { AUDIENCES, PAINS } from "./discovery";
import type { Quote } from "./pricing";
import { formatEur } from "./pricing";
import type { Recommendation } from "./recommendation/schema";
import { round1, weeklyBurden } from "./time";
import type { Consultation, Locale } from "./types";

function L(locale: Locale, en: string, it: string): string {
  return locale === "it" ? it : en;
}

export function buildBrief(input: {
  consultation: Consultation;
  recommendation: Recommendation | null;
  quote: Quote;
  locale: Locale;
}): string {
  const { consultation, recommendation, quote, locale } = input;
  const answers = consultation.answers;
  const audience = AUDIENCES.find((item) => item.id === consultation.audience)?.[locale] ?? L(locale, "Not selected", "Non indicato");
  const pain = PAINS.find((item) => item.id === consultation.pain)?.[locale] ?? L(locale, "Not selected", "Non indicato");
  const frequency = Number(answers.frequency_per_week || 0);
  const minutes = Number(answers.minutes_each || 0);
  const burden = weeklyBurden(Number.isFinite(frequency) ? frequency : 0, Number.isFinite(minutes) ? minutes : 0);
  const lines = [
    L(locale, "MYOS — consultation summary", "MYOS — sintesi della consulenza"),
    `${L(locale, "Organization record", "Scheda organizzazione")}: ${consultation.id}`,
    `${L(locale, "Audience", "Pubblico")}: ${audience}`,
    `${L(locale, "Problem area", "Area del problema")}: ${pain}`,
    `${L(locale, "In the customer's words", "Con le parole del cliente")}: ${answers.problem_narrative?.trim() || L(locale, "[not provided]", "[non indicato]")}`,
    `${L(locale, "Last example", "Ultimo esempio")}: ${answers.last_example?.trim() || L(locale, "[not provided]", "[non indicato]")}`,
    `${L(locale, "How it is handled today", "Come viene gestito oggi")}: ${answers.current_handling?.trim() || L(locale, "[not provided]", "[non indicato]")}`,
    `${L(locale, "Owner", "Responsabile")}: ${answers.owner?.trim() || L(locale, "[not identified]", "[non indicato]")}`,
    `${L(locale, "Time involved", "Tempo impegnato")}: ${round1(burden.weeklyMinutes)} ${L(locale, "minutes/week", "minuti/settimana")} · ${round1(burden.monthlyHours)} ${L(locale, "hours/month", "ore/mese")} · ${burden.formula}`,
    L(locale, "This is not a measured saving.", "Non è un risparmio misurato."),
    `${L(locale, "Consequence", "Conseguenza")}: ${answers.consequence?.trim() || L(locale, "[not provided]", "[non indicato]")}`,
    `${L(locale, "Already tried", "Già provato")}: ${answers.already_tried?.trim() || L(locale, "[not provided]", "[non indicato]")}`,
    `${L(locale, "What would justify paying", "Che cosa giustificherebbe la spesa")}: ${answers.pay_justification?.trim() || L(locale, "[not provided]", "[non indicato]")}`,
    `${L(locale, "Purchase approver", "Chi approva l'acquisto")}: ${answers.purchase_approver?.trim() || L(locale, "[not identified]", "[non indicato]")}`,
    `${L(locale, "Working note", "Nota di lavoro")}: ${consultation.notes.trim() || L(locale, "[none]", "[nessuna]")}`,
    `${L(locale, "Recommended direction", "Direzione consigliata")}: ${recommendation?.recommended_solution.name ?? L(locale, "Not generated", "Non generata")}`,
    `${L(locale, "Availability", "Disponibilità")}: ${recommendation?.recommended_solution.availability ?? "—"}`,
    `${L(locale, "Features", "Funzioni")}: ${(recommendation?.recommended_features ?? []).map((item) => `${item.name} (${item.availability})`).join("; ") || "—"}`,
    `${L(locale, "Estimated monthly usage", "Uso mensile stimato")}: ${quote.videoMinutesNeeded} ${L(locale, "generated video minutes", "minuti video generati")} · ${answers.voice_minutes || 0} ${L(locale, "voice minutes", "minuti voce")} · ${answers.videos_per_month || 0} ${L(locale, "videos", "video")}`,
    `${L(locale, "Proposed subscription", "Abbonamento proposto")}: ${
      recommendation?.recommended_plan
        ? `${recommendation.recommended_plan.name} · ${formatEur(Math.round((recommendation.recommended_plan.monthly_eur ?? 0) * 100), locale)} / ${L(locale, "month", "mese")} · ${L(locale, "setup", "attivazione")} ${formatEur(Math.round((recommendation.recommended_plan.setup_eur ?? 0) * 100), locale)}`
        : L(locale, "No package — discovery or feasibility still open", "Nessun pacchetto — scoperta o fattibilità ancora aperte")
    }`,
    `${L(locale, "Setup and recurring are separate", "Attivazione e canone sono separati")}: ${L(locale, "setup", "attivazione")} ${formatEur(quote.setupCents, locale)} · ${L(locale, "monthly hypothesis", "ipotesi di canone")} ${formatEur(quote.recurringCents, locale)}`,
    `${L(locale, "Unanswered", "Senza risposta")}: ${(recommendation?.missing_information ?? []).join(" | ") || L(locale, "None listed", "Nessuna")}`,
    `${L(locale, "Next step", "Prossimo passo")}: ${answers.next_step?.trim() || L(locale, "[not set]", "[non definito]")}`,
    `${L(locale, "Onboarding", "Onboarding")}: ${answers.capture_method || L(locale, "not chosen", "non scelto")}`,
    `${L(locale, "Podcast interest", "Interesse per il podcast")}: ${answers.podcast_interest === "true" ? L(locale, "yes — separate consent", "sì — consenso separato") : L(locale, "not indicated", "non indicato")}`,
    `${L(locale, "Italian-speaking human", "Persona di lingua italiana")}: ${answers.italian_human === "true" ? L(locale, "requested — staffing unconfirmed", "richiesto — organico non confermato") : L(locale, "no", "no")}`,
    L(locale, "Status: proposal for discussion, not a signed contract.", "Stato: proposta di discussione, non un contratto firmato."),
  ];
  return lines.join("\n");
}
