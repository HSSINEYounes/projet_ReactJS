import { Route, Routes, Navigate } from "react-router-dom";
import ClientDetails from "./pages/ClientDetails";
import ProtectedRoute from "./components/ProtectedRoute";
import MainLayout from "./pages/mainLayout";
import AdminDashboard from "./pages/adminDashboard";
import UsersPage from "./pages/userPage";
import SettingsPage from "./pages/settingsPage";
import ClientDashboard from "./pages/clientDashboard.jsx";
import ClientGalleryPage from "./pages/ClientGalleryPage.jsx";
import Login from "./pages/login";
import Home from "./pages/home";
import "react-big-calendar/lib/css/react-big-calendar.css";

import { AuthProvider } from "./contexts/AuthContext";
import { ToastContainer } from "react-toastify";
// import "react-toastify/dist/ReactToastify.css";

function App() {
  return (
    <AuthProvider>
      <div>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/gallery/:clientId"
            element={<MainLayout isPublicRoute={true} />}
          >
            <Route index element={<ClientGalleryPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/login" replace />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <MainLayout />
              </ProtectedRoute>
            }
          >
            <Route path="settings" element={<SettingsPage />} />
            <Route index element={<Navigate to="settings" replace />} />
          </Route>
          <Route
            path="/admin"
            element={
              <ProtectedRoute requiredRole="admin">
                <MainLayout />
              </ProtectedRoute>
            }
          >
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="clients" element={<Home />} />
            <Route path="clients/:clientId" element={<ClientDetails />} />
            <Route path="users" element={<UsersPage />} />
            <Route index element={<Navigate to="dashboard" replace />} />
          </Route>
          <Route
            path="/client"
            element={
              <ProtectedRoute requiredRole="client">
                <MainLayout />
              </ProtectedRoute>
            }
          >
            <Route path="dashboard" element={<ClientDashboard />} />
            <Route
              path="gallery"
              element={
                <Navigate
                  to={`/gallery/${
                    (JSON.parse(localStorage.getItem("currentUser")) || {}).uid
                  }`}
                  replace
                />
              }
            />
            <Route index element={<Navigate to="dashboard" replace />} />
          </Route>
        </Routes>
        <ToastContainer position="bottom-right" />
      </div>
    </AuthProvider>
  );
}

export default App;
