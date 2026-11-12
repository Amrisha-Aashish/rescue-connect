import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import Layout from "../components/Layout";
import api from "../services/api";
import { emergencyStatusBadge, availabilityBadge, formatDate } from "../components/Helpers";

function NewEmergencyModal({ agencyId, onClose, onCreated }) {
  const [form, setForm] = useState({ title: "", description: "", address: "", latitude: "", longitude: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await api.post("/emergencies", { ...form });
      onCreated();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error ?? "Failed to submit");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 560 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">Report Emergency</span>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <form onSubmit={save}>
          {error && <div className="auth-error mb-16">{error}</div>}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div className="form-group">
              <label className="form-label">Title</label>
              <input id="em-title" className="form-input" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea id="em-desc" className="form-textarea" required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Address</label>
              <input id="em-address" className="form-input" required value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Latitude</label>
                <input id="em-lat" className="form-input" type="number" step="any" required value={form.latitude} onChange={(e) => setForm({ ...form, latitude: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Longitude</label>
                <input id="em-lng" className="form-input" type="number" step="any" required value={form.longitude} onChange={(e) => setForm({ ...form, longitude: e.target.value })} />
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving} id="submit-emergency">
              {saving ? "Submitting…" : "Submit Emergency"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AgencyDashboard() {
  const { user } = useAuth();
  const [agency, setAgency]       = useState(null);
  const [emergencies, setEmergencies] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showNew, setShowNew]     = useState(false);
  const [updatingAv, setUpdatingAv] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([
      api.get("/agencies"),
      api.get("/emergencies"),
    ]).then(([agRes, emRes]) => {
      setAgency(agRes.data);
      setEmergencies(emRes.data.data ?? []);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const setAvailability = async (av) => {
    setUpdatingAv(true);
    try {
      const { data } = await api.patch("/agencies/me/availability", { availability: av });
      setAgency(data);
    } catch (err) { alert(err.response?.data?.error ?? "Failed"); }
    finally { setUpdatingAv(false); }
  };

  if (loading) return <Layout title="Dashboard"><div className="spinner-wrap"><div className="spinner" /></div></Layout>;

  const stats = [
    { label: "Total Requests",  value: emergencies.length,                                    accent: "var(--clr-primary)" },
    { label: "Open",            value: emergencies.filter(e => e.status === "OPEN").length,   accent: "var(--clr-red)" },
    { label: "In Progress",     value: emergencies.filter(e => e.status === "IN_PROGRESS").length, accent: "var(--clr-yellow)" },
    { label: "Resolved",        value: emergencies.filter(e => e.status === "RESOLVED").length, accent: "var(--clr-green)" },
  ];

  return (
    <Layout title="Agency Dashboard">
      {/* Agency header card */}
      {agency && (
        <div className="card mb-24">
          <div className="flex items-center justify-between" style={{ flexWrap: "wrap", gap: 12 }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>{agency.name}</div>
              <div className="text-muted">{agency.registrationNumber} · {agency.phone}</div>
              <div style={{ marginTop: 6, display: "flex", gap: 8 }}>
                {agency.status === "PENDING"  && <span className="badge badge-yellow">⏳ Awaiting Approval</span>}
                {agency.status === "APPROVED" && <span className="badge badge-green">✓ Approved</span>}
                {agency.status === "REJECTED" && <span className="badge badge-red">✗ Rejected</span>}
                {availabilityBadge(agency.availability)}
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span className="text-muted" style={{ fontSize: 12 }}>Set availability:</span>
              {["AVAILABLE", "BUSY", "UNAVAILABLE"].map((av) => (
                <button
                  key={av}
                  id={`set-av-${av.toLowerCase()}`}
                  className={`btn btn-sm ${agency.availability === av ? "btn-primary" : "btn-ghost"}`}
                  disabled={updatingAv || agency.availability === av}
                  onClick={() => setAvailability(av)}
                >
                  {av}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="stats-grid">
        {stats.map((s) => (
          <div key={s.label} className="stat-card" style={{ "--accent": s.accent }}>
            <span className="stat-label">{s.label}</span>
            <span className="stat-value">{s.value}</span>
          </div>
        ))}
      </div>

      {/* Emergencies table */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">My Emergency Requests</span>
          {agency?.status === "APPROVED" && (
            <button className="btn btn-primary btn-sm" id="new-emergency-btn" onClick={() => setShowNew(true)}>
              + Report Emergency
            </button>
          )}
        </div>

        {emergencies.length === 0 ? (
          <div className="empty-state"><p>No emergency requests yet.</p></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Title</th><th>Address</th><th>Status</th><th>Responses</th><th>Reported</th></tr>
              </thead>
              <tbody>
                {emergencies.map((e) => (
                  <tr key={e.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{e.title}</div>
                      <div className="text-muted" style={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.description}</div>
                    </td>
                    <td className="text-muted">{e.address}</td>
                    <td>{emergencyStatusBadge(e.status)}</td>
                    <td><span className="badge badge-blue">{e.responses?.length ?? 0}</span></td>
                    <td className="text-muted">{formatDate(e.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showNew && (
        <NewEmergencyModal onClose={() => setShowNew(false)} onCreated={load} />
      )}
    </Layout>
  );
}
