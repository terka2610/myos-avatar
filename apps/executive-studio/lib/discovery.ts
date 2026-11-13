import type { Locale } from "./types";

export type QuestionType = "text" | "textarea" | "number" | "select" | "boolean";

export type Question = {
  id: string;
  branch: "common" | "meetings" | "client_onboarding" | "video" | "employee_onboarding" | "knowledge" | "multilingual" | "kiosk" | "executive_communication" | "configure";
  type: QuestionType;
  required: boolean;
  label: { en: string; it: string };
  placeholder?: { en: string; it: string };
  options?: { value: string; label: { en: string; it: string } }[];
};

const common: Question[] = [
  {
    id: "problem_narrative",
    branch: "common",
    type: "textarea",
    required: true,
    label: {
      en: "What is the problem, in the customer's words?",
      it: "Qual è il problema, con le parole del cliente?",
    },
    placeholder: {
      en: "What happened the last time this came up?",
      it: "Che cosa è successo l'ultima volta che si è presentato?",
    },
  },
  {
    id: "last_example",
    branch: "common",
    type: "textarea",
    required: true,
    label: {
      en: "What happened the last time?",
      it: "Che cosa è successo l'ultima volta?",
    },
    placeholder: {
      en: "Only what the customer actually described.",
      it: "Solo ciò che il cliente ha descritto davvero.",
    },
  },
  {
    id: "frequency_per_week",
    branch: "common",
    type: "number",
    required: true,
    label: {
      en: "How many times a week does this happen?",
      it: "Quante volte a settimana accade?",
    },
  },
  {
    id: "minutes_each",
    branch: "common",
    type: "number",
    required: true,
    label: {
      en: "How many minutes does each occurrence take?",
      it: "Quanti minuti richiede ogni occorrenza?",
    },
  },
  {
    id: "consequence",
    branch: "common",
    type: "textarea",
    required: true,
    label: {
      en: "What happens when this person is unavailable?",
      it: "Che cosa succede quando questa persona non è disponibile?",
    },
  },
  {
    id: "current_handling",
    branch: "common",
    type: "textarea",
    required: true,
    label: {
      en: "How is it handled today?",
      it: "Come viene gestito oggi?",
    },
  },
  {
    id: "owner",
    branch: "common",
    type: "text",
    required: true,
    label: {
      en: "Who owns the work today?",
      it: "Chi ne è responsabile oggi?",
    },
  },
  {
    id: "already_tried",
    branch: "common",
    type: "textarea",
    required: true,
    label: {
      en: "What has already been tried?",
      it: "Che cosa è già stato provato?",
    },
  },
  {
    id: "pay_justification",
    branch: "common",
    type: "textarea",
    required: true,
    label: {
      en: "What would justify paying for a change?",
      it: "Che cosa giustificherebbe la spesa per un cambiamento?",
    },
  },
  {
    id: "purchase_approver",
    branch: "common",
    type: "text",
    required: true,
    label: {
      en: "Who approves the purchase?",
      it: "Chi approva l'acquisto?",
    },
  },
  {
    id: "pilot_success",
    branch: "common",
    type: "textarea",
    required: true,
    label: {
      en: "What would a successful pilot show?",
      it: "Che cosa dovrebbe dimostrare un pilota riuscito?",
    },
  },
  {
    id: "solve_for",
    branch: "common",
    type: "textarea",
    required: true,
    label: {
      en: "What are we trying to solve for this customer?",
      it: "Che cosa stiamo cercando di risolvere per questo cliente?",
    },
    placeholder: {
      en: "A working note for the room. It is not treated as something the customer said.",
      it: "Una nota di lavoro per la stanza. Non viene trattata come una frase del cliente.",
    },
  },
];

