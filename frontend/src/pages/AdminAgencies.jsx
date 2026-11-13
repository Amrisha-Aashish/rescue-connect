import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Layout from "../components/Layout";
import api from "../services/api";
import { agencyStatusBadge, availabilityBadge, formatDate } from "../components/Helpers";

const FILTERS = ["ALL", "PENDING", "APPROVED", "REJECTED"];

function StatusModal({ agency, onClose, onUpdated }) {
  const [status, setStatus] = useState(agency.status);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      await api.patch(`/agencies/${agency.id}/status`, { status });
      await onUpdated();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error ?? "Could not update this agency. Try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="agency-status-title">
        <div className="modal-header">
          <div><p className="admin-eyebrow">Agency review</p><h2 className="modal-title" id="agency-status-title">Update status</h2></div>
          <button className="modal-close" type="button" aria-label="Close dialog" onClick={onClose}>×</button>
        </div>
        <p className="modal-context">Set the approval status for <strong>{agency.name}</strong>.</p>
        <div className="form-group">
          <label className="form-label" htmlFor="agency-status-select">New status</label>
          <select className="form-select" value={status} onChange={(event) => setStatus(event.target.value)} id="agency-status-select">
            <option value="PENDING">Pending</option><option value="APPROVED">Approved</option><option value="REJECTED">Rejected</option>
          </select>
        </div>
        {error && <p className="admin-inline-error" role="alert">{error}</p>}
        <div className="modal-footer">
          <button className="btn btn-ghost" type="button" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn btn-primary" type="button" onClick={save} disabled={saving || status === agency.status} id="save-agency-status">
            {saving ? "Saving…" : "Save status"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminAgencies() {
  const [agencies, setAgencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedFilter = searchParams.get("filter")?.toUpperCase();
  const filter = FILTERS.includes(requestedFilter) ? requestedFilter : "ALL";

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get("/agencies");
      setAgencies(Array.isArray(response.data) ? response.data : response.data ? [response.data] : []);
    } catch (err) {
      setError(err.response?.data?.error ?? "Could not load agencies. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const counts = useMemo(() => FILTERS.reduce((result, status) => {
    result[status] = status === "ALL" ? agencies.length : agencies.filter((agency) => agency.status === status).length;
    return result;
  }, {}), [agencies]);

  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase();
    return agencies.filter((agency) => {
      const matchesStatus = filter === "ALL" || agency.status === filter;
      const matchesSearch = !term || [agency.name, agency.registrationNumber, agency.user?.email, agency.phone]
        .some((value) => value?.toLocaleLowerCase().includes(term));
      return matchesStatus && matchesSearch;
    });
  }, [agencies, filter, search]);

  const handleDelete = async (agency) => {
    if (!window.confirm(`Delete ${agency.name} permanently? This action cannot be undone.`)) return;
    setDeleting(agency.id);
    setError("");
    try {
      await api.delete(`/agencies/${agency.id}`);
      await load();
    } catch (err) {
      setError(err.response?.data?.error ?? `Could not delete ${agency.name}. Try again.`);
    } finally {
      setDeleting(null);
    }
  };

  return (
    <Layout title="Agency Approval">
      <section className="admin-page">
        <div className="admin-page-heading">
          <div>
            <p className="admin-eyebrow">Organization access</p>
            <h1>Agency approval</h1>
            <p className="admin-intro">Review registration details and manage agency access to Rescue Connect.</p>
          </div>
          <button className="btn btn-ghost" type="button" onClick={load} disabled={loading}>{loading ? "Refreshing…" : "Refresh list"}</button>
        </div>

        {error && <div className="admin-alert" role="alert"><span>{error}</span><button className="btn btn-ghost btn-sm" onClick={load}>Retry</button></div>}

        <div className="admin-toolbar">
          <label className="admin-search-wrap" htmlFor="agency-search"><span className="sr-only">Search agencies</span>
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>
            <input id="agency-search" className="form-input" placeholder="Search name, registration, phone or email" value={search} onChange={(event) => setSearch(event.target.value)} />
          </label>
          <div className="tabs admin-tabs" role="tablist" aria-label="Filter agencies">
            {FILTERS.map((status) => (
              <button key={status} type="button" role="tab" aria-selected={filter === status} className={`tab-btn${filter === status ? " active" : ""}`}
                onClick={() => setSearchParams(status === "ALL" ? {} : { filter: status })} id={`filter-${status.toLowerCase()}`}>
                {status === "ALL" ? "All" : status.charAt(0) + status.slice(1).toLowerCase()} <span className="tab-count">{counts[status]}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="card admin-table-card">
          <div className="card-header"><div><h2 className="card-title">Registered agencies</h2><p className="admin-card-subtitle">{loading ? "Loading records…" : `${filtered.length} ${filtered.length === 1 ? "agency" : "agencies"} shown`}</p></div></div>
          {loading ? <div className="spinner-wrap" role="status" aria-label="Loading agencies"><div className="spinner" /></div> : filtered.length === 0 ? (
            <div className="empty-state"><p>{agencies.length === 0 ? "No agencies have registered yet." : "No agencies match these filters."}</p>{search && <button className="btn btn-ghost btn-sm" onClick={() => setSearch("")}>Clear search</button>}</div>
          ) : (
            <div className="table-wrap"><table className="admin-table"><thead><tr><th>Agency</th><th>Registration</th><th>Phone</th><th>Status</th><th>Availability</th><th>Registered</th><th><span className="sr-only">Actions</span></th></tr></thead>
              <tbody>{filtered.map((agency) => <tr key={agency.id}>
                <td><div className="admin-primary-cell">{agency.name || "Unnamed agency"}</div><div className="admin-secondary-cell">{agency.user?.email || "No email provided"}</div></td>
                <td>{agency.registrationNumber || "—"}</td><td>{agency.phone || "—"}</td><td>{agencyStatusBadge(agency.status)}</td><td>{availabilityBadge(agency.availability)}</td><td>{formatDate(agency.createdAt)}</td>
                <td><div className="admin-row-actions"><button className="btn btn-ghost btn-sm" type="button" onClick={() => setSelected(agency)} id={`edit-agency-${agency.id}`}>Review</button>
                  <button className="btn btn-danger btn-sm" type="button" disabled={deleting === agency.id} onClick={() => handleDelete(agency)} id={`delete-agency-${agency.id}`}>{deleting === agency.id ? "Deleting…" : "Delete"}</button></div></td>
              </tr>)}</tbody>
            </table></div>
          )}
        </div>
      </section>
      {selected && <StatusModal agency={selected} onClose={() => setSelected(null)} onUpdated={load} />}
    </Layout>
  );
}
