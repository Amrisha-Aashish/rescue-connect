import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { RequireAdmin, RequireAgency } from "./components/ProtectedRoute";

import LoginPage       from "./pages/LoginPage";
import AdminOverview   from "./pages/AdminOverview";
import AdminAgencies   from "./pages/AdminAgencies";
import AdminEmergencies from "./pages/AdminEmergencies";
import LiveMapPage     from "./pages/LiveMapPage";
import AgencyDashboard from "./pages/AgencyDashboard";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<LoginPage />} />

          {/* Admin routes */}
          <Route path="/admin" element={<RequireAdmin><AdminOverview /></RequireAdmin>} />
          <Route path="/admin/agencies" element={<RequireAdmin><AdminAgencies /></RequireAdmin>} />
          <Route path="/admin/emergencies" element={<RequireAdmin><AdminEmergencies /></RequireAdmin>} />
          <Route path="/admin/map" element={<RequireAdmin><LiveMapPage /></RequireAdmin>} />

          {/* Agency routes */}
          <Route path="/dashboard" element={<RequireAgency><AgencyDashboard /></RequireAgency>} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
