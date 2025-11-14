import { useEffect, useState } from "react";
import { api } from "../api";

interface User {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  role: string;
  isActive: boolean;
  createdAt: string;
}

export default function Team() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [role, setRole] = useState("user");

  const load = async () => {
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const res = await api.get<User[]>("/users");
      setUsers(res.data);
    } catch (e: any) {
      setError(
        e?.response?.status === 403
          ? "Reikia administratoriaus teisių, kad matytum komandą."
          : e?.response?.data?.message || "Nepavyko užkrauti vartotojų"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const createUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    try {
      const res = await api.post("/users", {
        email,
        firstName: firstName || undefined,
        lastName: lastName || undefined,
        role
      });

      setMessage(
        `Vartotojas sukurtas. Laikinas slaptažodis: ${res.data.tempPassword}`
      );
      setEmail("");
      setFirstName("");
      setLastName("");
      setRole("user");
      load();
    } catch (e: any) {
      setError(e?.response?.data?.message || "Nepavyko sukurti vartotojo");
    }
  };

  const changeRole = async (id: string, newRole: string) => {
    setError("");
    setMessage("");
    try {
      await api.patch(`/users/${id}/role`, { role: newRole });
      setMessage("Rolė atnaujinta");
      load();
    } catch (e: any) {
      setError(e?.response?.data?.message || "Nepavyko pakeisti rolės");
    }
  };

  const toggleStatus = async (id: string, isActive: boolean) => {
    setError("");
    setMessage("");
    try {
      await api.patch(`/users/${id}/status`, { isActive: !isActive });
      setMessage("Statusas atnaujintas");
      load();
    } catch (e: any) {
      setError(e?.response?.data?.message || "Nepavyko pakeisti statuso");
    }
  };

  return (
    <div className="stack">
      <div className="page-header">
        <h1 className="page-header__title">Komanda</h1>
        <p className="page-header__subtitle">
          Valdyk vartotojus, roles ir aktyvumą vienoje vietoje.
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

      <section className="card">
        <h2 className="card__title">Pridėti naują vartotoją</h2>
        <form className="form-grid" onSubmit={createUser}>
          <input
            className="input"
            placeholder="El. paštas"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            className="input"
            placeholder="Vardas"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
          />
          <input
            className="input"
            placeholder="Pavardė"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
          />
          <select
            className="select"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            <option value="user">User</option>
            <option value="manager">Manager</option>
            <option value="admin">Admin</option>
          </select>
          <button type="submit" className="button button--primary">
            Sukurti
          </button>
        </form>
      </section>

      <section className="card">
        <h2 className="card__title">Visi vartotojai</h2>
        {loading ? (
          <p>Kraunama...</p>
        ) : users.length === 0 ? (
          <div className="empty-state">Dar nėra vartotojų.</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Vardas</th>
                <th>El. paštas</th>
                <th>Rolė</th>
                <th>Statusas</th>
                <th>Sukurtas</th>
                <th>Veiksmai</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>
                    {[u.firstName, u.lastName].filter(Boolean).join(" ") || "—"}
                  </td>
                  <td>{u.email}</td>
                  <td>
                    <span className="badge">{u.role}</span>
                  </td>
                  <td>
                    <span
                      className={`status-pill ${
                        u.isActive ? "status-pill--success" : "status-pill--danger"
                      }`}
                    >
                      {u.isActive ? "Aktyvus" : "Neaktyvus"}
                    </span>
                  </td>
                  <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td>
                    <div className="split">
                      <select
                        className="select"
                        value={u.role}
                        onChange={(e) => changeRole(u.id, e.target.value)}
                      >
                        <option value="user">User</option>
                        <option value="manager">Manager</option>
                        <option value="admin">Admin</option>
                      </select>
                      <button
                        className="button button--secondary"
                        onClick={() => toggleStatus(u.id, u.isActive)}
                      >
                        {u.isActive ? "Deaktyvuoti" : "Aktyvuoti"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