const meetings: Question[] = [
  {
    id: "meeting_which",
    branch: "meetings",
    type: "textarea",
    required: true,
    label: { en: "Which meetings repeat?", it: "Quali riunioni si ripetono?" },
  },
  {
    id: "meeting_attendees",
    branch: "meetings",
    type: "text",
    required: true,
    label: { en: "Who attends?", it: "Chi partecipa?" },
  },
  {
    id: "meeting_weekly_count",
    branch: "meetings",
    type: "number",
    required: true,
    label: { en: "How many of these meetings happen each week?", it: "Quante di queste riunioni ci sono ogni settimana?" },
  },
  {
    id: "meeting_predictable_questions",
    branch: "meetings",
    type: "textarea",
    required: true,
    label: { en: "Which questions are predictable?", it: "Quali domande sono prevedibili?" },
  },
  {
    id: "meeting_avatar_needs",
    branch: "meetings",
    type: "textarea",
    required: true,
    label: { en: "What information would an avatar need?", it: "Di quali informazioni avrebbe bisogno un avatar?" },
  },
  {
    id: "meeting_platform",
    branch: "meetings",
    type: "select",
    required: true,
    label: { en: "Where do the meetings run?", it: "Dove si svolgono le riunioni?" },
    options: [
      { value: "zoom", label: { en: "Zoom", it: "Zoom" } },
      { value: "teams", label: { en: "Microsoft Teams", it: "Microsoft Teams" } },
      { value: "other", label: { en: "Another platform", it: "Un'altra piattaforma" } },
    ],
  },
  {
    id: "meeting_goal",
    branch: "meetings",
    type: "select",
    required: true,
    label: { en: "What should the avatar do?", it: "Che cosa dovrebbe fare l'avatar?" },
    options: [
      { value: "answer", label: { en: "Answer predictable questions", it: "Rispondere a domande prevedibili" } },
      { value: "summarize", label: { en: "Summarize", it: "Riassumere" } },
      { value: "participate", label: { en: "Participate in the meeting", it: "Partecipare alla riunione" } },
    ],
  },
  {
    id: "meeting_stay_human",
    branch: "meetings",
    type: "textarea",
    required: true,
    label: { en: "What must always stay with a person?", it: "Che cosa deve restare sempre a una persona?" },
  },
];

const clientOnboarding: Question[] = [
  {
    id: "client_per_month",
    branch: "client_onboarding",
    type: "number",
    required: true,
    label: { en: "How many clients start each month?", it: "Quanti clienti iniziano ogni mese?" },
  },
  {
    id: "client_repeated_requests",
    branch: "client_onboarding",
    type: "textarea",
    required: true,
    label: { en: "Which requests repeat?", it: "Quali richieste si ripetono?" },
  },
  {
    id: "client_duration",
    branch: "client_onboarding",
    type: "number",
    required: true,
    label: { en: "How many minutes does one onboarding take?", it: "Quanti minuti richiede un onboarding?" },
  },
  {
    id: "client_senior_steps",
    branch: "client_onboarding",
    type: "textarea",
    required: true,
    label: { en: "Which steps still need a senior leader?", it: "Quali passaggi richiedono ancora un senior?" },
  },
  {
    id: "client_auto_collect",
    branch: "client_onboarding",
    type: "textarea",
    required: true,
    label: { en: "What could be collected automatically?", it: "Che cosa si potrebbe raccogliere in automatico?" },
  },
  {
    id: "client_crm",
    branch: "client_onboarding",
    type: "text",
    required: true,
    label: { en: "Which CRM or system should receive the data?", it: "Quale CRM o sistema dovrebbe ricevere i dati?" },
  },
  {
    id: "client_human_share",
    branch: "client_onboarding",
    type: "text",
    required: true,
    label: { en: "What share still needs a person?", it: "Quale parte richiede ancora una persona?" },
  },
];

const video: Question[] = [
  {
    id: "video_volume",
    branch: "video",
    type: "number",
    required: true,
    label: { en: "How many videos are produced today, per month?", it: "Quanti video si producono oggi, al mese?" },
  },
  {
    id: "video_length",
    branch: "video",
    type: "text",
    required: true,
    label: { en: "What is the typical length?", it: "Qual è la durata tipica?" },
  },
  {
    id: "video_script_owner",
    branch: "video",
    type: "text",
    required: true,
    label: { en: "Who writes the scripts?", it: "Chi scrive gli script?" },
  },
  {
    id: "video_approver",
    branch: "video",
    type: "text",
    required: true,
    label: { en: "Who approves them?", it: "Chi li approva?" },
  },
  {
    id: "video_languages",
    branch: "video",
    type: "text",
    required: true,
    label: { en: "Which languages are required?", it: "Quali lingue servono?" },
  },
  {
    id: "video_cost",
    branch: "video",
    type: "text",
    required: true,
    label: { en: "What does one video cost today?", it: "Quanto costa oggi un video?" },
  },
  {
    id: "video_production_time",
    branch: "video",
    type: "text",
    required: true,
    label: { en: "How long does production take?", it: "Quanto tempo richiede la produzione?" },
  },
  {
    id: "video_channels",
    branch: "video",
    type: "textarea",
    required: true,
    label: { en: "Where are the videos published?", it: "Dove vengono pubblicati i video?" },
  },
];

const employee: Question[] = [
  {
    id: "employee_joiners",
    branch: "employee_onboarding",
    type: "number",
    required: true,
    label: { en: "How many people join each month?", it: "Quante persone entrano ogni mese?" },
  },
  {
    id: "employee_repeated",
    branch: "employee_onboarding",
    type: "textarea",
    required: true,
    label: { en: "Which leadership explanations repeat?", it: "Quali spiegazioni della leadership si ripetono?" },
  },
  {
    id: "employee_knowledge_location",
    branch: "employee_onboarding",
    type: "textarea",
    required: true,
    label: { en: "Where does that knowledge live today?", it: "Dove vive oggi quella conoscenza?" },
  },
  {
    id: "employee_escalation",
    branch: "employee_onboarding",
    type: "textarea",
    required: true,
    label: { en: "Which questions must be escalated?", it: "Quali domande vanno escalate?" },
  },
  {
    id: "employee_access",
    branch: "employee_onboarding",
    type: "textarea",
    required: true,
    label: { en: "Who should be allowed to ask, and who should not?", it: "Chi deve poter chiedere, e chi no?" },
  },
];

