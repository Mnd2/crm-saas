import { useEffect, useState } from "react";
import { api } from "../api";
import { Link } from "react-router-dom";

interface Contact {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  company: string | null;
  lifecycleStage?: string | null;
}

interface ContactStatsResponse {
  total: number;
  stages: { stage: string; count: number }[];
}

const stageOptions = [
  { value: "lead", label: "Lead" },
  { value: "customer", label: "Customer" },
  { value: "churn-risk", label: "Churn risk" }
];

export default function Contacts() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [stats, setStats] = useState<ContactStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [newEmail, setNewEmail] = useState("");
  const [newFirstName, setNewFirstName] = useState("");
  const [newLastName, setNewLastName] = useState("");
  const [newStage, setNewStage] = useState("lead");

  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("all");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get<Contact[]>("/contacts", {
        params: {
          search: search || undefined,
          stage: stageFilter
        }
      });
      setContacts(res.data);
    } catch (e: any) {
      setError(e?.response?.data?.message || "Nepavyko užkrauti kontaktų");
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    const res = await api.get<ContactStatsResponse>("/contacts/stats");
    setStats(res.data);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stageFilter]);

  useEffect(() => {
    loadStats();
  }, []);

  const createContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    try {
      await api.post("/contacts", {
        email: newEmail || undefined,
        firstName: newFirstName || undefined,
        lastName: newLastName || undefined,
        lifecycleStage: newStage
      });
      setNewEmail("");
      setNewFirstName("");
      setNewLastName("");
      setNewStage("lead");
      setMessage("Kontaktas sukurtas");
      await Promise.all([load(), loadStats()]);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Nepavyko sukurti kontakto");
    }
  };

  const updateStage = async (id: string, stage: string) => {
    try {
      await api.patch(`/contacts/${id}/stage`, { stage });
      await Promise.all([load(), loadStats()]);
    } catch (e: any) {
      setError(e?.response?.data?.message || "Nepavyko atnaujinti stage");
    }
  };

  const readableName = (contact: Contact) =>
    [contact.firstName, contact.lastName].filter(Boolean).join(" ") ||
    contact.email ||
    "Nežinomas";

  return (
    <div className="stack">
      <div className="page-header">
        <h1 className="page-header__title">Kontaktai</h1>
        <p className="page-header__subtitle">
          Sek klientus, žymėk stage ir greitai pridėk naujus lead'us.
        </p>
      </div>

      {message && (
        <div className="card" style={{ color: "var(--color-success)" }}>
          {message}
        </div>
      )}
      {error && (
        <div className="card" style={{ color: "var(--color-danger)" }}>
          {error}
        </div>
      )}

      {stats && (
        <div className="grid grid--three">
          <div className="card stack">
            <small style={{ color: "var(--color-text-muted)" }}>Iš viso</small>
            <strong style={{ fontSize: 24 }}>{stats.total}</strong>
          </div>
          {stageOptions.map((option) => {
            const value =
              stats.stages.find((s) => s.stage === option.value)?.count || 0;
            return (
              <div key={option.value} className="card stack">
                <small style={{ color: "var(--color-text-muted)" }}>
                  {option.label}
                </small>
                <strong style={{ fontSize: 24 }}>{value}</strong>
              </div>
            );
          })}
        </div>
      )}

      <div className="card stack">
        <form className="form-grid" onSubmit={createContact}>
          <input
            className="input"
            placeholder="El. paštas"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
          />
          <input
            className="input"
            placeholder="Vardas"
            value={newFirstName}
            onChange={(e) => setNewFirstName(e.target.value)}
          />
          <input
            className="input"
            placeholder="Pavardė"
            value={newLastName}
            onChange={(e) => setNewLastName(e.target.value)}
          />
          <select
            className="select"
            value={newStage}
            onChange={(e) => setNewStage(e.target.value)}
          >
            {stageOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <button type="submit" className="button button--primary">
            Pridėti
          </button>
        </form>
      </div>

      <div className="card stack">
        <div className="split">
          <input
            className="input"
            placeholder="Paieška pagal vardą, email, įmonę..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="select"
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
          >
            <option value="all">Visi stage'ai</option>
            {stageOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <button className="button button--secondary" onClick={load}>
            Filtruoti
          </button>
        </div>

        {loading ? (
          <p>Kraunama...</p>
        ) : contacts.length === 0 ? (
          <div className="empty-state">Kontaktų nerasta.</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Vardas</th>
                <th>El. paštas</th>
                <th>Telefonas</th>
                <th>Įmonė</th>
                <th>Stage</th>
              </tr>
            </thead>
            <tbody>
              {contacts.map((c) => (
                <tr key={c.id}>
                  <td>
                    <Link to={`/contacts/${c.id}`}>{readableName(c)}</Link>
                  </td>
                  <td>{c.email || "—"}</td>
                  <td>{c.phone || "—"}</td>
                  <td>{c.company || "—"}</td>
                  <td>
                    <select
                      className="select"
                      value={c.lifecycleStage || "lead"}
                      onChange={(e) => updateStage(c.id, e.target.value)}
                    >
                      {stageOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
