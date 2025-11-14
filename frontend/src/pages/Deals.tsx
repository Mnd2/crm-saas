import { useEffect, useState } from "react";
import { api } from "../api";

interface Deal {
  id: string;
  title: string;
  amount: number | null;
  currency: string;
  stage: string;
}

export default function Deals() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [stage, setStage] = useState("prospecting");

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get("/deals");
      setDeals(res.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const createDeal = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.post("/deals", {
      title,
      amount: amount ? Number(amount) : undefined,
      stage
    });
    setTitle("");
    setAmount("");
    setStage("prospecting");
    load();
  };

  return (
    <div className="stack">
      <div className="page-header">
        <h1 className="page-header__title">Deal'ai</h1>
        <p className="page-header__subtitle">
          Stebėk pipeline ir pridėk naujus sandorius vienoje vietoje.
        </p>
      </div>

      <div className="card">
        <form className="form-grid" onSubmit={createDeal}>
          <input
            className="input"
            placeholder="Pavadinimas"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
          <input
            className="input"
            placeholder="Suma"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            type="number"
            min={0}
          />
          <select
            className="select"
            value={stage}
            onChange={(e) => setStage(e.target.value)}
          >
            <option value="prospecting">Prospecting</option>
            <option value="qualified">Qualified</option>
            <option value="proposal">Proposal</option>
            <option value="negotiation">Negotiation</option>
            <option value="won">Won</option>
            <option value="lost">Lost</option>
          </select>
          <button type="submit" className="button button--primary">
            Pridėti
          </button>
        </form>
      </div>

      <div className="card">
        {loading ? (
          <p>Kraunama...</p>
        ) : deals.length === 0 ? (
          <div className="empty-state">Dar nėra deal'ų.</div>
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
              {deals.map((d) => (
                <tr key={d.id}>
                  <td>{d.title}</td>
                  <td>
                    {d.amount ?? 0} {d.currency}
                  </td>
                  <td>
                    <span className="badge">{d.stage}</span>
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
