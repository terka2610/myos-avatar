"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PAINS } from "@/lib/discovery";
import { copy, tx } from "@/lib/copy";
import type { Dashboard } from "@/lib/dashboard";
import { round1 } from "@/lib/time";
import type { Consultation, ConsultationStatus } from "@/lib/types";
import { Shell, api, useLocale, type ClientSession, type OrgOption } from "./common";

const STATUSES: ConsultationStatus[] = ["discovery", "proposed", "pilot", "decided", "paused"];

export function DashboardScreen() {
  const [locale, setLocale] = useLocale();
  const [session, setSession] = useState<ClientSession | null>(null);
  const [orgs, setOrgs] = useState<OrgOption[]>([]);
  const [persistence, setPersistence] = useState("");
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [rows, setRows] = useState<Consultation[]>([]);
  const [error, setError] = useState("");

  async function load() {
    const who = await api<{ session: ClientSession | null; organizations: OrgOption[]; persistence: string }>("/api/session");
    setSession(who.session);
    setOrgs(who.organizations ?? []);
    setPersistence(who.persistence);
    if (!who.session) {
      setError("unauthorized");
      return;
    }
    const [stats, list] = await Promise.all([
      api<Dashboard>("/api/dashboard"),
      api<{ consultations: Consultation[] }>("/api/consultations"),
    ]);
    setDashboard(stats);
    setRows(list.consultations);
  }

  useEffect(() => {
    void load().catch(() => setError("server_error"));
  }, []);

  async function switchOrg(orgId: string) {
    await api("/api/organizations/switch", { method: "POST", body: JSON.stringify({ orgId }) });
    await load();
  }

  async function setStatus(id: string, status: ConsultationStatus) {
    await api(`/api/consultations/${id}/answers`, { method: "PUT", body: JSON.stringify({ key: "status", value: status }) });
    await load();
  }

  return (
    <Shell locale={locale} setLocale={setLocale} session={session} orgs={orgs} onSwitch={(orgId) => void switchOrg(orgId)} persistence={persistence}>
      <div className="kicker">{tx(locale, copy.nav.dashboard)}</div>
      <h1 className="page-title">{tx(locale, copy.dashboard.title)}</h1>
      <p className="help">{tx(locale, copy.dashboard.help)}</p>
      {error ? <p className="callout">{tx(locale, copy.errors.unauthorized)}</p> : null}
      {dashboard ? (
        <>
          <div className="grid-4">
            <Stat label={tx(locale, copy.dashboard.count)} value={String(dashboard.consultationCount)} />
            <Stat label={tx(locale, copy.dashboard.video)} value={String(round1(dashboard.expectedVideoMinutes))} />
            <Stat label={tx(locale, copy.dashboard.voice)} value={String(round1(dashboard.expectedVoiceMinutes))} />
            <Stat label={tx(locale, copy.dashboard.follow)} value={String(dashboard.openFollowUps)} />
          </div>
          <div className="grid-2" style={{ marginTop: 16 }}>
            <article className="card">
              <h2>{tx(locale, copy.dashboard.pains)}</h2>
              {dashboard.painPoints.length === 0 ? <p>{tx(locale, copy.dashboard.none)}</p> : dashboard.painPoints.map((item) => <p key={item.id}>{PAINS.find((pain) => pain.id === item.id)?.[locale] ?? item.id} · {item.count}</p>)}
            </article>
            <article className="card">
              <h2>{tx(locale, copy.dashboard.plans)}</h2>
              {dashboard.proposedPlans.length === 0 ? <p>{tx(locale, copy.dashboard.none)}</p> : dashboard.proposedPlans.map((item) => <p key={item.code}>{item.code} · {item.count}</p>)}
              <p className="note">{tx(locale, copy.dashboard.decisions)}: {dashboard.decisions}</p>
            </article>
            <article className="card">
              <h2>{tx(locale, copy.dashboard.status)}</h2>
              {STATUSES.map((status) => <p key={status}>{tx(locale, copy.status[status])} · {dashboard.byStatus[status]}</p>)}
            </article>
            <article className="card">
              <h2>{tx(locale, copy.dashboard.gaps)}</h2>
              {dashboard.knowledgeGaps.length === 0 ? <p>{tx(locale, copy.dashboard.none)}</p> : dashboard.knowledgeGaps.map((gap) => <p key={gap.text}>{gap.text}</p>)}
            </article>
          </div>
          <article className="card" style={{ marginTop: 16 }}>
            <h2>{tx(locale, copy.dashboard.usageTitle)}</h2>
            <span className="badge off">{tx(locale, copy.dashboard.notInstrumented)}</span>
            <p>{tx(locale, copy.dashboard.usageBody)}</p>
          </article>
          <div className="stack" style={{ marginTop: 16 }}>
            {rows.map((row) => (
              <article key={row.id} className="card row" style={{ justifyContent: "space-between" }}>
                <div>
                  <Link href={`/c/${row.id}`}><strong>{row.executiveLabel || row.id.slice(0, 8)}</strong></Link>
                  <div className="note">{PAINS.find((pain) => pain.id === row.pain)?.[locale] ?? row.pain}</div>
                </div>
                <label className="field">{tx(locale, copy.dashboard.setStatus)}
                  <select className="status-select" value={row.status} onChange={(event) => void setStatus(row.id, event.target.value as ConsultationStatus)}>
                    {STATUSES.map((status) => <option key={status} value={status}>{tx(locale, copy.status[status])}</option>)}
                  </select>
                </label>
              </article>
            ))}
          </div>
        </>
      ) : null}
    </Shell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return <article className="card"><div className="note">{label}</div><div className="metric" style={{ fontSize: 42 }}>{value}</div></article>;
}
