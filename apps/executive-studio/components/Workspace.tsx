"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { AUDIENCES, CONFIG_QUESTIONS, PAINS, discoveryQuestions, type Question } from "@/lib/discovery";
import { copy, tx } from "@/lib/copy";
import { LOCAL_DRAFT_POLICY } from "@/lib/draft";
import { formatEur, quote, usageFromAnswers } from "@/lib/pricing";
import { buildRecommendation } from "@/lib/recommendation/rules";
import type { Recommendation } from "@/lib/recommendation/schema";
import { monthlyVolumeBurden, round1, weeklyBurden } from "@/lib/time";
import { Badge, Shell, api, errorText } from "./common";
import { useRoom } from "./useRoom";

export function Workspace({ id }: { id: string }) {
  const room = useRoom(id);
  const router = useRouter();
  const params = useSearchParams();
  const stage = clamp(Number(params.get("stage") ?? room.consultation?.currentStep ?? 0));
  const { locale, consultation } = room;
  const answers = consultation?.answers ?? {};
  const [showPlans, setShowPlans] = useState(false);
  const [serverNote, setServerNote] = useState("");
  const [model, setModel] = useState<Recommendation | null>(null);
  const [localNote, setLocalNote] = useState("");

  const live = useMemo(() => {
    if (!consultation) return null;
    return buildRecommendation({
      locale,
      category: consultation.category,
      audience: consultation.audience,
      pain: consultation.pain,
      notes: consultation.notes,
      answers,
      plans: room.plans,
      addons: room.addons,
      identityAuthorized: ["likeness", "voice_cloning", "audience_scope", "use_cases", "content_generation", "revocation_acknowledged"].every((kind) => room.granted(kind)),
    });
  }, [consultation, answers, locale, room]);

  const priced = useMemo(
    () => quote(room.plans, room.addons, usageFromAnswers(answers, consultation?.pain ?? "")),
    [answers, consultation?.pain, room.addons, room.plans],
  );

  function go(next: number) {
    const safe = clamp(next);
    room.update("current_step", String(safe));
    router.push(`/c/${id}?stage=${safe}`);
  }

  async function generate(mode: "rules" | "llm") {
    setServerNote("");
    try {
      const result = await api<{ source: string; fallbackReason: string | null; recommendation: Recommendation }>(
        `/api/consultations/${id}/recommendation`,
        { method: "POST", body: JSON.stringify({ mode }) },
      );
      if (result.source === "llm") setModel(result.recommendation);
      setServerNote(result.fallbackReason ? `${tx(locale, copy.solution.fallback)}: ${result.fallbackReason}` : tx(locale, result.source === "llm" ? copy.solution.model : copy.solution.rules));
    } catch (cause) {
      const code = cause instanceof Error && "code" in cause ? String(cause.code) : "server_error";
      setServerNote(errorText(locale, code));
    }
  }

  function saveLocal() {
    if (!consultation) return;
    window.localStorage.setItem(`${LOCAL_DRAFT_POLICY.storageKeyPrefix}${id}`, JSON.stringify(consultation.answers));
    setLocalNote(tx(locale, copy.next.localSaved));
  }

  async function loadLocal() {
    const raw = window.localStorage.getItem(`${LOCAL_DRAFT_POLICY.storageKeyPrefix}${id}`);
    if (!raw) {
      setLocalNote(tx(locale, copy.next.localMissing));
      return;
    }
    const parsed = JSON.parse(raw) as Record<string, string>;
    await room.saveMany(parsed);
    setLocalNote(tx(locale, copy.actions.saved));
  }

  async function copyBrief() {
    if (!live || !consultation) return;
    const exported = await api<{ brief: string }>(`/api/consultations/${id}/export`);
    try {
      await navigator.clipboard.writeText(exported.brief);
      setLocalNote(tx(locale, copy.next.copied));
    } catch {
      setLocalNote(tx(locale, copy.next.copyFailed));
    }
  }

  async function download() {
    const exported = await api<{ brief: string; document: unknown }>(`/api/consultations/${id}/export`);
    const blob = new Blob([JSON.stringify(exported.document, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "myos-consultation.json";
    link.click();
    URL.revokeObjectURL(link.href);
  }

  if (!room.ready) {
    return (
      <Shell locale={locale} setLocale={room.setLocale} session={room.session} orgs={room.orgs}>
        <p>{tx(locale, copy.actions.loading)}</p>
      </Shell>
    );
  }
  if (!consultation || !live) {
    return (
      <Shell locale={locale} setLocale={room.setLocale} session={room.session} orgs={room.orgs}>
        <p className="callout">{room.errorMessage || tx(locale, copy.errors.not_found)}</p>
        <Link className="btn" href="/">{tx(locale, copy.nav.home)}</Link>
      </Shell>
    );
  }

  const frequency = Number(answers.frequency_per_week || 0);
  const minutes = Number(answers.minutes_each || 0);
  const burden = weeklyBurden(Number.isFinite(frequency) ? frequency : 0, Number.isFinite(minutes) ? minutes : 0);
  const clients = Number(answers.client_per_month || 0);
  const clientMinutes = Number(answers.client_duration || 0);
  const clientBurden = clients > 0 && clientMinutes > 0 ? monthlyVolumeBurden(clients, clientMinutes) : null;
  const questions = discoveryQuestions(consultation.pain).filter((question) => question.id !== "solve_for" && question.id !== "problem_narrative");

  return (
    <Shell
      locale={locale}
      setLocale={room.setLocale}
      session={room.session}
      orgs={room.orgs}
      onSwitch={(orgId) => void room.switchOrg(orgId)}
      consultationId={id}
      stage={stage}
      saving={room.saving}
      persistence={room.persistence}
    >
      <section className="stage">
        {stage === 0 ? (
          <>
            <StageHead locale={locale} name="audience" />
            <div className="grid-3">
              {AUDIENCES.map((item) => (
                <button key={item.id} className={`choice ${consultation.audience === item.id ? "selected" : ""}`} onClick={() => room.update("audience", item.id)}>
                  <strong>{item[locale]}</strong>
                </button>
              ))}
            </div>
            <div className="callout" style={{ marginTop: 18 }}>{tx(locale, copy.stages.audience.opening)}</div>
          </>
        ) : null}
        {stage === 1 ? (
          <>
            <StageHead locale={locale} name="friction" />
            <div className="grid-3">
              {PAINS.map((item) => (
                <button key={item.id} className={`choice ${consultation.pain === item.id ? "selected" : ""}`} onClick={() => room.update("pain", item.id)}>
                  <strong>{item[locale]}</strong>
                </button>
              ))}
            </div>
            <div className="fields" style={{ marginTop: 16 }}>
              <Field question={mustQuestion("problem_narrative", consultation.pain)} value={answers.problem_narrative ?? ""} locale={locale} onChange={room.update} />
            </div>
          </>
        ) : null}
        {stage === 2 ? (
          <div className="split">
            <div>
              <StageHead locale={locale} name="reality" />
              <div className="fields">
                {questions.map((question) => (
                  <Field key={question.id} question={question} value={answers[question.id] ?? ""} locale={locale} onChange={room.update} />
                ))}
              </div>
            </div>
            <Insight locale={locale} burden={burden} clientBurden={clientBurden} live={live} value={answers.solve_for ?? consultation.notes} onChange={(value) => room.update("solve_for", value)} />
          </div>
        ) : null}
        {stage === 3 ? (
          <div className="split">
            <div>
              <StageHead locale={locale} name="configure" />
              <div className="fields">
                {CONFIG_QUESTIONS.map((question) => (
                  <Field key={question.id} question={question} value={answers[question.id] ?? ""} locale={locale} onChange={room.update} />
                ))}
              </div>
              <label className="check"><input type="checkbox" checked={answers.italian_human === "true"} onChange={(event) => room.update("italian_human", String(event.target.checked))} />{tx(locale, copy.pricing.italian)}</label>
              <p className="note">{tx(locale, copy.pricing.italianHelp)}</p>
              <label className="check"><input type="checkbox" checked={answers.knowledge_base === "true"} onChange={(event) => room.update("knowledge_base", String(event.target.checked))} />{tx(locale, copy.pricing.knowledge)}</label>
              <label className="check"><input type="checkbox" checked={answers.meeting_integration === "true"} onChange={(event) => room.update("meeting_integration", String(event.target.checked))} />{tx(locale, copy.pricing.meetings)}</label>
              <label className="check"><input type="checkbox" checked={answers.podcast_interest === "true"} onChange={(event) => room.update("podcast_interest", String(event.target.checked))} />{tx(locale, copy.pricing.podcast)}</label>
              <p className="note">{tx(locale, copy.pricing.podcastHelp)}</p>
            </div>
            <PriceCard locale={locale} priced={priced} plans={room.plans} showPlans={showPlans} selected={answers.selected_plan ?? ""} onToggle={() => setShowPlans((value) => !value)} onSelect={(code) => room.update("selected_plan", code)} />
          </div>
        ) : null}
        {stage === 4 ? (
          <>
            <StageHead locale={locale} name="solution" />
            <div className="split">
              <div className="stack">
                <div className="card" style={{ boxShadow: "none" }}>
                  <Badge locale={locale} availability={live.recommended_solution.availability} />
                  <h2>{live.recommended_solution.name}</h2>
                  <p>{live.recommended_solution.summary}</p>
                  <p>{live.problem_summary}</p>
                </div>
                <div>
                  <h3>{tx(locale, copy.solution.features)}</h3>
                  <div className="row">
                    {live.recommended_features.map((feature) => (
                      <span key={feature.name} className="row"><Badge locale={locale} availability={feature.availability} /> {feature.name}</span>
                    ))}
                  </div>
                </div>
                <div className="card" style={{ boxShadow: "none" }}>
                  <div className="kicker">{tx(locale, copy.solution.plan)}</div>
                  {live.recommended_plan ? (
                    <>
                      <div className="price">{formatEur(Math.round((live.recommended_plan.monthly_eur ?? 0) * 100), locale)} <small>/ {locale === "it" ? "mese" : "month"}</small></div>
                      <p>{live.recommended_plan.name} · {tx(locale, copy.pricing.setup)} {formatEur(Math.round((live.recommended_plan.setup_eur ?? 0) * 100), locale)}</p>
                      <p className="note">{live.recommended_plan.reason}</p>
                    </>
                  ) : <p>{tx(locale, copy.solution.none)}</p>}
                </div>
              </div>
              <div className="stack">
                <Insight locale={locale} burden={burden} clientBurden={clientBurden} live={live} value={answers.solve_for ?? consultation.notes} onChange={(value) => room.update("solve_for", value)} />
                <div className="card" style={{ boxShadow: "none" }}>
                  <strong>{tx(locale, copy.solution.risks)}</strong>
                  <ul>{live.risks.map((risk) => <li key={risk}>{risk}</li>)}</ul>
                  <strong>{tx(locale, copy.solution.missing)}</strong>
                  <ul>{live.missing_information.map((item) => <li key={item}>{item}</li>)}</ul>
                </div>
              </div>
            </div>
            <label className="check">
              <input type="checkbox" checked={room.granted("ai_provider")} onChange={(event) => void room.record("ai_provider", event.target.checked)} />
              {tx(locale, copy.solution.modelNeed)}
            </label>
            <div className="row">
              <button className="btn" onClick={() => void generate("rules")}>{tx(locale, copy.solution.update)}</button>
              <button className="btn ghost" disabled={!room.granted("ai_provider")} onClick={() => void generate("llm")}>{tx(locale, copy.solution.model)}</button>
              <Link className="btn light" href={`/c/${id}/experience`}>{tx(locale, copy.solution.experience)}</Link>
            </div>
            <p className="note">{tx(locale, copy.solution.modelHelp)}</p>
            {serverNote ? <p className="note">{serverNote}</p> : null}
            {model ? (
              <div className="card">
                <div className="kicker">{tx(locale, copy.summary.model)}</div>
                <p>{model.problem_summary}</p>
                <p>{model.recommended_solution.summary}</p>
              </div>
            ) : null}
            <label className="field" style={{ marginTop: 12 }}>
              {tx(locale, copy.solution.question)}
              <textarea value={answers.custom_question ?? ""} onChange={(event) => room.update("custom_question", event.target.value)} />
            </label>
          </>
        ) : null}
        {stage === 5 ? (
          <>
            <StageHead locale={locale} name="next" />
            <label className="field">{tx(locale, copy.next.action)}
              <textarea value={answers.next_step ?? ""} onChange={(event) => room.update("next_step", event.target.value)} />
            </label>
            <label className="check">
              <input type="checkbox" checked={room.granted("meeting_recording")} onChange={(event) => void room.record("meeting_recording", event.target.checked)} />
              {tx(locale, { en: "The customer agrees to recording and transcription of this consultation, for the purpose named in the room.", it: "Il cliente accetta la registrazione e la trascrizione di questa consulenza, per lo scopo indicato in stanza." })}
            </label>
            <label className="check">
              <input type="checkbox" checked={room.granted("ai_provider")} onChange={(event) => void room.record("ai_provider", event.target.checked)} />
              {tx(locale, copy.solution.modelNeed)}
            </label>
            <p className="note">{tx(locale, copy.next.localWarn)}</p>
            <div className="row">
              <button className="btn" onClick={() => void download()}>{tx(locale, copy.next.download)}</button>
              <button className="btn ghost" onClick={() => void copyBrief()}>{tx(locale, copy.next.copy)}</button>
              <button className="btn ghost" onClick={saveLocal}>{tx(locale, copy.next.saveLocal)}</button>
              <button className="btn ghost" onClick={() => void loadLocal()}>{tx(locale, copy.next.loadLocal)}</button>
              <Link className="btn light" href={`/c/${id}/onboarding`}>{tx(locale, copy.next.onboarding)}</Link>
              <Link className="btn light" href={`/c/${id}/summary`}>{tx(locale, copy.next.summary)}</Link>
            </div>
            {localNote ? <p className="note">{localNote}</p> : null}
          </>
        ) : null}
      </section>
      <div className="footer-bar">
        <button className="btn ghost" disabled={stage === 0} onClick={() => go(stage - 1)}>{tx(locale, copy.actions.back)}</button>
        <span className="note">{stage + 1} / 6</span>
        <button className="btn" onClick={() => go(stage === 5 ? 0 : stage + 1)}>{stage === 5 ? tx(locale, copy.actions.restart) : tx(locale, copy.actions.continue)}</button>
      </div>
    </Shell>
  );
}

function StageHead({ locale, name }: { locale: "en" | "it"; name: "audience" | "friction" | "reality" | "configure" | "solution" | "next" }) {
  const block = copy.stages[name];
  return (
    <>
      <div className="kicker">{tx(locale, block.kicker)}</div>
      <h2>{tx(locale, block.title)}</h2>
      <p className="help">{tx(locale, block.help)}</p>
    </>
  );
}

function Field({ question, value, locale, onChange }: { question: Question; value: string; locale: "en" | "it"; onChange: (key: string, value: string) => void }) {
  const wide = question.type === "textarea";
  return (
    <label className={`field ${wide ? "wide" : ""}`}>
      {question.label[locale]}
      {question.type === "select" ? (
        <select value={value} onChange={(event) => onChange(question.id, event.target.value)}>
          <option value="" />
          {question.options?.map((option) => <option key={option.value} value={option.value}>{option.label[locale]}</option>)}
        </select>
      ) : question.type === "textarea" ? (
        <textarea value={value} placeholder={question.placeholder?.[locale]} onChange={(event) => onChange(question.id, event.target.value)} />
      ) : (
        <input type={question.type === "number" ? "number" : "text"} min={0} value={value} placeholder={question.placeholder?.[locale]} onChange={(event) => onChange(question.id, event.target.value)} />
      )}
    </label>
  );
}

function Insight({
  locale,
  burden,
  clientBurden,
  live,
  value,
  onChange,
}: {
  locale: "en" | "it";
  burden: ReturnType<typeof weeklyBurden>;
  clientBurden: ReturnType<typeof monthlyVolumeBurden> | null;
  live: Recommendation;
  value: string;
  onChange: (value: string) => void;
}) {
  const hasWeekly = burden.inputs.frequencyPerWeek > 0 || burden.inputs.minutesEach > 0;
  return (
    <aside className="insight">
      <div className="kicker">{tx(locale, copy.insight.title)}</div>
      {hasWeekly ? (
        <>
          <div className="metric">{round1(burden.monthlyHours)}</div>
          <div className="metric-unit">{tx(locale, copy.insight.monthly)} · {round1(burden.weeklyMinutes)} {tx(locale, copy.insight.weekly)}</div>
          <p className="note">{tx(locale, copy.insight.formula)}</p>
        </>
      ) : <p>{tx(locale, copy.insight.empty)}</p>}
      <p className="note">{tx(locale, copy.insight.disclaimer)}</p>
      {clientBurden ? (
        <p>{tx(locale, copy.insight.clients)}: {round1(clientBurden.monthlyHours)} {tx(locale, copy.insight.monthly)}. {tx(locale, copy.insight.separate)}</p>
      ) : null}
      <label className="field">
        {tx(locale, copy.insight.solve)}
        <textarea value={value} onChange={(event) => onChange(event.target.value)} />
      </label>
      <div className="kicker">{tx(locale, copy.insight.next)}</div>
      <p>{live.next_best_question}</p>
      {live.recommended_plan || live.recommended_solution.availability === "proposal" ? null : <p className="note">{tx(locale, copy.insight.mapping)}</p>}
    </aside>
  );
}

function PriceCard({
  locale,
  priced,
  plans,
  showPlans,
  selected,
  onToggle,
  onSelect,
}: {
  locale: "en" | "it";
  priced: ReturnType<typeof quote>;
  plans: { code: string; name: string; monthlyCents: number; setupCents: number; videos: number; videoMinutes: number; voiceMinutes: number }[];
  showPlans: boolean;
  selected: string;
  onToggle: () => void;
  onSelect: (code: string) => void;
}) {
  return (
    <aside className="insight">
      <div className="kicker">{tx(locale, copy.pricing.indicative)}</div>
      {priced.fit === "insufficient_usage" ? <p>{tx(locale, copy.pricing.enter)}</p> : (
        <>
          <div className="price">{formatEur(priced.recurringCents, locale)} <small>/ {locale === "it" ? "mese" : "month"}</small></div>
          <p>{priced.plan?.name}</p>
          <p>{tx(locale, copy.pricing.setup)} {formatEur(priced.setupCents, locale)}</p>
          <p className="note">{priced.fit === "gated" ? tx(locale, copy.pricing.gated) : priced.fit === "overage" ? tx(locale, copy.pricing.overage) : priced.fit === "needs_quote" ? tx(locale, copy.pricing.needsQuote) : tx(locale, copy.pricing.included)}</p>
        </>
      )}
      <p className="note">{tx(locale, copy.pricing.hypothesis)}</p>
      <div className="stack">
        {priced.lines.map((line) => (
          <div key={line.code}><strong>{line.detail[locale]}</strong><div>{line.cents == null ? "—" : formatEur(line.cents, locale)}</div></div>
        ))}
      </div>
      <button className="btn ghost" type="button" onClick={onToggle}>{showPlans ? tx(locale, copy.pricing.hide) : tx(locale, copy.pricing.compare)}</button>
      {showPlans ? (
        <div className="stack">
          {plans.map((plan) => (
            <div key={plan.code} className="card" style={{ boxShadow: "none", borderColor: selected === plan.code ? "var(--purple)" : undefined }}>
              <strong>{plan.name}</strong>
              <div>{formatEur(plan.monthlyCents, locale)} · {tx(locale, copy.pricing.setup)} {formatEur(plan.setupCents, locale)}</div>
              <div className="note">{plan.videos} {tx(locale, copy.pricing.videos)} · {plan.videoMinutes} {tx(locale, copy.pricing.videoMinutes)} · {plan.voiceMinutes} {tx(locale, copy.pricing.voiceMinutes)}</div>
              <button className="btn small light" type="button" onClick={() => onSelect(plan.code)}>{selected === plan.code ? tx(locale, copy.pricing.selected) : tx(locale, copy.pricing.select)}</button>
            </div>
          ))}
        </div>
      ) : null}
    </aside>
  );
}

function mustQuestion(id: string, pain: string): Question {
  const found = discoveryQuestions(pain).find((question) => question.id === id) ?? CONFIG_QUESTIONS.find((question) => question.id === id);
  if (!found) throw new Error(id);
  return found;
}

function clamp(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(5, value));
}
