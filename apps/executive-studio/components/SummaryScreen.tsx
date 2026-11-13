"use client";

import { useEffect, useState } from "react";
import { AUDIENCES, PAINS } from "@/lib/discovery";
import { copy, tx } from "@/lib/copy";
import { formatEur } from "@/lib/pricing";
import type { Recommendation } from "@/lib/recommendation/schema";
import { round1, weeklyBurden } from "@/lib/time";
import type { Consultation, StoredEvent } from "@/lib/types";
import { Badge, Shell, api } from "./common";
import { useRoom } from "./useRoom";

type ExportBody = {
  brief: string;
  document: {
    consultation: Consultation;
    recommendation: Recommendation;
    modelDraft: Recommendation | null;
    quote: { recurringCents: number; setupCents: number; videoMinutesNeeded: number };
  };
};

export function SummaryScreen({ id }: { id: string }) {
  const room = useRoom(id);
  const { locale } = room;
  const [data, setData] = useState<ExportBody | null>(null);
  const [events, setEvents] = useState<StoredEvent[]>([]);
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!room.consultation) return;
    void api<ExportBody>(`/api/consultations/${id}/export`).then(setData).catch(() => undefined);
    void api<{ events: StoredEvent[] }>(`/api/consultations/${id}/events`).then((result) => setEvents(result.events)).catch(() => undefined);
  }, [id, room.consultation]);

  if (!room.ready || !room.consultation || !data) {
    return <Shell locale={locale} setLocale={room.setLocale} session={room.session} orgs={room.orgs}><p>{room.errorMessage || tx(locale, copy.actions.loading)}</p></Shell>;
  }
  const recommendation = data.document.recommendation;
  const answers = data.document.consultation.answers;
  const frequency = Number(answers.frequency_per_week || 0);
  const minutes = Number(answers.minutes_each || 0);
  const burden = weeklyBurden(frequency, minutes);
  const audience = AUDIENCES.find((item) => item.id === data.document.consultation.audience)?.[locale] ?? tx(locale, copy.summary.empty);
  const pain = PAINS.find((item) => item.id === data.document.consultation.pain)?.[locale] ?? tx(locale, copy.summary.empty);

  return (
    <Shell locale={locale} setLocale={room.setLocale} session={room.session} orgs={room.orgs} onSwitch={(orgId) => void room.switchOrg(orgId)} consultationId={id} persistence={room.persistence} saving={room.saving}>
      <div className="kicker">{tx(locale, copy.nav.summary)}</div>
      <h1 className="page-title">{tx(locale, copy.summary.title)}</h1>
      <p className="help">{tx(locale, copy.summary.help)}</p>
      <div className="grid-2">
        <article className="card"><h2>{tx(locale, copy.summary.pain)}</h2><p>{pain}</p><p>{answers.problem_narrative || tx(locale, copy.summary.empty)}</p><p className="note">{audience}</p></article>
        <article className="card"><h2>{tx(locale, copy.summary.workflow)}</h2><p>{answers.current_handling || tx(locale, copy.summary.empty)}</p><p className="note">{answers.owner}</p></article>
        <article className="card"><h2>{tx(locale, copy.summary.burden)}</h2><div className="metric">{round1(burden.monthlyHours)}</div><p>{tx(locale, copy.insight.disclaimer)}</p><p className="note">{tx(locale, copy.insight.formula)}</p></article>
        <article className="card"><h2>{tx(locale, copy.summary.direction)}</h2><Badge locale={locale} availability={recommendation.recommended_solution.availability} /><p>{recommendation.recommended_solution.name}</p><p>{recommendation.recommended_solution.summary}</p></article>
        <article className="card"><h2>{tx(locale, copy.summary.features)}</h2><ul>{recommendation.recommended_features.map((feature) => <li key={feature.name}>{feature.name} · {tx(locale, copy.badges[feature.availability])}</li>)}</ul></article>
        <article className="card"><h2>{tx(locale, copy.summary.usage)}</h2><p>{answers.videos_per_month || 0} {tx(locale, copy.pricing.videos)} · {data.document.quote.videoMinutesNeeded} {tx(locale, copy.pricing.videoMinutes)} · {answers.voice_minutes || 0} {tx(locale, copy.pricing.voiceMinutes)}</p></article>
        <article className="card"><h2>{tx(locale, copy.summary.subscription)}</h2>{recommendation.recommended_plan ? <p>{recommendation.recommended_plan.name} · {formatEur(data.document.quote.recurringCents, locale)} · {tx(locale, copy.pricing.setup)} {formatEur(data.document.quote.setupCents, locale)}</p> : <p>{tx(locale, copy.solution.none)}</p>}</article>
        <article className="card"><h2>{tx(locale, copy.summary.setup)}</h2><ul>{recommendation.technical_dependencies.map((item) => <li key={item}>{item}</li>)}</ul></article>
        <article className="card"><h2>{tx(locale, copy.summary.open)}</h2><ul>{recommendation.missing_information.map((item) => <li key={item}>{item}</li>)}</ul></article>
        <article className="card"><h2>{tx(locale, copy.summary.steps)}</h2><ul>{recommendation.follow_up_actions.map((item) => <li key={item}>{item}</li>)}</ul><p>{answers.next_step}</p></article>
      </div>
      {data.document.modelDraft ? <article className="card"><h2>{tx(locale, copy.summary.model)}</h2><p>{data.document.modelDraft.problem_summary}</p></article> : null}
      <div className="row" style={{ marginTop: 16 }}>
        <button className="btn" type="button" onClick={() => void api(`/api/consultations/${id}/proposal`, { method: "POST" }).then(() => setNote(tx(locale, copy.summary.saved)))}>{tx(locale, copy.summary.save)}</button>
      </div>
      {note ? <p className="note">{note}</p> : null}
      <h2>{tx(locale, copy.summary.timeline)}</h2>
      <div className="timeline">
        {events.length === 0 ? <p>{tx(locale, copy.summary.empty)}</p> : events.map((event) => (
          <article key={event.id}><strong>{event.type}</strong><div className="note">{event.createdAt}</div><div>{JSON.stringify(event.payload)}</div></article>
        ))}
      </div>
      <pre className="summary-pre">{data.brief}</pre>
    </Shell>
  );
}
