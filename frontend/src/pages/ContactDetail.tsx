import { useEffect, useMemo, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { api } from "../api";

type Priority = "low" | "medium" | "high";

interface Deal {
  id: string;
  title: string;
  amount: number | null;
  currency: string;
  stage: string;
  createdAt: string;
}

interface Activity {
  id: string;
  type: string;
  subject: string | null;
  dueDate: string | null;
  completed: boolean;
  createdAt: string;
}

interface NextActionResponse {
  contactId: string;
  contactName: string;
  email: string | null;
  lifecycleStage: string;
  metrics: {
    lastOrderAmount: number;
    totalOrders: number;
    daysSinceLastOrder: number | null;
    daysSinceLastActivity: number | null;
  };
  score: number;
  reasons: string[];
  priority: Priority;
  suggestedActions: string[];
  deals: Deal[];
  activities: Activity[];
}

const priorityCopy: Record<Priority, string> = {
  high: "Aukštas prioritetas",
  medium: "Vidutinis prioritetas",
  low: "Žemas prioritetas"
};

export default function ContactDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<NextActionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiReply, setAiReply] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");

  const load = async () => {
    if (!id) return;
    setLoading(true);
    setError("");
    try {
      const res = await api.get<NextActionResponse>(
        `/ai/contact/${id}/next-action`
      );
      setData(res.data);
    } catch (e: any) {
      setError(e?.response?.data?.message || "Nepavyko užkrauti kontakto");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  const metrics = useMemo(() => {
    if (!data?.metrics) return [];
    return [
      {
        label: "Paskutinio užsakymo suma",
        value: `${(data.metrics.lastOrderAmount ?? 0).toFixed(2)} €`
      },
      {
        label: "Užsakymų skaičius",
        value: data.metrics.totalOrders ?? 0
      },
      {
        label: "Dienos nuo paskutinio užsakymo",
        value:
          data.metrics.daysSinceLastOrder != null
            ? `${data.metrics.daysSinceLastOrder} d.`
            : "—"
      },
      {
        label: "Dienos nuo paskutinės veiklos",
        value:
          data.metrics.daysSinceLastActivity != null
            ? `${data.metrics.daysSinceLastActivity} d.`
            : "—"
      }
    ];
  }, [data]);

  const generateReply = async () => {
    if (!data || !aiPrompt.trim()) return;
    setAiError("");
    setAiReply("");
    setAiLoading(true);
    try {
      const res = await api.post("/ai/chat", {
        prompt: `Kontaktas ${data.contactName} (${data.email || "be el. pašto"}).

Paruošk draugišką, profesionalų atsakymą į laišką. Kontekstas:
${aiPrompt}
`
      });
      setAiReply(res.data.reply || "");
    } catch (e: any) {
      setAiError(e?.response?.data?.message || "Nepavyko sugeneruoti atsakymo");
    } finally {
      setAiLoading(false);
    }
  };

  if (!id) {
    return <p>Nenurodytas kontakto ID.</p>;
  }

  if (loading) {
    return <div className="card">Kraunama...</div>;
  }

  if (error) {
    return (
      <div className="card stack">
        <p style={{ color: "var(--color-danger)" }}>{error}</p>
        <button className="button button--secondary" onClick={() => navigate(-1)}>
          Grįžti
        </button>
      </div>
    );
  }

  if (!data) {
    return <div className="card">Kontaktas nerastas.</div>;
  }

  return (
    <div className="stack">
      <div className="split" style={{ alignItems: "center" }}>
        <Link to="/contacts" className="button button--secondary">
          ← Atgal
        </Link>
        <div>
          <h1 className="page-header__title" style={{ marginBottom: 4 }}>
            {data.contactName}
          </h1>
          <p className="page-header__subtitle" style={{ margin: 0 }}>
            {data.email || "El. paštas nenurodytas"}
          </p>
        </div>
      </div>

      <div className="grid grid--two">
        <section className="card stack">
          <div className="split" style={{ alignItems: "center" }}>
            <div>
              <p style={{ margin: 0, color: "var(--color-text-muted)" }}>
                Lifecycle stage
              </p>
              <strong>{data.lifecycleStage || "Nenurodytas"}</strong>
            </div>
            <span
              className="status-pill"
              style={{
                background:
                  data.priority === "high"
                    ? "#dcfce7"
                    : data.priority === "medium"
                    ? "#fef3c7"
                    : "#e5e7eb",
                color:
                  data.priority === "high"
                    ? "var(--color-success)"
                    : data.priority === "medium"
                    ? "#ea580c"
                    : "#6b7280"
              }}
            >
              {priorityCopy[data.priority]}
            </span>
          </div>
          <div>
            <h2 className="card__title" style={{ marginBottom: 8 }}>
              AI įvertinimas
            </h2>
            <p style={{ fontSize: 36, margin: 0, fontWeight: 700 }}>
              {data.score} / 100
            </p>
            <ul>
              {data.reasons.map((reason, idx) => (
                <li key={idx}>{reason}</li>
              ))}
            </ul>
          </div>
        </section>

        <section className="card">
          <h2 className="card__title">Pagrindinės metrikos</h2>
          <div className="grid grid--two">
            {metrics.map((metric) => (
              <div key={metric.label} className="stack">
                <small style={{ color: "var(--color-text-muted)" }}>
                  {metric.label}
                </small>
                <strong>{metric.value}</strong>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="card">
        <h2 className="card__title">Ką daryti toliau?</h2>
        {(!data.suggestedActions || data.suggestedActions.length === 0) ? (
          <div className="empty-state">Nėra specifinių rekomendacijų.</div>
        ) : (
          <ul>
            {data.suggestedActions?.map((a, i) => (
              <li key={i}>{a}</li>
            ))}
          </ul>
        )}
      </section>

      <div className="grid grid--two">
        <section className="card">
          <h2 className="card__title">Susiję deal'ai</h2>
          {(!data.deals || data.deals.length === 0) ? (
            <div className="empty-state">Nėra deal'ų.</div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Pavadinimas</th>
                  <th>Suma</th>
                  <th>Stage</th>
                </tr>
              </thead>
              <tbody>
                {data.deals?.map((deal) => (
                  <tr key={deal.id}>
                    <td>{deal.title}</td>
                    <td>
                      {deal.amount ?? 0} {deal.currency}
                    </td>
                    <td>
                      <span className="badge">{deal.stage}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

      <section className="card">
        <h2 className="card__title">Veiklos</h2>
        {(!data.activities || data.activities.length === 0) ? (
          <div className="empty-state">Nėra susijusių veiklų.</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Tipas</th>
                <th>Tema</th>
                <th>Būsena</th>
              </tr>
            </thead>
            <tbody>
              {data.activities?.map((activity) => (
                <tr key={activity.id}>
                  <td>{activity.type}</td>
                  <td>{activity.subject || "—"}</td>
                  <td>
                    <span
                      className={`status-pill ${
                        activity.completed ? "status-pill--success" : ""
                      }`}
                    >
                      {activity.completed ? "Užbaigta" : "Atvira"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>

    <section className="card stack">
      <h2 className="card__title">AI laiško atsakymas</h2>
      <p className="page-header__subtitle" style={{ margin: 0 }}>
        Įrašyk trumpą kontekstą (pvz., gauto laiško ištrauką), ir AI paruoš profesionalų atsakymą.
      </p>
      <textarea
        className="textarea"
        placeholder="Pvz.: Klientas teiraujasi apie premium planą ir nuolaidas."
        value={aiPrompt}
        onChange={(e) => setAiPrompt(e.target.value)}
      />
      <button
        className="button button--primary"
        onClick={generateReply}
        disabled={aiLoading || !aiPrompt.trim()}
      >
        {aiLoading ? "Generuojama..." : "Sugeneruoti atsakymą"}
      </button>
      {aiError && (
        <div style={{ color: "var(--color-danger)" }}>{aiError}</div>
      )}
      {aiReply && (
        <div
          style={{
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-sm)",
            padding: 16,
            background: "#f9fafb"
          }}
        >
          <strong>AI pasiūlymas:</strong>
          <p style={{ whiteSpace: "pre-wrap", marginTop: 8 }}>{aiReply}</p>
        </div>
      )}
    </section>
  </div>
);
}
