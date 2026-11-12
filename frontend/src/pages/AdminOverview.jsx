import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import api from "../services/api";

export default function AdminOverview() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get("/agencies"),
      api.get("/emergencies?limit=1000"),
    ]).then(([agRes, emRes]) => {
      const agencies    = agRes.data;
      const emergencies = emRes.data.data;
      setStats({
        total:     agencies.length,
        approved:  agencies.filter((a) => a.status === "APPROVED").length,
        pending:   agencies.filter((a) => a.status === "PENDING").length,
        rejected:  agencies.filter((a) => a.status === "REJECTED").length,
        emOpen:    emergencies.filter((e) => e.status === "OPEN").length,
        emActive:  emergencies.filter((e) => e.status === "IN_PROGRESS").length,
        emResolved:emergencies.filter((e) => e.status === "RESOLVED").length,
        emTotal:   emergencies.length,
      });
    }).finally(() => setLoading(false));
  }, []);

  const statCards = stats ? [
    { label: "Total Agencies",    value: stats.total,      accent: "var(--clr-primary)", sub: "registered" },
    { label: "Approved",          value: stats.approved,   accent: "var(--clr-green)",   sub: "active agencies" },
    { label: "Pending Approval",  value: stats.pending,    accent: "var(--clr-yellow)",  sub: "awaiting review" },
    { label: "Total Emergencies", value: stats.emTotal,    accent: "var(--clr-blue)",    sub: "all time" },
    { label: "Open Emergencies",  value: stats.emOpen,     accent: "var(--clr-red)",     sub: "need response" },
    { label: "In Progress",       value: stats.emActive,   accent: "var(--clr-purple)",  sub: "being handled" },
    { label: "Resolved",          value: stats.emResolved, accent: "var(--clr-green)",   sub: "successfully closed" },
    { label: "Rejected Agencies", value: stats.rejected,   accent: "var(--clr-red)",     sub: "not approved" },
  ] : [];

  return (
    <Layout title="Admin Overview">
      {loading ? (
        <div className="spinner-wrap"><div className="spinner" /></div>
      ) : (
        <>
          <div className="stats-grid">
            {statCards.map((s) => (
              <div key={s.label} className="stat-card" style={{ "--accent": s.accent }}>
                <span className="stat-label">{s.label}</span>
                <span className="stat-value">{s.value}</span>
                <span className="stat-sub">{s.sub}</span>
              </div>
            ))}
          </div>

          <div style={{ background: "var(--clr-surface)", border: "1px solid var(--clr-border)", borderRadius: "var(--radius-lg)", padding: "20px" }}>
            <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Quick Actions</h2>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <a href="/admin/agencies?filter=PENDING" className="btn btn-primary" id="quick-review-agencies">
                Review Pending Agencies ({stats?.pending})
              </a>
              <a href="/admin/emergencies?filter=OPEN" className="btn btn-ghost" id="quick-open-emergencies">
                Open Emergencies ({stats?.emOpen})
              </a>
              <a href="/admin/map" className="btn btn-ghost" id="quick-live-map">
                View Live Map
              </a>
            </div>
          </div>
        </>
      )}
    </Layout>
  );
}
