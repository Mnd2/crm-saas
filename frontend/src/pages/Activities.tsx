import { useEffect, useState } from "react";
import { api } from "../api";

interface Activity {
  id: string;
  type: string;
  subject: string | null;
  description: string | null;
  scheduledAt?: string | null;
  completed: boolean;
}

const activityLabels: Record<string, string> = {
  task: "Task",
  call: "Skambutis",
  email: "Email",
  meeting: "Susitikimas",
  note: "Pastaba"
};

export default function Activities() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(false);
  const [type, setType] = useState("task");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");

  const loadUpcoming = async () => {
    setLoading(true);
    const res = await api.get<Activity[]>("/activities/upcoming");
    setActivities(res.data);
    setLoading(false);
  };

  useEffect(() => {
    loadUpcoming();
  }, []);

  const createActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.post("/activities", {
      type,
      subject: subject || undefined,
      description: description || undefined,
      scheduledAt: scheduledAt || undefined
    });
    setSubject("");
    setDescription("");
    setScheduledAt("");
    loadUpcoming();
  };

  const complete = async (id: string) => {
    await api.patch(`/activities/${id}/complete`);
    loadUpcoming();
  };

  const readableDate = (value?: string | null) =>
    value ? new Date(value).toLocaleString("lt-LT") : "—";

  return (
    <div className="stack">
      <div className="page-header">
        <h1 className="page-header__title">Veiklos</h1>
        <p className="page-header__subtitle">
          Planas ir užduotys artimiausioms dienoms.
        </p>
      </div>

      <div className="card">
        <form className="form-grid" onSubmit={createActivity}>
          <select
            className="select"
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            {Object.keys(activityLabels).map((key) => (
              <option key={key} value={key}>
                {activityLabels[key]}
              </option>
            ))}
          </select>
          <input
            className="input"
            placeholder="Tema"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
          <input
            className="input"
            placeholder="Aprašymas"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <input
            className="input"
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
          />
          <button type="submit" className="button button--primary">
            Pridėti
          </button>
        </form>
      </div>

      <div className="card">
        {loading ? (
          <p>Kraunama...</p>
        ) : activities.length === 0 ? (
          <div className="empty-state">Nėra artėjančių veiklų.</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Tipas</th>
                <th>Tema</th>
                <th>Terminas</th>
                <th>Būsena</th>
                <th>Veiksmai</th>
              </tr>
            </thead>
            <tbody>
              {activities.map((a) => (
                <tr key={a.id}>
                  <td>{activityLabels[a.type] || a.type}</td>
                  <td>{a.subject || "—"}</td>
                  <td>{readableDate(a.scheduledAt)}</td>
                  <td>
                    <span
                      className={`status-pill ${
                        a.completed ? "status-pill--success" : ""
                      }`}
                    >
                      {a.completed ? "Užbaigta" : "Atvira"}
                    </span>
                  </td>
                  <td>
                    {!a.completed && (
                      <button
                        className="button button--secondary"
                        onClick={() => complete(a.id)}
                      >
                        Pažymėti kaip atliktą
                      </button>
                    )}
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
