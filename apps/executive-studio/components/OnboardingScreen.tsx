"use client";

import { useEffect, useState } from "react";
import { copy, tx } from "@/lib/copy";
import { CONSENT_COPY, IDENTITY_KINDS, IN_PERSON_STEPS, REMOTE_GUIDES, identityAuthorized } from "@/lib/onboarding";
import type { ConsentKind } from "@/lib/types";
import { Shell, api, errorText } from "./common";
import { useRoom } from "./useRoom";

export function OnboardingScreen({ id }: { id: string }) {
  const room = useRoom(id);
  const { locale, consultation } = room;
  const mode = consultation?.answers.capture_method === "remote" ? "remote" : consultation?.answers.capture_method ? "in_person" : "remote";
  const [warn, setWarn] = useState("");
  const [note, setNote] = useState("");
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  const guides = mode === "remote" ? REMOTE_GUIDES : IN_PERSON_STEPS;
  const authorized = identityAuthorized(IDENTITY_KINDS.filter((kind) => room.granted(kind)));

  useEffect(() => {
    if (!running) return undefined;
    const timer = window.setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [running]);

  async function onFile(file: File | undefined, kind: string) {
    if (!file || !consultation) return;
    setWarn("");
    if (!authorized) {
      setWarn(tx(locale, copy.onboarding.blocked));
      return;
    }
    let width: number | null = null;
    let height: number | null = null;
    if (file.type.startsWith("image/")) {
      const bitmap = await createImageBitmap(file);
      width = bitmap.width;
      height = bitmap.height;
      bitmap.close();
      if (width < 2048 || height < 2048) setWarn(tx(locale, copy.onboarding.tooSmall));
    }
    try {
      await api(`/api/consultations/${id}/assets`, {
        method: "POST",
        body: JSON.stringify({ kind, filename: file.name, bytes: file.size, width, height }),
      });
      setNote(tx(locale, copy.onboarding.saved));
    } catch (cause) {
      const code = cause instanceof Error && "code" in cause ? String(cause.code) : "server_error";
      setWarn(errorText(locale, code));
    }
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      await api(`/api/consultations/${id}/onboarding`, {
        method: "POST",
        body: JSON.stringify({
          mode: mode === "remote" ? "remote" : "in_person",
          checklist: { preferences: form.get("preferences"), interview: form.get("interview") },
        }),
      });
      if (String(form.get("source") || "").trim()) {
        await api(`/api/consultations/${id}/sources`, {
          method: "POST",
          body: JSON.stringify({ title: form.get("source"), location: form.get("where"), approved: form.get("approved") === "on" }),
        });
      }
      setNote(tx(locale, copy.onboarding.saved));
    } catch (cause) {
      const code = cause instanceof Error && "code" in cause ? String(cause.code) : "server_error";
      setWarn(errorText(locale, code));
    }
  }

  if (!room.ready || !consultation) {
    return <Shell locale={locale} setLocale={room.setLocale} session={room.session} orgs={room.orgs}><p>{room.errorMessage || tx(locale, copy.actions.loading)}</p></Shell>;
  }
  const clock = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  return (
    <Shell locale={locale} setLocale={room.setLocale} session={room.session} orgs={room.orgs} onSwitch={(orgId) => void room.switchOrg(orgId)} consultationId={id} persistence={room.persistence} saving={room.saving}>
      <div className="kicker">{tx(locale, copy.nav.onboarding)}</div>
      <h1 className="page-title">{tx(locale, copy.onboarding.title)}</h1>
      <p className="help">{tx(locale, copy.onboarding.help)}</p>
      <div className="row">
        <button className={`btn ${mode === "in_person" ? "" : "ghost"}`} type="button" onClick={() => room.update("capture_method", "customer_office")}>{tx(locale, copy.onboarding.inPerson)}</button>
        <button className={`btn ${mode === "remote" ? "" : "ghost"}`} type="button" onClick={() => room.update("capture_method", "remote")}>{tx(locale, copy.onboarding.remote)}</button>
      </div>
      <div className="grid-2" style={{ marginTop: 16 }}>
        {guides.map((guide) => (
          <article key={guide.id} className="card"><h2>{guide.title[locale]}</h2><p>{guide.body[locale]}</p></article>
        ))}
      </div>
      <form className="card stack" style={{ marginTop: 16 }} onSubmit={(event) => void save(event)}>
        <label className="field">{tx(locale, copy.onboarding.preferences)}<textarea name="preferences" defaultValue={consultation.answers.communication_preferences ?? ""} /></label>
        <label className="field">{tx(locale, copy.onboarding.interview)}<textarea name="interview" defaultValue={consultation.answers.executive_interview ?? ""} /></label>
        <div className="fields">
          <label className="field">{tx(locale, copy.onboarding.sourceTitle)}<input name="source" /></label>
          <label className="field">{tx(locale, copy.onboarding.sourceWhere)}<input name="where" /></label>
        </div>
        <label className="check"><input type="checkbox" name="approved" />{tx(locale, copy.onboarding.approved)}</label>
        <h3>{tx(locale, copy.onboarding.where)}</h3>
        {CONSENT_COPY.filter((item) => item.group === "identity" || item.group === "podcast").map((item) => (
          <label key={item.kind} className="check">
            <input type="checkbox" checked={room.granted(item.kind)} onChange={(event) => void room.record(item.kind as ConsentKind, event.target.checked)} />
            {item.label[locale]}
          </label>
        ))}
        <p className="note">{tx(locale, copy.onboarding.fileHelp)}</p>
        <label className="field">{tx(locale, copy.onboarding.file)}
          <input type="file" accept="image/*,video/*" onChange={(event) => void onFile(event.target.files?.[0], "capture")} />
        </label>
        <div className="card" style={{ boxShadow: "none" }}>
          <strong>{tx(locale, copy.onboarding.voice)}</strong>
          <p className="note">{tx(locale, copy.onboarding.voiceHelp)}</p>
          <div className="metric">{clock}</div>
          <p className="note">{tx(locale, copy.onboarding.target)}</p>
          <button className="btn small" type="button" onClick={() => setRunning((value) => !value)}>{running ? tx(locale, copy.onboarding.stopTimer) : tx(locale, copy.onboarding.startTimer)}</button>
        </div>
        {warn ? <p className="callout">{warn}</p> : null}
        {note ? <p className="note">{note}</p> : null}
        <button className="btn" type="submit">{tx(locale, copy.onboarding.save)}</button>
      </form>
    </Shell>
  );
}
