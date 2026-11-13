import type { ConsentKind, Locale } from "./types";

export type GuideBlock = {
  id: string;
  title: { en: string; it: string };
  body: { en: string; it: string };
};

export const IN_PERSON_STEPS: GuideBlock[] = [
  {
    id: "headshots",
    title: { en: "Headshots", it: "Ritratti" },
    body: {
      en: "Capture a set of headshots on site: an unobstructed front-facing face and three-quarter angles, neutral background, even light, no filters, and no other people in frame.",
      it: "Sul posto si scatta una serie di ritratti: volto frontale libero e angolazioni a tre quarti, sfondo neutro, luce uniforme, senza filtri e senza altre persone nell'inquadratura.",
    },
  },
  {
    id: "video",
    title: { en: "Avatar video footage", it: "Riprese video per l'avatar" },
    body: {
      en: "Record avatar footage with a clear face, consistent light, a clean background and natural movement. Confirm the provider's specification before the camera rolls.",
      it: "Si registra il girato per l'avatar con il volto nitido, luce costante, sfondo pulito e movimento naturale. La specifica del fornitore va confermata prima di accendere la camera.",
    },
  },
  {
    id: "voice",
    title: { en: "Voice", it: "Voce" },
    body: {
      en: "Record about 20 minutes of clean speech for a premium clone, in Italian and in English, in a quiet room.",
      it: "Si registrano circa 20 minuti di voce pulita per una clonazione di livello alto, in italiano e in inglese, in una stanza silenziosa.",
    },
  },
  {
    id: "preferences",
    title: { en: "Communication preferences", it: "Preferenze di comunicazione" },
    body: {
      en: "Note tone, topics the executive will not delegate, and the phrases that should stay in their own words.",
      it: "Si annotano il tono, i temi che il dirigente non delega e le frasi che devono restare con le sue parole.",
    },
  },
  {
    id: "interview",
    title: { en: "Executive interview", it: "Intervista al dirigente" },
    body: {
      en: "A short working interview covers the recurring explanations, the boundaries, and the names of the approvers.",
      it: "Una breve intervista di lavoro copre le spiegazioni ricorrenti, i confini e i nomi di chi approva.",
    },
  },
  {
    id: "sources",
    title: { en: "Approved knowledge sources", it: "Fonti di conoscenza approvate" },
    body: {
      en: "List the documents, pages or owners that may be cited. Unapproved material stays out.",
      it: "Si elencano documenti, pagine o responsabili che si possono citare. Il materiale non approvato resta fuori.",
    },
  },
];

export const REMOTE_GUIDES: GuideBlock[] = [
  {
    id: "remote_headshots",
    title: { en: "Headshots", it: "Ritratti" },
    body: {
      en: "Provide images at 2048×2048 pixels or larger. Use a neutral background and even light. Include an unobstructed front-facing face and three-quarter angles. No filters. No other people in the frame.",
      it: "Servono immagini da 2048×2048 pixel o più grandi. Sfondo neutro e luce uniforme. Volto frontale libero e angolazioni a tre quarti. Niente filtri. Nessun'altra persona nell'inquadratura.",
    },
  },
  {
    id: "remote_video",
    title: { en: "Video", it: "Video" },
    body: {
      en: "Record at 1080p or better, in 16:9, with a clear face, consistent light, a clean background and natural movement. Provider-specific requirements must be verified before recording.",
      it: "Si registra a 1080p o superiore, in 16:9, con il volto nitido, luce costante, sfondo pulito e movimento naturale. I requisiti specifici del fornitore vanno verificati prima della registrazione.",
    },
  },
  {
    id: "remote_voice",
    title: { en: "Voice", it: "Voce" },
    body: {
      en: "A guided recording of about 20 minutes of clean speech is the working target for a premium clone, in Italian and in English. The file stays on this device in the preview and is not uploaded.",
      it: "Una registrazione guidata di circa 20 minuti di voce pulita è l'obiettivo di lavoro per una clonazione di livello alto, in italiano e in inglese. Nel preview il file resta su questo dispositivo e non viene caricato.",
    },
  },
];

