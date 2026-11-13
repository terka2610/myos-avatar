"use client";

import { useState } from "react";
import { copy, tx } from "@/lib/copy";
import { Badge, Shell } from "./common";
import { useRoom } from "./useRoom";

export function Experience({ id }: { id: string }) {
  const room = useRoom(id);
  const { locale } = room;
  const [play, setPlay] = useState(false);
  const [chat, setChat] = useState(false);
  const [step, setStep] = useState(0);
  if (!room.ready || !room.consultation) {
    return <Shell locale={locale} setLocale={room.setLocale} session={room.session} orgs={room.orgs}><p>{room.errorMessage || tx(locale, copy.actions.loading)}</p></Shell>;
  }
  return (
    <Shell locale={locale} setLocale={room.setLocale} session={room.session} orgs={room.orgs} onSwitch={(orgId) => void room.switchOrg(orgId)} consultationId={id} persistence={room.persistence} saving={room.saving}>
      <div className="kicker">{tx(locale, copy.nav.experience)}</div>
      <h1 className="page-title">{tx(locale, copy.experience.title)}</h1>
      <p className="help">{tx(locale, copy.experience.help)}</p>
      <div className="grid-3">
        <article className="card device">
          <div className="device-bar"><i className="dot" /><i className="dot" /><span>{tx(locale, copy.experience.items.video)}</span><Badge locale={locale} availability="demo_only" /></div>
          <div className="screen">
            <div className="video-frame">
              <div className="silhouette" aria-hidden><div className="head" /><div className="shoulders" /></div>
              <button className="play" type="button" onClick={() => setPlay((value) => !value)} aria-label={tx(locale, play ? copy.experience.pause : copy.experience.play)}>{play ? "II" : "▶"}</button>
              <div className={`progress ${play ? "playing" : ""}`}><span /></div>
            </div>
            <p className="note">{tx(locale, copy.mock.caption)} · {tx(locale, copy.solution.sample)}</p>
          </div>
        </article>
        <article className="card device">
          <div className="device-bar"><i className="dot" /><span>{tx(locale, copy.experience.items.employee)}</span><Badge locale={locale} availability="demo_only" /></div>
          <div className="screen">
            <div className="bubble">{tx(locale, copy.mock.employeeAsk)}</div>
            {chat ? <div className="bubble twin">{tx(locale, copy.mock.employeeReply)}<div className="note">{tx(locale, copy.mock.source)}</div></div> : null}
            <button className="btn small" type="button" onClick={() => setChat(true)}>{tx(locale, copy.experience.ask)}</button>
            <p className="note">{tx(locale, copy.solution.sample)}</p>
          </div>
        </article>
        <article className="card device">
          <div className="device-bar"><i className="dot" /><span>{tx(locale, copy.experience.items.client)}</span><Badge locale={locale} availability="demo_only" /></div>
          <div className="screen">
            <p>{step === 0 ? tx(locale, copy.mock.clientStep) : tx(locale, copy.mock.clientNext)}</p>
            <button className="btn small" type="button" onClick={() => setStep((value) => (value === 0 ? 1 : 0))}>{tx(locale, copy.actions.continue)}</button>
            <p><Badge locale={locale} availability="not_operational" /> {locale === "it" ? "La scrittura nel CRM non è operativa" : "CRM write-back is not operational"}</p>
          </div>
        </article>
        <article className="card device">
          <div className="device-bar"><i className="dot" /><span>{tx(locale, copy.experience.items.meeting)}</span><Badge locale={locale} availability="not_operational" /></div>
          <div className="screen">
            <div className="grid-2">
              <div className="bubble">{tx(locale, copy.mock.meeting)}</div>
              <div className="bubble twin">{tx(locale, copy.solution.sample)}</div>
            </div>
          </div>
        </article>
        <article className="card device">
          <div className="device-bar"><i className="dot" /><span>{tx(locale, copy.experience.items.kiosk)}</span><Badge locale={locale} availability="not_operational" /></div>
          <div className="screen"><div className="kiosk-screen"><div><div className="mark" style={{ margin: "0 auto 12px" }} /><p>{tx(locale, copy.mock.kiosk)}</p></div></div></div>
        </article>
        <article className="card device">
          <div className="device-bar"><i className="dot" /><span>{tx(locale, copy.experience.items.web)}</span><Badge locale={locale} availability="demo_only" /></div>
          <div className="screen">
            <div className="bubble twin">{tx(locale, copy.mock.web)}</div>
            <p className="note">{tx(locale, copy.solution.sample)}</p>
          </div>
        </article>
      </div>
    </Shell>
  );
}
