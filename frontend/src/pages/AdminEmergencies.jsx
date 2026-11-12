import { useEffect, useState, useCallback } from "react";
import Layout from "../components/Layout";
import api from "../services/api";
import { emergencyStatusBadge, formatDate } from "../components/Helpers";

function StatusModal({ emergency, onClose, onUpdated }) {
  const [status, setStatus] = useState(emergency.status);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await api.patch(`/emergencies/${emergency.id}/status`, { status });
      onUpdated();
      onClose();
    } catch (err) {
      alert(err.response?.data?.error ?? "Failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">Update Emergency Status</span>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <p style={{ fontSize: 13, color: "var(--clr-text-muted)", marginBottom: 14 }}>
          <strong style={{ color: "var(--clr-text)" }}>{emergency.title}</strong>
        </p>
        <div className="form-group">
          <label className="form-label">Status</label>
          <select className="form-select" value={status} onChange={(e) => setStatus(e.target.value)} id="emergency-status-select">
            <option value="OPEN">OPEN</option>
            <option value="IN_PROGRESS">IN_PROGRESS</option>
            <option value="RESOLVED">RESOLVED</option>
            <option value="CANCELLED">CANCELLED</option>
          </select>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={saving} id="save-emergency-status">
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminEmergencies() {
  const [data, setData]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState("ALL");
  const [search, setSearch]   = useState("");
  const [selected, setSelected] = useState(null);
  const [page, setPage]       = useState(1);
  const [total, setTotal]     = useState(0);
  const LIMIT = 15;

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ page, limit: LIMIT });
    if (filter !== "ALL") params.append("status", filter);
    api.get(`/emergencies?${params}`)
      .then((r) => { setData(r.data.data); setTotal(r.data.total); })
      .finally(() => setLoading(false));
  }, [page, filter]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [filter]);

  const displayed = data.filter((e) =>
    !search ||
    e.title.toLowerCase().includes(search.toLowerCase()) ||
    e.agency?.name.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <Layout title="Emergency Requests">
      <div className="flex items-center gap-12 mb-24" style={{ flexWrap: "wrap" }}>
        <input
          id="emergency-search"
          className="form-input"
          placeholder="Search by title or agency…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: 260 }}
        />
        <div className="tabs" style={{ marginBottom: 0, borderBottom: "none", gap: 4 }}>
          {["ALL", "OPEN", "IN_PROGRESS", "RESOLVED", "CANCELLED"].map((s) => (
            <button
              key={s}
              className={`tab-btn${filter === s ? " active" : ""}`}
              onClick={() => setFilter(s)}
              id={`em-filter-${s.toLowerCase()}`}
            >
              {s.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">Emergencies ({total})</span>
        </div>

        {loading ? (
          <div className="spinner-wrap"><div className="spinner" /></div>
        ) : displayed.length === 0 ? (
          <div className="empty-state"><p>No emergencies found.</p></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Agency</th>
                  <th>Address</th>
                  <th>Status</th>
                  <th>Responses</th>
                  <th>Reported</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayed.map((e) => (
                  <tr key={e.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{e.title}</div>
                      <div className="text-muted" style={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {e.description}
                      </div>
                    </td>
                    <td>{e.agency?.name ?? "—"}</td>
                    <td className="text-muted">{e.address}</td>
                    <td>{emergencyStatusBadge(e.status)}</td>
                    <td>
                      <span className="badge badge-blue">{e.responses?.length ?? 0} resp.</span>
                    </td>
                    <td className="text-muted">{formatDate(e.createdAt)}</td>
                    <td>
                      <button
                        className="btn btn-ghost btn-sm"
                        id={`em-edit-${e.id}`}
                        onClick={() => setSelected(e)}
                      >
                        Update
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center gap-8 mt-16" style={{ justifyContent: "center" }}>
            <button className="btn btn-ghost btn-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)} id="page-prev">← Prev</button>
            <span className="text-muted">Page {page} / {totalPages}</span>
            <button className="btn btn-ghost btn-sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)} id="page-next">Next →</button>
          </div>
        )}
      </div>

      {selected && (
        <StatusModal emergency={selected} onClose={() => setSelected(null)} onUpdated={load} />
      )}
    </Layout>
  );
}
