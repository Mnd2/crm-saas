import { useState } from "react";
import { api } from "../api";

interface LeadScoreResponse {
  score: number;
  reasons: string[];
  priority: "low" | "medium" | "high";
  suggestedActions: string[];
}

const priorityCopy: Record<LeadScoreResponse["priority"], string> = {
  high: "Aukštas prioritetas",
  medium: "Vidutinis prioritetas",
  low: "Žemas prioritetas"
};

export default function LeadScore() {
  const [lifecycleStage, setLifecycleStage] = useState("lead");
  const [lastOrderAmount, setLastOrderAmount] = useState("");
  const [totalOrders, setTotalOrders] = useState("");
  const [emailOpens, setEmailOpens] = useState("");
  const [pageViews, setPageViews] = useState("");
  const [daysSinceLastOrder, setDaysSinceLastOrder] = useState("");
  const [daysSinceLastActivity, setDaysSinceLastActivity] = useState("");

  const [result, setResult] = useState<LeadScoreResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const calculate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await api.post<LeadScoreResponse>("/ai/lead-score", {
        lifecycleStage,
        lastOrderAmount: lastOrderAmount ? Number(lastOrderAmount) : undefined,
        totalOrders: totalOrders ? Number(totalOrders) : undefined,
        emailOpens: emailOpens ? Number(emailOpens) : undefined,
        pageViews: pageViews ? Number(pageViews) : undefined,
        daysSinceLastOrder: daysSinceLastOrder
          ? Number(daysSinceLastOrder)
          : undefined,
        daysSinceLastActivity: daysSinceLastActivity
          ? Number(daysSinceLastActivity)
          : undefined
      });
      setResult(res.data);
    } catch (e: any) {
      setError(e?.response?.data?.message || "Nepavyko gauti įvertinimo");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="stack" style={{ maxWidth: 760 }}>
      <div className="page-header">
        <h1 className="page-header__title">AI Lead Scoring</h1>
        <p className="page-header__subtitle">
          Taisyklėmis grįstas įvertinimas, padedantis suprasti kur sutelkti
          dėmesį.
        </p>
      </div>

      <div className="card">
        <form className="form-grid" onSubmit={calculate}>
          <label>
            Lifecycle stage
            <select
              className="select"
              value={lifecycleStage}
              onChange={(e) => setLifecycleStage(e.target.value)}
            >
              <option value="lead">Lead</option>
              <option value="customer">Customer</option>
              <option value="churn-risk">Churn risk</option>
            </select>
          </label>

          <label>
            Paskutinio užsakymo suma €
            <input
              className="input"
              type="number"
              value={lastOrderAmount}
              onChange={(e) => setLastOrderAmount(e.target.value)}
            />
          </label>

          <label>
            Viso užsakymų skaičius
            <input
              className="input"
              type="number"
              value={totalOrders}
              onChange={(e) => setTotalOrders(e.target.value)}
            />
          </label>

          <label>
            El. laiškų atidarymai
            <input
              className="input"
              type="number"
              value={emailOpens}
              onChange={(e) => setEmailOpens(e.target.value)}
            />
          </label>

          <label>
            Puslapių peržiūros
            <input
              className="input"
              type="number"
              value={pageViews}
              onChange={(e) => setPageViews(e.target.value)}
            />
          </label>

          <label>
            Dienos nuo paskutinio užsakymo
            <input
              className="input"
              type="number"
              value={daysSinceLastOrder}
              onChange={(e) => setDaysSinceLastOrder(e.target.value)}
            />
          </label>

          <label>
            Dienos nuo paskutinio kontakto/veiklos
            <input
              className="input"
              type="number"
              value={daysSinceLastActivity}
              onChange={(e) => setDaysSinceLastActivity(e.target.value)}
            />
          </label>

          <button
            type="submit"
            className="button button--primary"
            disabled={loading}
          >
            {loading ? "Skaičiuojama..." : "Gauti įvertinimą"}
          </button>
        </form>

        {error && (
          <div style={{ color: "var(--color-danger)", marginTop: 12 }}>
            {error}
          </div>
        )}
      </div>

      {result && (
        <div className="card">
          <div className="grid grid--two">
            <div>
              <h2 className="card__title">Rezultatas</h2>
              <p
                style={{
                  fontSize: 36,
                  margin: "8px 0",
                  fontWeight: 700
                }}
              >
                {result.score} / 100
              </p>
              <p
                className="status-pill"
                style={{
                  background:
                    result.priority === "high"
                      ? "#dcfce7"
                      : result.priority === "medium"
                      ? "#fef3c7"
                      : "#e5e7eb",
                  color:
                    result.priority === "high"
                      ? "var(--color-success)"
                      : result.priority === "medium"
                      ? "#ea580c"
                      : "#6b7280"
                }}
              >
                {priorityCopy[result.priority]}
              </p>
              <ul>
                {result.reasons.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>

            <div>
              <h2 className="card__title">Rekomenduojami veiksmai</h2>
              {result.suggestedActions.length === 0 ? (
                <div className="empty-state">Nėra specifinių rekomendacijų.</div>
              ) : (
                <ul>
                  {result.suggestedActions.map((a, i) => (
                    <li key={i}>{a}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
