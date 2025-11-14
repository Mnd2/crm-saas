import { useState } from "react";
import { api } from "../api";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [email, setEmail] = useState("admin@example.com");
  const [password, setPassword] = useState("password");
  const [orgName, setOrgName] = useState("Mano įmonė");
  const [mode, setMode] = useState<"login" | "register">("register");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      if (mode === "register") {
        const res = await api.post("/auth/register", {
          orgName,
          email,
          password
        });
        localStorage.setItem("token", res.data.token);
      } else {
        const res = await api.post("/auth/login", { email, password });
        localStorage.setItem("token", res.data.token);
      }
      navigate("/");
    } catch (err: any) {
      setError(err?.response?.data?.message || "Nepavyko prisijungti");
    }
  };

  return (
    <div className="login-screen">
      <form className="login-card" onSubmit={submit}>
        <h1 style={{ marginTop: 0, marginBottom: 6 }}>Sveikas sugrįžęs 👋</h1>
        <p style={{ color: "var(--color-text-muted)", marginTop: 0 }}>
          Prisijunk arba susikurk organizaciją ir pradėk dirbti su komanda.
        </p>

        <div className="login-toggle">
          <button
            type="button"
            className={mode === "login" ? "active" : ""}
            onClick={() => setMode("login")}
          >
            Prisijungti
          </button>
          <button
            type="button"
            className={mode === "register" ? "active" : ""}
            onClick={() => setMode("register")}
          >
            Registruotis
          </button>
        </div>

        {mode === "register" && (
          <input
            className="input"
            placeholder="Organizacijos pavadinimas"
            value={orgName}
            onChange={(e) => setOrgName(e.target.value)}
          />
        )}
        <input
          className="input"
          placeholder="El. paštas"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
        />
        <input
          className="input"
          placeholder="Slaptažodis"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
        />
        {error && (
          <div style={{ color: "var(--color-danger)", fontSize: "0.9rem" }}>
            {error}
          </div>
        )}
        <button
          type="submit"
          className="button button--primary"
          style={{ width: "100%", marginTop: 12 }}
        >
          {mode === "register" ? "Registruotis" : "Prisijungti"}
        </button>
      </form>
    </div>
  );
}
