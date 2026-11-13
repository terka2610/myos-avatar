"use client";

import { useEffect, useState } from "react";
import { copy, tx } from "@/lib/copy";
import { PRICING_RECONCILIATION } from "@/lib/pricing";
import type { Addon, Plan } from "@/lib/types";
import { Shell, api, errorText, useLocale, type ClientSession, type OrgOption } from "./common";

export function AdminScreen() {
  const [locale, setLocale] = useLocale();
  const [session, setSession] = useState<ClientSession | null>(null);
  const [orgs, setOrgs] = useState<OrgOption[]>([]);
  const [admin, setAdmin] = useState<"development" | "code" | "closed">("closed");
  const [plans, setPlans] = useState<Plan[]>([]);
  const [addons, setAddons] = useState<Addon[]>([]);
  const [code, setCode] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  async function load() {
    const who = await api<{ session: ClientSession | null; organizations: OrgOption[]; admin: "development" | "code" | "closed" }>("/api/session");
    setSession(who.session);
    setOrgs(who.organizations ?? []);
    setAdmin(who.admin);
    const catalog = await api<{ plans: Plan[]; addons: Addon[] }>("/api/plans");
    setPlans(catalog.plans);
    setAddons(catalog.addons);
  }

  useEffect(() => {
    void load().catch(() => setError("unauthorized"));
  }, []);

  const canEdit = session?.role === "admin";

  async function unlock() {
    try {
      const result = await api<{ session: ClientSession }>("/api/session/admin", { method: "POST", body: JSON.stringify({ adminCode: code }) });
      setSession(result.session);
      setError("");
    } catch (cause) {
      const failure = cause instanceof Error && "code" in cause ? String(cause.code) : "server_error";
      setError(errorText(locale, failure));
    }
  }

  async function savePlan(plan: Plan) {
    try {
      await api(`/api/plans/${plan.code}`, {
        method: "PUT",
        body: JSON.stringify({
          monthlyCents: plan.monthlyCents,
          setupCents: plan.setupCents,
          videos: plan.videos,
          videoMinutes: plan.videoMinutes,
          voiceMinutes: plan.voiceMinutes,
          maxVideoSeconds: plan.maxVideoSeconds,
          includedAvatars: plan.includedAvatars,
        }),
      });
      setNote(tx(locale, copy.admin.saved));
    } catch (cause) {
      const failure = cause instanceof Error && "code" in cause ? String(cause.code) : "server_error";
      setError(errorText(locale, failure));
    }
  }

  async function saveAddon(addon: Addon) {
    try {
      await api(`/api/addons/${addon.code}`, { method: "PUT", body: JSON.stringify({ unitCents: addon.unitCents }) });
      setNote(tx(locale, copy.admin.saved));
    } catch (cause) {
      const failure = cause instanceof Error && "code" in cause ? String(cause.code) : "server_error";
      setError(errorText(locale, failure));
    }
  }

  function editPlan(codeName: string, key: keyof Plan, value: string) {
    setPlans((current) => current.map((plan) => (plan.code === codeName ? { ...plan, [key]: Number(value) } : plan)));
  }

  return (
    <Shell locale={locale} setLocale={setLocale} session={session} orgs={orgs}>
      <div className="kicker">{tx(locale, copy.nav.admin)}</div>
      <h1 className="page-title">{tx(locale, copy.admin.title)}</h1>
      <p className="help">{tx(locale, copy.admin.help)}</p>
      <p className="callout">{PRICING_RECONCILIATION[locale]}</p>
      {admin === "closed" && !canEdit ? <p className="callout">{tx(locale, copy.admin.closed)}</p> : null}
      {!canEdit && admin !== "closed" ? (
        <div className="row">
          {admin === "code" ? <input aria-label={tx(locale, copy.admin.code)} type="password" value={code} onChange={(event) => setCode(event.target.value)} placeholder={tx(locale, copy.admin.code)} /> : null}
          <button className="btn" type="button" onClick={() => void unlock()}>{tx(locale, copy.admin.become)}</button>
        </div>
      ) : null}
      {error ? <p className="callout">{error}</p> : null}
      {note ? <p className="note">{note}</p> : null}
      <div className="stack" style={{ marginTop: 16 }}>
        {plans.map((plan) => (
          <article key={plan.code} className="card">
            <h2>{plan.name}</h2>
            <div className="fields">
              <NumberField label={tx(locale, copy.admin.monthly)} value={plan.monthlyCents} disabled={!canEdit} onChange={(value) => editPlan(plan.code, "monthlyCents", value)} />
              <NumberField label={tx(locale, copy.admin.setup)} value={plan.setupCents} disabled={!canEdit} onChange={(value) => editPlan(plan.code, "setupCents", value)} />
              <NumberField label={tx(locale, copy.admin.videos)} value={plan.videos} disabled={!canEdit} onChange={(value) => editPlan(plan.code, "videos", value)} />
              <NumberField label={tx(locale, copy.admin.videoMinutes)} value={plan.videoMinutes} disabled={!canEdit} onChange={(value) => editPlan(plan.code, "videoMinutes", value)} />
              <NumberField label={tx(locale, copy.admin.voice)} value={plan.voiceMinutes} disabled={!canEdit} onChange={(value) => editPlan(plan.code, "voiceMinutes", value)} />
              <NumberField label={tx(locale, copy.admin.max)} value={plan.maxVideoSeconds} disabled={!canEdit} onChange={(value) => editPlan(plan.code, "maxVideoSeconds", value)} />
              <NumberField label={tx(locale, copy.admin.avatars)} value={plan.includedAvatars} disabled={!canEdit} onChange={(value) => editPlan(plan.code, "includedAvatars", value)} />
            </div>
            {canEdit ? <button className="btn small" type="button" onClick={() => void savePlan(plan)}>{tx(locale, copy.admin.save)}</button> : null}
          </article>
        ))}
        {addons.map((addon) => (
          <article key={addon.code} className="card">
            <h2>{locale === "it" ? addon.nameIt : addon.nameEn}</h2>
            <p className="note">{addon.hypothesis ? tx(locale, copy.pricing.hypothesis) : ""}</p>
            <label className="field">{tx(locale, copy.admin.addon)}
              <input disabled={!canEdit} value={addon.unitCents ?? ""} onChange={(event) => setAddons((current) => current.map((item) => item.code === addon.code ? { ...item, unitCents: event.target.value === "" ? null : Number(event.target.value) } : item))} />
            </label>
            {canEdit ? <button className="btn small" type="button" onClick={() => void saveAddon(addon)}>{tx(locale, copy.admin.save)}</button> : null}
          </article>
        ))}
      </div>
    </Shell>
  );
}

function NumberField({ label, value, disabled, onChange }: { label: string; value: number; disabled: boolean; onChange: (value: string) => void }) {
  return <label className="field">{label}<input disabled={disabled} type="number" min={0} value={value} onChange={(event) => onChange(event.target.value)} /></label>;
}