const knowledge: Question[] = [
  {
    id: "knowledge_sources",
    branch: "knowledge",
    type: "textarea",
    required: true,
    label: { en: "Which sources are approved for answers?", it: "Quali fonti sono approvate per le risposte?" },
  },
  {
    id: "knowledge_approver",
    branch: "knowledge",
    type: "text",
    required: true,
    label: { en: "Who approves what the twin may say?", it: "Chi approva ciò che il gemello può dire?" },
  },
  {
    id: "knowledge_must_not_answer",
    branch: "knowledge",
    type: "textarea",
    required: true,
    label: { en: "What must the twin never answer?", it: "A che cosa il gemello non deve mai rispondere?" },
  },
];

const multilingual: Question[] = [
  {
    id: "multi_languages",
    branch: "multilingual",
    type: "text",
    required: true,
    label: { en: "Which languages have to be covered?", it: "Quali lingue vanno coperte?" },
  },
  {
    id: "multi_who_translates",
    branch: "multilingual",
    type: "text",
    required: true,
    label: { en: "Who translates or reviews today?", it: "Chi traduce o revisiona oggi?" },
  },
  {
    id: "multi_volume",
    branch: "multilingual",
    type: "text",
    required: true,
    label: { en: "How much content moves between languages each month?", it: "Quanto contenuto passa da una lingua all'altra ogni mese?" },
  },
];

const kiosk: Question[] = [
  {
    id: "reception_location",
    branch: "kiosk",
    type: "text",
    required: true,
    label: { en: "Which site or event is this for?", it: "Per quale sede o evento?" },
  },
  {
    id: "reception_visitor_needs",
    branch: "kiosk",
    type: "textarea",
    required: true,
    label: { en: "What do visitors need when they arrive?", it: "Di che cosa hanno bisogno i visitatori all'arrivo?" },
  },
  {
    id: "reception_hardware",
    branch: "kiosk",
    type: "textarea",
    required: true,
    label: { en: "What display or hardware is already there?", it: "Quale schermo o hardware è già presente?" },
  },
  {
    id: "reception_handoff",
    branch: "kiosk",
    type: "textarea",
    required: true,
    label: { en: "When must a person take over?", it: "Quando deve subentrare una persona?" },
  },
];

const executive: Question[] = [
  {
    id: "exec_audience",
    branch: "executive_communication",
    type: "text",
    required: true,
    label: { en: "Who is the audience for these communications?", it: "Chi è il pubblico di queste comunicazioni?" },
  },
  {
    id: "exec_cadence",
    branch: "executive_communication",
    type: "text",
    required: true,
    label: { en: "How often does this communication go out?", it: "Con quale cadenza esce questa comunicazione?" },
  },
  {
    id: "exec_approval",
    branch: "executive_communication",
    type: "text",
    required: true,
    label: { en: "Who must approve it before it is sent?", it: "Chi deve approvarla prima dell'invio?" },
  },
];

export const CONFIG_QUESTIONS: Question[] = [
  { id: "videos_per_month", branch: "configure", type: "number", required: false, label: { en: "Finished videos per month", it: "Video finiti al mese" } },
  { id: "average_video_seconds", branch: "configure", type: "number", required: false, label: { en: "Average video length (seconds)", it: "Durata media del video (secondi)" } },
  { id: "total_video_minutes", branch: "configure", type: "number", required: false, label: { en: "Total generated video minutes", it: "Minuti video generati in totale" } },
  { id: "max_video_seconds", branch: "configure", type: "number", required: false, label: { en: "Maximum video duration (seconds)", it: "Durata massima del video (secondi)" } },
  { id: "voice_minutes", branch: "configure", type: "number", required: false, label: { en: "Conversational voice minutes", it: "Minuti di voce conversazionale" } },
  { id: "live_video_minutes", branch: "configure", type: "number", required: false, label: { en: "Live video minutes, tracked separately", it: "Minuti di video live, conteggiati a parte" } },
  { id: "avatar_count", branch: "configure", type: "number", required: false, label: { en: "Number of avatars", it: "Numero di avatar" } },
  { id: "languages", branch: "configure", type: "text", required: false, label: { en: "Languages", it: "Lingue" } },
  {
    id: "capture_method",
    branch: "configure",
    type: "select",
    required: false,
    label: { en: "Onboarding method", it: "Modalità di onboarding" },
    options: [
      { value: "remote", label: { en: "Remote secure upload", it: "Caricamento sicuro da remoto" } },
      { value: "customer_office", label: { en: "In person, at the customer's office", it: "Di persona, nell'ufficio del cliente" } },
      { value: "myos_studio", label: { en: "In person, at a MyOS studio (venue to confirm)", it: "Di persona, in uno studio MyOS (sede da confermare)" } },
    ],
  },
];

