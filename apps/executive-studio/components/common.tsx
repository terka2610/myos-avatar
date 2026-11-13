"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { copy, tx, type Line } from "@/lib/copy";
import type { Locale } from "@/lib/types";

export type ClientSession = {
  userId: string;
  name: string;
  orgId: string;
  orgName: string;
  role: "consultant" | "admin";
};

export type OrgOption = { id: string; name: string; role: "consultant" | "admin" };

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const data = (await response.json().catch(() => ({}))) as { error?: string };
  if (!response.ok) {
    const error = new Error(data.error || "server_error") as Error & { code: string };
    error.code = data.error || "server_error";
    throw error;
  }
  return data as T;
}

export function errorText(locale: Locale, code: string): string {
  if (code in copy.errors) return tx(locale, copy.errors[code as keyof typeof copy.errors]);
  return tx(locale, copy.errors.server_error);
}

export function useLocale(preferred?: Locale) {
  const [locale, setLocale] = useState<Locale>(preferred ?? "en");
  useEffect(() => {
    const stored = window.localStorage.getItem("myos-studio-locale");
    if (!preferred && (stored === "en" || stored === "it")) setLocale(stored);
    document.documentElement.lang = preferred || stored || "en";
  }, [preferred]);
  const update = useCallback((next: Locale) => {
    setLocale(next);
    window.localStorage.setItem("myos-studio-locale", next);
    document.documentElement.lang = next;
  }, []);
  return [locale, update] as const;
}

const STAGES = [
  ["audience", 0],
  ["friction", 1],
  ["reality", 2],
  ["configure", 3],
  ["solution", 4],
  ["next", 5],
] as const;

export function Shell({
  locale,
  setLocale,
  session,
  orgs,
  onSwitch,
  consultationId,
  stage,
  saving,
  persistence,
  children,
}: {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  session: ClientSession | null;
  orgs: OrgOption[];
  onSwitch?: (orgId: string) => void;
  consultationId?: string;
  stage?: number;
  saving?: string;
  persistence?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="app">
      <aside className="sidebar">
        <Link href="/" className="brand">
          <span className="mark" aria-hidden><i /></span>
          <span>
            MYOS
            <small>{tx(locale, copy.product)}</small>
          </span>
        </Link>
        <p className="side-copy">{tx(locale, copy.home.lead)}</p>
        <nav className="nav-group" aria-label={tx(locale, copy.product)}>
          <Link className="nav-link" href="/">{tx(locale, copy.nav.home)}</Link>
          {consultationId
            ? STAGES.map(([key, index]) => (
                <Link key={key} className={`nav-link ${stage === index ? "active" : ""}`} href={`/c/${consultationId}?stage=${index}`}>
                  <span className="num">{index + 1}</span>
                  {tx(locale, copy.nav[key])}
                </Link>
              ))
            : null}
          {consultationId ? (
            <>
              <Link className="nav-link" href={`/c/${consultationId}/experience`}>{tx(locale, copy.nav.experience)}</Link>
              <Link className="nav-link" href={`/c/${consultationId}/onboarding`}>{tx(locale, copy.nav.onboarding)}</Link>
              <Link className="nav-link" href={`/c/${consultationId}/summary`}>{tx(locale, copy.nav.summary)}</Link>
            </>
          ) : null}
          <Link className="nav-link" href="/dashboard">{tx(locale, copy.nav.dashboard)}</Link>
          <Link className="nav-link" href="/admin/pricing">{tx(locale, copy.nav.admin)}</Link>
        </nav>
        <div className="side-foot">{tx(locale, copy.footer)}</div>
      </aside>
      <main className="main">
        <div className="topbar">
          <div className="top-actions">
            {session ? <span className="pill">{session.orgName}</span> : <span className="pill">MYOS</span>}
            {orgs.length > 1 && onSwitch ? (
              <select className="lang" aria-label={tx(locale, copy.start.organization)} value={session?.orgId ?? ""} onChange={(event) => onSwitch(event.target.value)}>
                {orgs.map((org) => (
                  <option key={org.id} value={org.id}>{org.name}</option>
                ))}
              </select>
            ) : null}
            {saving ? <span className="note">{saving}</span> : null}
          </div>
          <label className="note">
            <select className="lang" aria-label={tx(locale, copy.languageName)} value={locale} onChange={(event) => setLocale(event.target.value as Locale)}>
              <option value="en">English</option>
              <option value="it">Italiano</option>
            </select>
          </label>
        </div>
        {persistence === "ephemeral" ? <p className="callout banner">{tx(locale, copy.persistence.ephemeral)}</p> : null}
        {persistence === "memory" ? <p className="callout banner">{tx(locale, copy.persistence.memory)}</p> : null}
        {children}
      </main>
    </div>
  );
}

export function Badge({ locale, availability }: { locale: Locale; availability: string }) {
  const table = copy.badges as Record<string, Line>;
  const line = table[availability];
  const tone = availability === "not_operational" ? "off" : availability === "demo_only" || availability === "feasibility_required" ? "warn" : "ok";
  return <span className={`badge ${tone}`}>{line ? tx(locale, line) : availability}</span>;
}

export function languageLabel(locale: Locale) {
  return locale === "it" ? "Italiano" : "English";
}
