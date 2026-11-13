"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { CATEGORIES } from "@/lib/discovery";
import { copy, tx } from "@/lib/copy";
import type { Locale } from "@/lib/types";
import { api, errorText, Shell, useLocale, type ClientSession, type OrgOption } from "./common";

const STAGE_KEYS = ["audience", "friction", "reality", "configure", "solution", "next"] as const;

export function Home() {
  const router = useRouter();
  const [locale, setLocale] = useLocale();
  const [session, setSession] = useState<ClientSession | null>(null);
  const [orgs, setOrgs] = useState<OrgOption[]>([]);
  const [persistence, setPersistence] = useState<string>("");
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<(typeof CATEGORIES)[number] | null>(null);
  const [consultantName, setConsultantName] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [executiveLabel, setExecutiveLabel] = useState("");
  const [useCurrent, setUseCurrent] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    api<{ session: ClientSession | null; organizations: OrgOption[]; persistence: string }>("/api/session")
      .then((result) => {
        setSession(result.session);
        setOrgs(result.organizations ?? []);
        setPersistence(result.persistence);
        if (result.session) {
          setConsultantName(result.session.name);
          setOrganizationName(result.session.orgName);
        }
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (open) dialogRef.current?.showModal();
  }, [open]);

  function choose(item: (typeof CATEGORIES)[number]) {
    setCategory(item);
    setError("");
    setOpen(true);
  }

  async function begin() {
    if (!category) return;
    setBusy(true);
    setError("");
    try {
      let active = session;
      if (!active) {
        const opened = await api<{ session: ClientSession; organizations: OrgOption[] }>("/api/session", {
          method: "POST",
          body: JSON.stringify({ consultantName, organizationName, role: "consultant" }),
        });
        active = opened.session;
      } else if (!useCurrent) {
        const created = await api<{ organization: { id: string } }>("/api/organizations", {
          method: "POST",
          body: JSON.stringify({ name: organizationName }),
        });
        await api("/api/organizations/switch", { method: "POST", body: JSON.stringify({ orgId: created.organization.id }) });
      }
      const created = await api<{ consultation: { id: string } }>("/api/consultations", {
        method: "POST",
        body: JSON.stringify({
          language: locale,
          category: category.id,
          pain: category.pain,
          executiveLabel,
        }),
      });
      router.push(`/c/${created.consultation.id}?stage=0`);
    } catch (cause) {
      const code = cause instanceof Error && "code" in cause ? String(cause.code) : "server_error";
      setError(errorText(locale, code));
      setBusy(false);
    }
  }

  return (
    <Shell locale={locale} setLocale={setLocale} session={session} orgs={orgs} persistence={persistence}>
      <section className="hero-navy">
        <div className="kicker">{tx(locale, copy.home.kicker)}</div>
        <h1 className="headline">{tx(locale, copy.home.headline)}</h1>
        <p className="subhead">{tx(locale, copy.home.subhead)}</p>
        <div className="stage-rail" aria-label={tx(locale, copy.home.stages)}>
          {STAGE_KEYS.map((key, index) => (
            <span key={key} className="stage-chip">{index + 1} {tx(locale, copy.nav[key])}</span>
          ))}
        </div>
      </section>
      <section className="overlap grid-4">
        {CATEGORIES.map((item) => (
          <button key={item.id} className="choice" onClick={() => choose(item)}>
            <span className="kicker">{tx(locale, copy.home.open)}</span>
            <strong>{item[locale]}</strong>
            <span>{item.blurb[locale]}</span>
          </button>
        ))}
      </section>
      <p className="note" style={{ marginTop: 22 }}>{tx(locale, copy.footer)}</p>
      {open && category ? (
        <dialog
          ref={dialogRef}
          onCancel={(event) => {
            event.preventDefault();
            setOpen(false);
          }}
          onClose={() => setOpen(false)}
        >
          <form
            className="dialog-card"
            onSubmit={(event) => {
              event.preventDefault();
              void begin();
            }}
          >
            <div className="kicker">{category[locale]}</div>
            <h2 style={{ margin: 0 }}>{tx(locale, copy.start.title)}</h2>
            {!session ? (
              <>
                <label className="field">{tx(locale, copy.start.consultant)}
                  <input value={consultantName} onChange={(event) => setConsultantName(event.target.value)} required />
                </label>
                <label className="field">{tx(locale, copy.start.organization)}
                  <input value={organizationName} onChange={(event) => setOrganizationName(event.target.value)} required />
                </label>
              </>
            ) : (
              <>
                <label className="check">
                  <input type="checkbox" checked={useCurrent} onChange={(event) => setUseCurrent(event.target.checked)} />
                  <span>{tx(locale, copy.start.useCurrent)} · {session.orgName}</span>
                </label>
                {!useCurrent ? (
                  <label className="field">{tx(locale, copy.start.organization)}
                    <input value={organizationName} onChange={(event) => setOrganizationName(event.target.value)} required />
                  </label>
                ) : null}
              </>
            )}
            <label className="field">{tx(locale, copy.start.executive)}
              <input value={executiveLabel} placeholder={tx(locale, copy.start.executiveHint)} onChange={(event) => setExecutiveLabel(event.target.value)} />
            </label>
            {error ? <p className="callout">{error}</p> : null}
            <div className="row">
              <button className="btn" type="submit" disabled={busy}>{busy ? tx(locale, copy.start.working) : tx(locale, copy.start.begin)}</button>
              <button className="btn ghost" type="button" onClick={() => setOpen(false)}>{tx(locale, copy.actions.close)}</button>
            </div>
          </form>
        </dialog>
      ) : null}
    </Shell>
  );
}

export type { Locale };
