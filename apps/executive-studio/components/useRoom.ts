"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { copy, tx } from "@/lib/copy";
import { DEFAULT_ADDONS, DEFAULT_PLANS } from "@/lib/pricing";
import type { Addon, Consultation, ConsentKind, Plan } from "@/lib/types";
import { api, errorText, useLocale, type ClientSession, type OrgOption } from "./common";

export function useRoom(id: string) {
  const router = useRouter();
  const [locale, setLocale] = useLocale();
  const [session, setSession] = useState<ClientSession | null>(null);
  const [orgs, setOrgs] = useState<OrgOption[]>([]);
  const [consultation, setConsultation] = useState<Consultation | null>(null);
  const [consents, setConsents] = useState<{ kind: string; granted: boolean }[]>([]);
  const [plans, setPlans] = useState<Plan[]>(DEFAULT_PLANS);
  const [addons, setAddons] = useState<Addon[]>(DEFAULT_ADDONS);
  const [persistence, setPersistence] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState("");
  const [ready, setReady] = useState(false);
  const timers = useRef<Record<string, number>>({});

  const load = useCallback(async () => {
    try {
      const [who, room, catalog] = await Promise.all([
        api<{ session: ClientSession | null; organizations: OrgOption[]; persistence: string }>("/api/session"),
        api<{ consultation: Consultation; consents: { kind: string; granted: boolean }[] }>(`/api/consultations/${id}`),
        api<{ plans: Plan[]; addons: Addon[] }>("/api/plans"),
      ]);
      setSession(who.session);
      setOrgs(who.organizations ?? []);
      setPersistence(who.persistence);
      setConsultation(room.consultation);
      setConsents(room.consents ?? []);
      setPlans(catalog.plans);
      setAddons(catalog.addons);
      setLocale(room.consultation.language);
      setError("");
    } catch (cause) {
      const code = cause instanceof Error && "code" in cause ? String(cause.code) : "server_error";
      setError(code);
    } finally {
      setReady(true);
    }
  }, [id, setLocale]);

  useEffect(() => {
    void load();
  }, [load]);

  function update(key: string, value: string) {
    setConsultation((current) => {
      if (!current) return current;
      const answers = { ...current.answers, [key]: value };
      return {
        ...current,
        answers,
        audience: key === "audience" ? value : current.audience,
        pain: key === "pain" ? value : current.pain,
        notes: key === "solve_for" ? value : current.notes,
        language: key === "language" && (value === "en" || value === "it") ? value : current.language,
        status: key === "status" ? (value as Consultation["status"]) : current.status,
        currentStep: key === "current_step" ? Number(value) || 0 : current.currentStep,
      };
    });
    window.clearTimeout(timers.current[key]);
    timers.current[key] = window.setTimeout(() => {
      delete timers.current[key];
      setSaving(tx(locale, copy.actions.saving));
      api(`/api/consultations/${id}/answers`, { method: "PUT", body: JSON.stringify({ key, value }) })
        .then(() => setSaving(tx(locale, copy.actions.saved)))
        .catch(() => setSaving(tx(locale, copy.errors.save_failed)));
    }, 320);
  }

  async function saveMany(answers: Record<string, string>) {
    const result = await api<{ consultation: Consultation }>(`/api/consultations/${id}/answers`, {
      method: "PUT",
      body: JSON.stringify({ answers }),
    });
    setConsultation(result.consultation);
  }

  async function record(kind: ConsentKind, granted: boolean) {
    const result = await api<{ consents: { kind: string; granted: boolean }[] }>(`/api/consultations/${id}/consents`, {
      method: "POST",
      body: JSON.stringify({ records: [{ kind, granted }] }),
    });
    setConsents(result.consents);
  }

  function granted(kind: string) {
    const rows = consents.filter((item) => item.kind === kind);
    return rows.length > 0 ? Boolean(rows[rows.length - 1]?.granted) : false;
  }

  async function switchOrg(orgId: string) {
    await api("/api/organizations/switch", { method: "POST", body: JSON.stringify({ orgId }) });
    router.push("/dashboard");
  }

  function changeLocale(next: typeof locale) {
    setLocale(next);
    if (consultation) update("language", next);
  }

  return {
    locale,
    setLocale: changeLocale,
    session,
    orgs,
    consultation,
    plans,
    addons,
    persistence,
    error,
    errorMessage: error ? errorText(locale, error) : "",
    saving,
    ready,
    update,
    saveMany,
    record,
    granted,
    switchOrg,
    reload: load,
  };
}
