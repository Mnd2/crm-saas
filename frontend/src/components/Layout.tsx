import { Link, useLocation, useNavigate } from "react-router-dom";
import { isLoggedIn } from "./ProtectedRoute";

const links = [
  { to: "/", label: "Dashboard" },
  { to: "/contacts", label: "Kontaktai" },
  { to: "/deals", label: "Deal'ai" },
  { to: "/activities", label: "Veiklos" },
  { to: "/team", label: "Komanda" },
  { to: "/settings", label: "Nustatymai" },
  { to: "/lead-score", label: "Lead scoring" }
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();

  const logout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar__logo">NovaCRM</div>
        <nav className="sidebar__nav">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`sidebar__link${
                location.pathname === link.to ? " sidebar__link--active" : ""
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        {isLoggedIn() && (
          <div className="sidebar__footer">
            <button className="button button--ghost" onClick={logout}>
              Atsijungti
            </button>
          </div>
        )}
      </aside>
      <div className="content">
        <div className="content__inner">{children}</div>
      </div>
    </div>
  );
}
