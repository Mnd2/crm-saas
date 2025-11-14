import { useEffect, useState } from "react";
import { api } from "../api";

interface Organization {
  id: string;
  name: string;
  plan: string;
  domain?: string | null;
  timezone: string;
  prestashopBaseUrl?: string | null;
  prestashopApiKey?: string | null;
  emailFrom?: string | null;
  emailSmtpHost?: string | null;
  emailSmtpPort?: number | null;
  emailSmtpUser?: string | null;
  emailSmtpPassword?: string | null;
  prestashopLastSyncAt?: string | null;
  prestashopLastSyncStatus?: string | null;
}

export default function Settings() {
  const [org, setOrg] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [testEmail, setTestEmail] = useState("");
  const [testResult, setTestResult] = useState("");
  const [testing, setTesting] = useState(false);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get<Organization>("/organizations/me");
      setOrg(res.data);
    } catch (e: any) {
      setError(e?.response?.data?.message || "Nepavyko užkrauti duomenų");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const updateOrg = (patch: Partial<Organization>) =>
    setOrg((prev) => (prev ? { ...prev, ...patch } : prev));

  const handleMainSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!org) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await api.put("/organizations/me", {
        name: org.name,
        domain: org.domain,
        timezone: org.timezone,
        plan: org.plan
      });
      setMessage("Pagrindiniai nustatymai išsaugoti");
    } catch (e: any) {
      setError(e?.response?.data?.message || "Nepavyko išsaugoti");
    } finally {
      setSaving(false);
    }
  };

  const handleSettingsSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!org) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await api.put("/organizations/me/settings", {
        prestashopBaseUrl: org.prestashopBaseUrl || null,
        prestashopApiKey: org.prestashopApiKey || null,
        emailFrom: org.emailFrom || null,
        emailSmtpHost: org.emailSmtpHost || null,
        emailSmtpPort: org.emailSmtpPort || null,
        emailSmtpUser: org.emailSmtpUser || null,
        emailSmtpPassword: org.emailSmtpPassword || null
      });
      setMessage("Integracijų nustatymai išsaugoti");
    } catch (e: any) {
      setError(e?.response?.data?.message || "Nepavyko išsaugoti integracijų");
    } finally {
      setSaving(false);
    }
  };

  const triggerPrestashopSync = async () => {
    setSyncStatus("Sinchronizuojama...");
    try {
      const res = await api.post("/prestashop/sync-orders", { limit: 20 });
      setSyncStatus(
        `Importuota ${res.data.imported} iš ${res.data.totalFetched} įrašų`
      );
      load();
    } catch (e: any) {
      setSyncStatus(
        e?.response?.data?.message || "Nepavyko sinchronizuoti (patikrink raktą)"
      );
    }
  };

  const sendTestEmail = async () => {
    if (!testEmail) return;
    setTesting(true);
    setTestResult("");
    try {
      const res = await api.post("/email/test", { to: testEmail });
      setTestResult(res.data.message || "Testinis laiškas išsiųstas");
    } catch (e: any) {
      setTestResult(e?.response?.data?.message || "Nepavyko išsiųsti laiško");
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return <div className="card">Kraunama...</div>;
  }

  if (!org) {
    return <div className="card">Organizacija nerasta.</div>;
  }

  return (
    <div className="stack" style={{ maxWidth: 900 }}>
      <div className="page-header">
        <h1 className="page-header__title">Nustatymai</h1>
        <p className="page-header__subtitle">
          Tvarkyk organizacijos informaciją, integracijas ir el. pašto siuntimą.
        </p>
      </div>

      {error && (
        <div className="card" style={{ color: "var(--color-danger)" }}>
          {error}
        </div>
      )}
      {message && (
        <div className="card" style={{ color: "var(--color-success)" }}>
          {message}
        </div>
      )}

      <section className="card stack">
        <h2 className="card__title">Pagrindinė informacija</h2>
        <form className="form-grid" onSubmit={handleMainSave}>
          <label>
            Pavadinimas
            <input
              className="input"
              value={org.name}
              onChange={(e) => updateOrg({ name: e.target.value })}
            />
          </label>
          <label>
            Domenas
            <input
              className="input"
              value={org.domain || ""}
              onChange={(e) => updateOrg({ domain: e.target.value })}
            />
          </label>
          <label>
            Planas
            <select
              className="select"
              value={org.plan}
              onChange={(e) => updateOrg({ plan: e.target.value })}
            >
              <option value="free">Free</option>
              <option value="pro">Pro</option>
              <option value="enterprise">Enterprise</option>
            </select>
          </label>
          <label>
            Laiko zona
            <input
              className="input"
              value={org.timezone}
              onChange={(e) => updateOrg({ timezone: e.target.value })}
            />
          </label>
          <button
            type="submit"
            className="button button--primary"
            disabled={saving}
          >
            {saving ? "Saugoma..." : "Išsaugoti"}
          </button>
        </form>
      </section>

      <section className="card stack">
        <div className="split" style={{ alignItems: "center" }}>
          <div>
            <h2 className="card__title">PrestaShop integracija</h2>
            <p className="page-header__subtitle" style={{ margin: 0 }}>
              Suvesk API duomenis ir importuok užsakymus.
            </p>
          </div>
          <button className="button button--secondary" onClick={triggerPrestashopSync}>
            Paleisti sync
          </button>
        </div>
        {syncStatus && <small style={{ color: "var(--color-text-muted)" }}>{syncStatus}</small>}

        <form className="form-grid" onSubmit={handleSettingsSave}>
          <label>
            Base URL
            <input
              className="input"
              value={org.prestashopBaseUrl || ""}
              onChange={(e) => updateOrg({ prestashopBaseUrl: e.target.value })}
            />
          </label>
          <label>
            API key
            <input
              className="input"
              value={org.prestashopApiKey || ""}
              onChange={(e) => updateOrg({ prestashopApiKey: e.target.value })}
            />
          </label>

          <div className="stack" style={{ gridColumn: "1 / -1" }}>
            <small style={{ color: "var(--color-text-muted)" }}>
              Paskutinis sync:{" "}
              {org.prestashopLastSyncAt
                ? new Date(org.prestashopLastSyncAt).toLocaleString("lt-LT")
                : "dar nebuvo"}
            </small>
            <small style={{ color: "var(--color-text-muted)" }}>
              Statusas: {org.prestashopLastSyncStatus || "—"}
            </small>
          </div>
          <button
            type="submit"
            className="button button--primary"
            disabled={saving}
          >
            {saving ? "Saugoma..." : "Išsaugoti integraciją"}
          </button>
        </form>
      </section>

      <section className="card stack">
        <h2 className="card__title">El. pašto (SMTP) nustatymai</h2>
        <form className="form-grid" onSubmit={handleSettingsSave}>
          <label>
            From adresas
            <input
              className="input"
              placeholder="CRM <noreply@mano-imone.lt>"
              value={org.emailFrom || ""}
              onChange={(e) => updateOrg({ emailFrom: e.target.value })}
            />
          </label>
          <label>
            SMTP host
            <input
              className="input"
              value={org.emailSmtpHost || ""}
              onChange={(e) => updateOrg({ emailSmtpHost: e.target.value })}
            />
          </label>
          <label>
            SMTP port
            <input
              className="input"
              type="number"
              value={org.emailSmtpPort ?? ""}
              onChange={(e) =>
                updateOrg({
                  emailSmtpPort: e.target.value
                    ? Number(e.target.value)
                    : null
                })
              }
            />
          </label>
          <label>
            SMTP user
            <input
              className="input"
              value={org.emailSmtpUser || ""}
              onChange={(e) => updateOrg({ emailSmtpUser: e.target.value })}
            />
          </label>
          <label>
            SMTP password
            <input
              className="input"
              type="password"
              value={org.emailSmtpPassword || ""}
              onChange={(e) =>
                updateOrg({ emailSmtpPassword: e.target.value })
              }
            />
          </label>
          <button
            type="submit"
            className="button button--primary"
            disabled={saving}
          >
            {saving ? "Saugoma..." : "Išsaugoti SMTP nustatymus"}
          </button>
        </form>

        <div className="split">
          <input
            className="input"
            placeholder="gavėjas@pavyzdys.lt"
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
          />
          <button
            className="button button--secondary"
            type="button"
            onClick={sendTestEmail}
            disabled={testing}
          >
            {testing ? "Siunčiama..." : "Siųsti testą"}
          </button>
        </div>
        {testResult && (
          <small style={{ color: "var(--color-text-muted)" }}>{testResult}</small>
        )}
      </section>
    </div>
  );
}
