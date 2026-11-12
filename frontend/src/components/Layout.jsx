import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const icons = {
  dashboard: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
      <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
    </svg>
  ),
  agencies: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
      <polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  ),
  emergencies: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/>
      <line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  ),
  map: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/>
      <line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/>
    </svg>
  ),
  logout: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
      <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  ),
};

export default function Layout({ children, title }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === "SUPER_ADMIN";

  const handleLogout = () => { logout(); navigate("/login"); };

  const adminLinks = [
    { to: "/admin",             label: "Overview",    icon: icons.dashboard },
    { to: "/admin/agencies",    label: "Agencies",    icon: icons.agencies },
    { to: "/admin/emergencies", label: "Emergencies", icon: icons.emergencies },
    { to: "/admin/map",         label: "Live Map",    icon: icons.map },
  ];

  const agencyLinks = [
    { to: "/dashboard",             label: "Dashboard",   icon: icons.dashboard },
    { to: "/dashboard/emergencies", label: "My Requests", icon: icons.emergencies },
    { to: "/dashboard/profile",     label: "Profile",     icon: icons.agencies },
  ];

  const links = isAdmin ? adminLinks : agencyLinks;

  return (
    <div className="app-shell">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
          <span>Rescue Connect</span>
        </div>

        <nav className="sidebar-nav">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end
              className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}
            >
              {l.icon}
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--clr-text)" }}>{user?.email}</div>
            <div className="text-muted">{user?.role === "SUPER_ADMIN" ? "Super Admin" : "Agency"}</div>
          </div>
          <button className="btn btn-ghost btn-sm w-full" onClick={handleLogout} id="logout-btn">
            {icons.logout} Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="main-content">
        <header className="topbar">
          <span className="topbar-title">{title}</span>
          <div className="topbar-right">
            <div className="badge badge-orange" style={{ fontSize: 11 }}>
              {user?.role === "SUPER_ADMIN" ? "Admin" : "Agency"}
            </div>
          </div>
        </header>
        <main className="page">{children}</main>
      </div>
    </div>
  );
}
