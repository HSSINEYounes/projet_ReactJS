import { Box, CircularProgress } from "@mui/material";
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { toast } from "react-toastify";

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const initializeAuthFromStorage = useCallback(() => {
    try {
      const storedUser = localStorage.getItem("currentUser");
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        setCurrentUser(parsedUser);
      }
    } catch (error) {
      localStorage.removeItem("currentUser");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    initializeAuthFromStorage();
  }, [initializeAuthFromStorage]);

  const setUserSession = useCallback((userData) => {
    setCurrentUser(userData);
    localStorage.setItem("currentUser", JSON.stringify(userData));
    toast.success("Logged in successfully!");
  }, []);

  const logout = useCallback(() => {
    setCurrentUser(null);
    localStorage.removeItem("currentUser");
    toast.info("Logged out.");
  }, []);

  const value = {
    currentUser,
    loading,
    setUserSession,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {loading ? (
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
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
};