export type ConsentCopy = {
  kind: ConsentKind;
  group: "session" | "identity" | "podcast";
  label: { en: string; it: string };
};

export const CONSENT_COPY: ConsentCopy[] = [
  {
    kind: "meeting_recording",
    group: "session",
    label: {
      en: "The customer agrees to recording and transcription of this consultation, for the purpose named in the room.",
      it: "Il cliente accetta la registrazione e la trascrizione di questa consulenza, per lo scopo indicato in stanza.",
    },
  },
  {
    kind: "ai_provider",
    group: "session",
    label: {
      en: "The customer permits identifiable answers from this consultation to be sent to an external AI provider.",
      it: "Il cliente consente che le risposte identificabili di questa consulenza siano inviate a un fornitore esterno di IA.",
    },
  },
  {
    kind: "likeness",
    group: "identity",
    label: {
      en: "The executive authorizes capture and use of their likeness for the agreed audiences.",
      it: "Il dirigente autorizza la ripresa e l'uso della propria immagine per i pubblici concordati.",
    },
  },
  {
    kind: "voice_cloning",
    group: "identity",
    label: {
      en: "The executive authorizes a voice clone for the agreed use. No clone is made without this authorization.",
      it: "Il dirigente autorizza una clonazione della voce per l'uso concordato. Senza questa autorizzazione non si realizza alcuna clonazione.",
    },
  },
  {
    kind: "audience_scope",
    group: "identity",
    label: {
      en: "The audiences for the twin are agreed and limited to those named in this consultation.",
      it: "I pubblici del gemello sono concordati e limitati a quelli indicati in questa consulenza.",
    },
  },
  {
    kind: "use_cases",
    group: "identity",
    label: {
      en: "The use cases are limited to the ones written down in this consultation.",
      it: "I casi d'uso sono limitati a quelli scritti in questa consulenza.",
    },
  },
  {
    kind: "content_generation",
    group: "identity",
    label: {
      en: "The executive authorizes generation of content with the approved likeness and voice, inside those use cases.",
      it: "Il dirigente autorizza la generazione di contenuti con immagine e voce approvate, dentro quei casi d'uso.",
    },
  },
  {
    kind: "revocation_acknowledged",
    group: "identity",
    label: {
      en: "The executive can revoke authorization and request deletion. Revocation stops further generation; it does not by itself erase copies already published by the customer.",
      it: "Il dirigente può revocare l'autorizzazione e chiedere la cancellazione. La revoca ferma le generazioni successive; non cancella da sola le copie che il cliente ha già pubblicato.",
    },
  },
  {
    kind: "podcast_recording",
    group: "podcast",
    label: {
      en: "Separate consent to record a podcast interview.",
      it: "Consenso separato a registrare un'intervista per il podcast.",
    },
  },
  {
    kind: "podcast_editing",
    group: "podcast",
    label: {
      en: "Separate consent to edit that recording.",
      it: "Consenso separato a montare quella registrazione.",
    },
  },
  {
    kind: "podcast_publication",
    group: "podcast",
    label: {
      en: "Separate consent to publish the episode.",
      it: "Consenso separato a pubblicare la puntata.",
    },
  },
  {
    kind: "podcast_distribution",
    group: "podcast",
    label: {
      en: "Separate consent to distribute the episode on the channels named with the customer.",
      it: "Consenso separato a distribuire la puntata sui canali indicati con il cliente.",
    },
  },
];

export function textOf(block: { en: string; it: string }, locale: Locale): string {
  return block[locale];
}

export const IDENTITY_KINDS: ConsentKind[] = [
  "likeness",
  "voice_cloning",
  "audience_scope",
  "use_cases",
  "content_generation",
  "revocation_acknowledged",
];

export function identityAuthorized(granted: ConsentKind[]): boolean {
  return IDENTITY_KINDS.every((kind) => granted.includes(kind));
}
