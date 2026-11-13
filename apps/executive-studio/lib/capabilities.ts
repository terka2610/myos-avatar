import type { Availability } from "./types";

export type Capability = {
  id: string;
  name: { en: string; it: string };
  availability: Availability;
  limitation: { en: string; it: string };
};

/** What this studio is allowed to claim. The model and the rules both use this list. */
export const CAPABILITIES: Capability[] = [
  {
    id: "scripted_video",
    name: { en: "Approved script-to-video", it: "Video da script approvato" },
    availability: "proposal",
    limitation: {
      en: "Only consented likeness and voice. Output counts against the generated-minute cap.",
      it: "Solo immagine e voce con consenso. L'output consuma il tetto di minuti generati.",
    },
  },
  {
    id: "web_avatar",
    name: { en: "Branded web avatar", it: "Avatar web con il marchio" },
    availability: "demo_only",
    limitation: {
      en: "The preview in this studio is a sample interface, not the customer's likeness.",
      it: "L'anteprima in questo studio è un'interfaccia di esempio, non l'immagine del cliente.",
    },
  },
  {
    id: "knowledge_answers",
    name: { en: "Answers from approved sources", it: "Risposte da fonti approvate" },
    availability: "proposal",
    limitation: {
      en: "The twin does not invent executive decisions. Gaps are escalated to a person.",
      it: "Il gemello non inventa decisioni della direzione. I vuoti si escalano a una persona.",
    },
  },
  {
    id: "human_handoff",
    name: { en: "Human handoff", it: "Passaggio a una persona" },
    availability: "configurable",
    limitation: {
      en: "A named owner still has to accept the handoff. The product does not replace that person.",
      it: "Un responsabile nominato deve accettare il passaggio. Il prodotto non sostituisce quella persona.",
    },
  },
  {
    id: "voice_clone",
    name: { en: "Voice cloning", it: "Clonazione della voce" },
    availability: "requires_consent",
    limitation: {
      en: "No voice is cloned without explicit authorization. Provider requirements must be checked before recording.",
      it: "Nessuna voce si clona senza autorizzazione esplicita. I requisiti del fornitore vanno verificati prima della registrazione.",
    },
  },
  {
    id: "likeness",
    name: { en: "Likeness capture", it: "Ripresa dell'immagine" },
    availability: "requires_consent",
    limitation: {
      en: "No synthetic identity is created without authorization for the likeness, the audience and the use.",
      it: "Nessuna identità sintetica si crea senza autorizzazione su immagine, pubblico e uso.",
    },
  },
  {
    id: "italian_human",
    name: { en: "Italian-speaking human support", it: "Supporto umano in italiano" },
    availability: "subject_to_staffing",
    limitation: {
      en: "Subject to actual staffing. It is not confirmed by selecting the checkbox.",
      it: "Dipende dalla disponibilità reale delle persone. La casella non lo conferma.",
    },
  },
  {
    id: "zoom_bot",
    name: { en: "Zoom meeting avatar", it: "Avatar in riunione Zoom" },
    availability: "not_operational",
    limitation: {
      en: "No Zoom integration is connected. A feasibility review comes first.",
      it: "Nessuna integrazione Zoom è collegata. Prima serve una verifica di fattibilità.",
    },
  },
  {
    id: "teams_bot",
    name: { en: "Teams meeting avatar", it: "Avatar in riunione Teams" },
    availability: "not_operational",
    limitation: {
      en: "No Teams integration is connected. A feasibility review comes first.",
      it: "Nessuna integrazione Teams è collegata. Prima serve una verifica di fattibilità.",
    },
  },
  {
    id: "meeting_participation",
    name: { en: "Autonomous meeting participation", it: "Partecipazione autonoma alle riunioni" },
    availability: "not_operational",
    limitation: {
      en: "Answering, summarizing or deciding inside a live meeting is not an available product. Decisions stay with a person.",
      it: "Rispondere, riassumere o decidere dentro una riunione dal vivo non è un prodotto disponibile. Le decisioni restano a una persona.",
    },
  },
  {
    id: "crm_write",
    name: { en: "CRM or system write-back", it: "Scrittura su CRM o sistema" },
    availability: "not_operational",
    limitation: {
      en: "No CRM connector is live. The customer can name the system; delivery is a separate project.",
      it: "Nessun connettore CRM è attivo. Il cliente può indicare il sistema; la consegna è un progetto a parte.",
    },
  },
  {
    id: "holographic",
    name: { en: "Holographic reception", it: "Reception olografica" },
    availability: "not_operational",
    limitation: {
      en: "Hardware, site survey and a physical quote are separate. The subscription does not include a hologram.",
      it: "Hardware, sopralluogo e preventivo fisico sono a parte. L'abbonamento non include un ologramma.",
    },
  },
  {
    id: "kiosk_screen",
    name: { en: "Reception screen concept", it: "Concept di schermo in reception" },
    availability: "demo_only",
    limitation: {
      en: "The kiosk mockup is an interactive demo. It is not installed equipment.",
      it: "Il mockup del chiosco è una demo interattiva. Non è un'apparecchiatura installata.",
    },
  },
  {
    id: "podcast",
    name: { en: "CEO podcast", it: "Podcast del CEO" },
    availability: "requires_consent",
    limitation: {
      en: "Recording, editing, publication and distribution each need their own consent.",
      it: "Registrazione, montaggio, pubblicazione e distribuzione richiedono ciascuno un consenso proprio.",
    },
  },
  {
    id: "usage_metrics",
    name: { en: "Twin usage monitoring", it: "Monitoraggio d'uso del gemello" },
    availability: "not_operational",
    limitation: {
      en: "Conversation, video, meeting, escalation and cost metrics are not instrumented yet. The dashboard does not invent them.",
      it: "Conversazioni, video, riunioni, escalation e costi non sono ancora strumentati. La dashboard non li inventa.",
    },
  },
];

export function capability(id: string): Capability {
  const found = CAPABILITIES.find((item) => item.id === id);
  if (!found) throw new Error(`Unknown capability ${id}`);
  return found;
}
