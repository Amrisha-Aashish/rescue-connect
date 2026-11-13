import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Layout from "../components/Layout";
import api from "../services/api";
import { emergencyStatusBadge, formatDate } from "../components/Helpers";

const FILTERS = ["ALL", "OPEN", "IN_PROGRESS", "RESOLVED", "CANCELLED"];
const LIMIT = 15;

function StatusModal({ emergency, onClose, onUpdated }) {
  const [status, setStatus] = useState(emergency.status);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      await api.patch(`/emergencies/${emergency.id}/status`, { status });
      await onUpdated();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error ?? "Could not update this emergency. Try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="emergency-status-title">
        <div className="modal-header">
          <div><p className="admin-eyebrow">Emergency management</p><h2 className="modal-title" id="emergency-status-title">Update status</h2></div>
          <button className="modal-close" type="button" aria-label="Close dialog" onClick={onClose}>×</button>
        </div>
        <p className="modal-context">Choose a status for <strong>{emergency.title}</strong>.</p>
        <div className="form-group"><label className="form-label" htmlFor="emergency-status-select">New status</label>
          <select className="form-select" value={status} onChange={(event) => setStatus(event.target.value)} id="emergency-status-select">
            <option value="OPEN">Open</option><option value="IN_PROGRESS">In progress</option><option value="RESOLVED">Resolved</option><option value="CANCELLED">Cancelled</option>
          </select>
        </div>
        {error && <p className="admin-inline-error" role="alert">{error}</p>}
        <div className="modal-footer"><button className="btn btn-ghost" type="button" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn btn-primary" type="button" onClick={save} disabled={saving || status === emergency.status} id="save-emergency-status">{saving ? "Saving…" : "Save status"}</button></div>
      </div>
    </div>
  );
}

export default function AdminEmergencies() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedFilter = searchParams.get("filter")?.toUpperCase();
  const filter = FILTERS.includes(requestedFilter) ? requestedFilter : "ALL";

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const params = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
    if (filter !== "ALL") params.set("status", filter);
    try {
      const response = await api.get(`/emergencies?${params}`);
      setData(Array.isArray(response.data?.data) ? response.data.data : []);
      setTotal(Number(response.data?.total) || 0);
    } catch (err) {
      setError(err.response?.data?.error ?? "Could not load emergencies. Check your connection and try again.");
      setData([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [filter, page]);

  useEffect(() => { load(); }, [load]);

  const displayed = useMemo(() => {
    const term = search.trim().toLocaleLowerCase();
    if (!term) return data;
    return data.filter((emergency) => [emergency.title, emergency.agency?.name, emergency.address, emergency.description]
      .some((value) => value?.toLocaleLowerCase().includes(term)));
  }, [data, search]);
  const totalPages = Math.ceil(total / LIMIT);

  const changeFilter = (status) => {
    setPage(1);
    setSearch("");
    setSearchParams(status === "ALL" ? {} : { filter: status });
  };

  return (
    <Layout title="Emergency Management">
      <section className="admin-page">
        <div className="admin-page-heading">
          <div><p className="admin-eyebrow">Incident response</p><h1>Emergency management</h1>
            <p className="admin-intro">Monitor incoming requests and keep response statuses current.</p></div>
          <button className="btn btn-ghost" type="button" onClick={load} disabled={loading}>{loading ? "Refreshing…" : "Refresh list"}</button>
        </div>
        {error && <div className="admin-alert" role="alert"><span>{error}</span><button className="btn btn-ghost btn-sm" onClick={load}>Retry</button></div>}

        <div className="admin-toolbar admin-toolbar-stacked">
          <label className="admin-search-wrap" htmlFor="emergency-search"><span className="sr-only">Search emergencies on this page</span>
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>
            <input id="emergency-search" className="form-input" placeholder="Search title, agency or location on this page" value={search} onChange={(event) => setSearch(event.target.value)} />
          </label>
          <div className="tabs admin-tabs" role="tablist" aria-label="Filter emergencies">
            {FILTERS.map((status) => <button key={status} type="button" role="tab" aria-selected={filter === status}
              className={`tab-btn${filter === status ? " active" : ""}`} onClick={() => changeFilter(status)} id={`em-filter-${status.toLowerCase()}`}>
              {status === "ALL" ? "All" : status.replace("_", " ")}
            </button>)}
          </div>
        </div>

        <div className="card admin-table-card">
          <div className="card-header"><div><h2 className="card-title">Emergency requests</h2>
            <p className="admin-card-subtitle">{loading ? "Loading records…" : `${total.toLocaleString()} total${totalPages > 1 ? ` · Page ${page} of ${totalPages}` : ""}`}</p></div></div>
          {loading ? <div className="spinner-wrap" role="status" aria-label="Loading emergencies"><div className="spinner" /></div> : displayed.length === 0 ? (
            <div className="empty-state"><p>{total === 0 ? "No emergencies in this status." : search ? "No emergencies on this page match your search." : "No emergencies to show."}</p>
              {search && <button className="btn btn-ghost btn-sm" onClick={() => setSearch("")}>Clear search</button>}</div>
          ) : (
            <div className="table-wrap"><table className="admin-table"><thead><tr><th>Request</th><th>Agency</th><th>Location</th><th>Status</th><th>Responses</th><th>Reported</th><th><span className="sr-only">Actions</span></th></tr></thead>
              <tbody>{displayed.map((emergency) => <tr key={emergency.id}>
                <td><div className="admin-primary-cell">{emergency.title || "Untitled request"}</div><div className="admin-secondary-cell admin-description" title={emergency.description}>{emergency.description || "No description provided"}</div></td>
                <td>{emergency.agency?.name || "—"}</td><td>{emergency.address || "—"}</td><td>{emergencyStatusBadge(emergency.status)}</td>
                <td><span className="badge badge-blue">{emergency.responses?.length ?? 0} {emergency.responses?.length === 1 ? "response" : "responses"}</span></td><td>{formatDate(emergency.createdAt)}</td>
                <td><button className="btn btn-ghost btn-sm" type="button" onClick={() => setSelected(emergency)} id={`em-edit-${emergency.id}`}>Update</button></td>
              </tr>)}</tbody>
            </table></div>
          )}
          {!loading && totalPages > 1 && <div className="admin-pagination">
            <button className="btn btn-ghost btn-sm" type="button" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))} id="page-prev">← Previous</button>
            <span aria-live="polite">Page {page} of {totalPages}</span>
            <button className="btn btn-ghost btn-sm" type="button" disabled={page >= totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))} id="page-next">Next →</button>
          </div>}
        </div>
      </section>
      {selected && <StatusModal emergency={selected} onClose={() => setSelected(null)} onUpdated={load} />}
    </Layout>
  );
}
