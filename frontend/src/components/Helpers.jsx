// Reusable status badge helpers
export function agencyStatusBadge(status) {
  const map = {
    APPROVED: "badge-green",
    PENDING:  "badge-yellow",
    REJECTED: "badge-red",
  };
  return <span className={`badge ${map[status] ?? "badge-gray"}`}>{status}</span>;
}

export function availabilityBadge(av) {
  const map = {
    AVAILABLE:   "badge-green",
    BUSY:        "badge-yellow",
    UNAVAILABLE: "badge-red",
  };
  return <span className={`badge ${map[av] ?? "badge-gray"}`}>{av}</span>;
}

export function emergencyStatusBadge(status) {
  const map = {
    OPEN:        "badge-red",
    IN_PROGRESS: "badge-yellow",
    RESOLVED:    "badge-green",
    CANCELLED:   "badge-gray",
  };
  return <span className={`badge ${map[status] ?? "badge-gray"}`}>{status.replace("_", " ")}</span>;
}

export function formatDate(d) {
  return d ? new Date(d).toLocaleString() : "—";
}
