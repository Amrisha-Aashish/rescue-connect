import { useEffect, useState, useCallback } from "react";
import Layout from "../components/Layout";
import api from "../services/api";
import { agencyStatusBadge, availabilityBadge, formatDate } from "../components/Helpers";

function StatusModal({ agency, onClose, onUpdated }) {
  const [status, setStatus] = useState(agency.status);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await api.patch(`/agencies/${agency.id}/status`, { status });
      onUpdated();
      onClose();
    } catch (err) {
      alert(err.response?.data?.error ?? "Failed to update status");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">Update Agency Status</span>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <p style={{ marginBottom: 14, fontSize: 13, color: "var(--clr-text-muted)" }}>
          Agency: <strong style={{ color: "var(--clr-text)" }}>{agency.name}</strong>
        </p>

        <div className="form-group">
          <label className="form-label">New Status</label>
          <select className="form-select" value={status} onChange={(e) => setStatus(e.target.value)} id="agency-status-select">
            <option value="PENDING">PENDING</option>
            <option value="APPROVED">APPROVED</option>
            <option value="REJECTED">REJECTED</option>
          </select>
        </div>

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={saving} id="save-agency-status">
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AgenciesPage() {
  const [agencies, setAgencies] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState("ALL");
  const [search, setSearch]     = useState("");
  const [selected, setSelected] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    api.get("/agencies")
      .then((r) => setAgencies(Array.isArray(r.data) ? r.data : [r.data]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id) => {
    if (!confirm("Delete this agency permanently?")) return;
    setDeleting(id);
    try { await api.delete(`/agencies/${id}`); load(); }
    catch (err) { alert(err.response?.data?.error ?? "Delete failed"); }
    finally { setDeleting(null); }
  };

  const filtered = agencies.filter((a) => {
    const matchStatus = filter === "ALL" || a.status === filter;
    const matchSearch = !search || a.name.toLowerCase().includes(search.toLowerCase()) ||
                        a.registrationNumber?.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  return (
    <Layout title="Agency Management">
      {/* Filters */}
      <div className="flex items-center gap-12 mb-24" style={{ flexWrap: "wrap" }}>
        <input
          id="agency-search"
          className="form-input"
          placeholder="Search by name or reg. number…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: 260 }}
        />
        <div className="tabs" style={{ marginBottom: 0, borderBottom: "none", gap: 4 }}>
          {["ALL", "PENDING", "APPROVED", "REJECTED"].map((s) => (
            <button
              key={s}
              className={`tab-btn${filter === s ? " active" : ""}`}
              onClick={() => setFilter(s)}
              id={`filter-${s.toLowerCase()}`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">Registered Agencies ({filtered.length})</span>
        </div>

        {loading ? (
          <div className="spinner-wrap"><div className="spinner" /></div>
        ) : filtered.length === 0 ? (
          <div className="empty-state"><p>No agencies found.</p></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Reg. Number</th>
                  <th>Phone</th>
                  <th>Status</th>
                  <th>Availability</th>
                  <th>Registered</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{a.name}</div>
                      <div className="text-muted">{a.user?.email}</div>
                    </td>
                    <td className="text-muted">{a.registrationNumber}</td>
                    <td>{a.phone}</td>
                    <td>{agencyStatusBadge(a.status)}</td>
                    <td>{availabilityBadge(a.availability)}</td>
                    <td className="text-muted">{formatDate(a.createdAt)}</td>
                    <td>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          className="btn btn-ghost btn-sm"
                          id={`edit-agency-${a.id}`}
                          onClick={() => setSelected(a)}
                        >
                          Edit Status
                        </button>
                        <button
                          className="btn btn-danger btn-sm"
                          id={`delete-agency-${a.id}`}
                          disabled={deleting === a.id}
                          onClick={() => handleDelete(a.id)}
                        >
                          {deleting === a.id ? "…" : "Delete"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selected && (
        <StatusModal agency={selected} onClose={() => setSelected(null)} onUpdated={load} />
      )}
    </Layout>
  );
}
