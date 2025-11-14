import { useEffect, useState } from "react";
import { api } from "../api";

interface PipelineRow {
  stage: string;
  totalAmount: number;
  count: number;
}

interface ActivitySummaryRow {
  type: string;
  completed: boolean;
  count: number;
}

export default function Dashboard() {
  const [pipeline, setPipeline] = useState<PipelineRow[]>([]);
  const [activities, setActivities] = useState<ActivitySummaryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [pipelineRes, activitiesRes] = await Promise.all([
        api.get<PipelineRow[]>("/analytics/pipeline"),
        api.get<ActivitySummaryRow[]>("/analytics/activities-summary")
      ]);
      setPipeline(pipelineRes.data);
      setActivities(activitiesRes.data);
    } catch (e: any) {
      setError(e?.response?.data?.message || "Nepavyko užkrauti duomenų");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const maxAmount = pipeline.reduce(
    (max, row) => (row.totalAmount > max ? row.totalAmount : max),
    0
  );

  return (
    <div className="stack">
      <div className="page-header">
        <h1 className="page-header__title">Dashboard</h1>
        <p className="page-header__subtitle">
          Realaus laiko pardavimų ir komandos veiklų pulsas.
        </p>
      </div>

      {error && (
        <div className="card" style={{ color: "var(--color-danger)" }}>
          {error}
        </div>
      )}
      {loading && <div className="card">Kraunama...</div>}

      {!loading && (
        <div className="grid grid--two">
          <section className="card">
            <h2 className="card__title">Pardavimų pipeline</h2>
            {pipeline.length === 0 ? (
              <div className="empty-state">Nėra deal'ų duomenų.</div>
            ) : (
              <div className="stack">
                {pipeline.map((row) => {
                  const width =
                    maxAmount > 0 ? `${(row.totalAmount / maxAmount) * 100}%` : "0%";
                  return (
                    <div key={row.stage} className="stack">
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: 14
                        }}
                      >
                        <span>{row.stage}</span>
                        <span>
                          {row.totalAmount.toFixed(2)} € ({row.count} deal'ai)
                        </span>
                      </div>
                      <div
                        style={{
                          height: 10,
                          borderRadius: 999,
                          background: "#e3e8ff"
                        }}
                      >
                        <div
                          style={{
                            height: "100%",
                            borderRadius: 999,
                            width,
                            background: "var(--color-primary)",
                            transition: "width 0.3s ease"
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className="card">
            <h2 className="card__title">Veiklos santrauka</h2>
            {activities.length === 0 ? (
              <div className="empty-state">Nėra veiklų duomenų.</div>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Tipas</th>
                    <th>Būsena</th>
                    <th>Kiekis</th>
                  </tr>
                </thead>
                <tbody>
                  {activities.map((row, idx) => (
                    <tr key={idx}>
                      <td>{row.type}</td>
                      <td>
                        <span
                          className={`status-pill ${
                            row.completed ? "status-pill--success" : ""
                          }`}
                        >
                          {row.completed ? "Užbaigta" : "Atvira"}
                        </span>
                      </td>
                      <td>{row.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