const BRANCHES: Record<string, Question[]> = {
  meetings,
  client_onboarding: clientOnboarding,
  video,
  employee_onboarding: employee,
  knowledge,
  multilingual,
  kiosk,
  executive_communication: executive,
};

export function branchQuestions(pain: string): Question[] {
  return BRANCHES[pain] ?? [];
}

export function discoveryQuestions(pain: string): Question[] {
  return [...common, ...branchQuestions(pain)];
}

export function questionById(id: string, pain = ""): Question | undefined {
  return [...common, ...Object.values(BRANCHES).flat(), ...CONFIG_QUESTIONS].find((item) => item.id === id && (item.branch === "common" || item.branch === "configure" || item.branch === pain || pain === ""));
}

export function allQuestions(): Question[] {
  return [...common, ...Object.values(BRANCHES).flat(), ...CONFIG_QUESTIONS];
}

export function isAnswered(value: string | undefined): boolean {
  return value != null && value.trim() !== "";
}

export function nextUnanswered(pain: string, answers: Record<string, string>, locale: Locale): { id: string; question: string } | null {
  const list = discoveryQuestions(pain).filter((item) => item.required);
  const pending = list.find((item) => !isAnswered(answers[item.id]));
  if (!pending) return null;
  return { id: pending.id, question: pending.label[locale] };
}

export const AUDIENCES = [
  { id: "employees", en: "Employees and the team", it: "Dipendenti e team" },
  { id: "new_hires", en: "New employees", it: "Nuove persone in ingresso" },
  { id: "clients", en: "New clients", it: "Nuovi clienti" },
  { id: "prospects", en: "Prospects and buyers", it: "Prospect e acquirenti" },
  { id: "visitors", en: "Visitors and events", it: "Visitatori ed eventi" },
  { id: "other", en: "Another audience", it: "Un altro pubblico" },
] as const;

export const PAINS = [
  { id: "video", en: "Content takes too long", it: "I contenuti richiedono troppo tempo" },
  { id: "employee_onboarding", en: "Employee onboarding is slow", it: "L'onboarding dei dipendenti è lento" },
  { id: "client_onboarding", en: "Client onboarding is slow", it: "L'onboarding dei clienti è lento" },
  { id: "meetings", en: "The same meetings keep repeating", it: "Le stesse riunioni si ripetono" },
  { id: "knowledge", en: "Company knowledge is asked again and again", it: "La conoscenza aziendale viene richiesta di continuo" },
  { id: "executive_communication", en: "Executive communication is hard to sustain", it: "La comunicazione della direzione è difficile da sostenere" },
  { id: "multilingual", en: "Multilingual support does not scale", it: "Il supporto multilingue non scala" },
  { id: "kiosk", en: "Reception and events need a presence", it: "Reception ed eventi hanno bisogno di una presenza" },
  { id: "other", en: "Something else", it: "Altro" },
] as const;

export const CATEGORIES = [
  {
    id: "video_studio",
    pain: "video",
    en: "AI Video Studio",
    it: "AI Video Studio",
    blurb: {
      en: "Approved executive updates, from script to picture, inside a minute cap.",
      it: "Aggiornamenti della direzione già approvati, dallo script al video, dentro un tetto di minuti.",
    },
  },
  {
    id: "meeting_avatar",
    pain: "meetings",
    en: "Conversational Meeting Avatar",
    it: "Avatar per riunioni conversazionali",
    blurb: {
      en: "Map the repeating meeting before anyone talks about a bot.",
      it: "Si mappa la riunione che si ripete, prima di parlare di un bot.",
    },
  },
  {
    id: "knowledge_twin",
    pain: "knowledge",
    en: "Knowledge-Based Digital Twin",
    it: "Gemello digitale basato sulla conoscenza",
    blurb: {
      en: "Let people ask the recurring questions, with sources and a human escalation.",
      it: "Le persone pongono le domande ricorrenti, con le fonti e un'escalation umana.",
    },
  },
  {
    id: "front_desk",
    pain: "kiosk",
    en: "Front Desk / Holographic Experience",
    it: "Reception / esperienza olografica",
    blurb: {
      en: "A disclosed welcome for a lobby or an event. Hardware is a separate quote.",
      it: "Un benvenuto dichiarato per una lobby o un evento. L'hardware è un preventivo a parte.",
    },
  },
] as const;
