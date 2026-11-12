import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle } from "react-leaflet";
import L from "leaflet";
import Layout from "../components/Layout";
import api from "../services/api";

// Custom colored icons
const makeIcon = (color) =>
  L.divIcon({
    className: "",
    html: `<div style="width:14px;height:14px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 0 6px ${color}88;"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });

const icons = {
  AVAILABLE:   makeIcon("#22c55e"),
  BUSY:        makeIcon("#eab308"),
  UNAVAILABLE: makeIcon("#ef4444"),
};

export default function LiveMapPage() {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [lastRefresh, setLastRefresh] = useState(null);

  const load = () => {
    api.get("/locations").then((r) => {
      setLocations(r.data);
      setLastRefresh(new Date().toLocaleTimeString());
    }).finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 30_000); // auto-refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const center = [20.5937, 78.9629]; // India default

  return (
    <Layout title="Live Agency Map">
      <div className="flex items-center justify-between mb-16">
        <div>
          <span className="text-muted">Auto-refreshes every 30s</span>
          {lastRefresh && <span className="text-muted"> · Last: {lastRefresh}</span>}
        </div>
        <button className="btn btn-ghost btn-sm" onClick={load} id="refresh-map">↻ Refresh</button>
      </div>

      {/* Legend */}
      <div className="flex gap-16 mb-16">
        {[["#22c55e","Available"], ["#eab308","Busy"], ["#ef4444","Unavailable"]].map(([c, l]) => (
          <div key={l} className="flex items-center gap-8">
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: c }} />
            <span className="text-muted">{l}</span>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="spinner-wrap"><div className="spinner" /></div>
      ) : (
        <div className="map-container">
          <MapContainer center={center} zoom={5} style={{ height: "100%", width: "100%" }}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org">OSM</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {locations.map((loc) => {
              const pos = loc.liveLocation
                ? [loc.liveLocation.latitude, loc.liveLocation.longitude]
                : [loc.baseLocation.latitude, loc.baseLocation.longitude];
              const isLive = !!loc.liveLocation;

              return (
                <div key={loc.agencyId}>
                  <Marker
                    position={pos}
                    icon={icons[loc.availability] ?? icons.UNAVAILABLE}
                  >
                    <Popup>
                      <div style={{ minWidth: 160 }}>
                        <strong>{loc.name}</strong><br />
                        Status: <strong>{loc.availability}</strong><br />
                        {isLive
                          ? <>🟢 Live · {new Date(loc.liveLocation.recordedAt).toLocaleTimeString()}</>
                          : <span style={{ color: "#aaa" }}>📍 Base location</span>}
                      </div>
                    </Popup>
                  </Marker>
                  {/* Pulse ring for live locations */}
                  {isLive && (
                    <Circle
                      center={pos}
                      radius={2000}
                      pathOptions={{ color: "#22c55e", fillColor: "#22c55e", fillOpacity: 0.05, weight: 1 }}
                    />
                  )}
                </div>
              );
            })}
          </MapContainer>
        </div>
      )}

      {/* Agency list */}
      <div className="card mt-24">
        <div className="card-header">
          <span className="card-title">Agencies ({locations.length})</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Agency</th><th>Availability</th><th>Live Location</th><th>Last Ping</th></tr>
            </thead>
            <tbody>
              {locations.map((loc) => (
                <tr key={loc.agencyId}>
                  <td style={{ fontWeight: 600 }}>{loc.name}</td>
                  <td>
                    <span className={`badge ${
                      loc.availability === "AVAILABLE" ? "badge-green" :
                      loc.availability === "BUSY"      ? "badge-yellow" : "badge-red"
                    }`}>{loc.availability}</span>
                  </td>
                  <td className="text-muted">
                    {loc.liveLocation
                      ? `${loc.liveLocation.latitude.toFixed(4)}, ${loc.liveLocation.longitude.toFixed(4)}`
                      : "No live data"}
                  </td>
                  <td className="text-muted">
                    {loc.liveLocation
                      ? new Date(loc.liveLocation.recordedAt).toLocaleString()
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
}
