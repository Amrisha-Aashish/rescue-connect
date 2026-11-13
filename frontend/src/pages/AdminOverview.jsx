import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Layout from "../components/Layout";
import api from "../services/api";

export default function AdminOverview() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [agRes, emRes] = await Promise.all([
        api.get("/agencies"),
        api.get("/emergencies?page=1&limit=1"),
      ]);
      const agencies = Array.isArray(agRes.data) ? agRes.data : [];
      const total = Number(emRes.data?.total) || 0;
      const pageSize = Math.min(total || 1, 100);
      const pages = Math.ceil(total / pageSize);
      const emergencyPages = await Promise.all(
        Array.from({ length: pages }, (_, index) =>
          api.get(`/emergencies?page=${index + 1}&limit=${pageSize}`)
        )
      );
      const emergencies = emergencyPages.flatMap((res) =>
        Array.isArray(res.data?.data) ? res.data.data : []
      );
      setStats({
        total: agencies.length,
        approved: agencies.filter((agency) => agency.status === "APPROVED").length,
        pending: agencies.filter((agency) => agency.status === "PENDING").length,
        rejected: agencies.filter((agency) => agency.status === "REJECTED").length,
        emOpen: emergencies.filter((emergency) => emergency.status === "OPEN").length,
        emActive: emergencies.filter((emergency) => emergency.status === "IN_PROGRESS").length,
        emResolved: emergencies.filter((emergency) => emergency.status === "RESOLVED").length,
        emTotal: total,
      });
    } catch (err) {
      setError(err.response?.data?.error ?? "Could not load the admin overview. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const statCards = stats ? [
    { label: "Total agencies", value: stats.total, accent: "var(--clr-primary)", sub: "registered", to: "/admin/agencies" },
    { label: "Approved", value: stats.approved, accent: "var(--clr-green)", sub: "active agencies", to: "/admin/agencies?filter=APPROVED" },
    { label: "Pending approval", value: stats.pending, accent: "var(--clr-yellow)", sub: "awaiting review", to: "/admin/agencies?filter=PENDING" },
    { label: "Total emergencies", value: stats.emTotal, accent: "var(--clr-blue)", sub: "all requests", to: "/admin/emergencies" },
    { label: "Open emergencies", value: stats.emOpen, accent: "var(--clr-red)", sub: "need response", to: "/admin/emergencies?filter=OPEN" },
    { label: "In progress", value: stats.emActive, accent: "var(--clr-purple)", sub: "being handled", to: "/admin/emergencies?filter=IN_PROGRESS" },
    { label: "Resolved", value: stats.emResolved, accent: "var(--clr-green)", sub: "successfully closed", to: "/admin/emergencies?filter=RESOLVED" },
    { label: "Rejected agencies", value: stats.rejected, accent: "var(--clr-red)", sub: "not approved", to: "/admin/agencies?filter=REJECTED" },
  ] : [];

  return (
    <Layout title="Admin Overview">
      <section className="admin-page">
        <div className="admin-page-heading">
          <div>
            <p className="admin-eyebrow">Operations</p>
            <h1>Admin overview</h1>
            <p className="admin-intro">A live snapshot of agency approvals and emergency response activity.</p>
          </div>
          <button className="btn btn-ghost" type="button" onClick={load} disabled={loading}>
            {loading ? "Refreshing…" : "Refresh data"}
          </button>
        </div>

        {error && <div className="admin-alert" role="alert"><span>{error}</span><button className="btn btn-ghost btn-sm" onClick={load}>Retry</button></div>}
        {loading && !stats ? (
          <div className="spinner-wrap" role="status" aria-label="Loading overview"><div className="spinner" /></div>
        ) : stats && (
          <>
            <div className="stats-grid admin-stats-grid">
              {statCards.map((stat) => (
                <Link key={stat.label} to={stat.to} className="stat-card admin-stat-card" style={{ "--accent": stat.accent }}>
                  <span className="stat-label">{stat.label}</span>
                  <span className="stat-value">{stat.value.toLocaleString()}</span>
                  <span className="stat-sub">{stat.sub}</span>
                </Link>
              ))}
            </div>
            <div className="card admin-actions-card">
              <div>
                <p className="admin-eyebrow">Next steps</p>
                <h2>Quick actions</h2>
              </div>
              <div className="admin-action-links">
                <Link to="/admin/agencies?filter=PENDING" className="btn btn-primary" id="quick-review-agencies">
                  Review pending agencies <span className="action-count">{stats.pending}</span>
                </Link>
                <Link to="/admin/emergencies?filter=OPEN" className="btn btn-ghost" id="quick-open-emergencies">
                  View open emergencies <span className="action-count">{stats.emOpen}</span>
                </Link>
                <Link to="/admin/map" className="btn btn-ghost" id="quick-live-map">View live map</Link>
              </div>
            </div>
          </>
        )}
      </section>
    </Layout>
  );
}
