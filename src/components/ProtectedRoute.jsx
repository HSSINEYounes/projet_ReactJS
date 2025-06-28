import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { CircularProgress, Box } from "@mui/material";
import { toast } from "react-toastify";

const ProtectedRoute = ({ children, requiredRole }) => {
  const { currentUser, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          width: "100vw",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  const isAuthenticated = !!currentUser;
  let hasRequiredRole = true;
  if (requiredRole) {
    hasRequiredRole = currentUser?.role === requiredRole;
  }

  if (isAuthenticated && hasRequiredRole) {
    return children;
  } else if (!isAuthenticated) {
    toast.warn("Please log in to access this page.");
    return <Navigate to="/login" state={{ from: location }} replace />;
  } else {
    toast.error("You do not have permission to access this page.");
    if (currentUser?.role === "client") {
      return <Navigate to="/client-dashboard" replace />;
    }
    return <Navigate to="/login" replace />;
  }
};

export default ProtectedRoute;
