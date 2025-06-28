import {
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  Box,
  Divider,
} from "@mui/material";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Dashboard as DashboardIcon,
  People as ClientsIcon,
  Settings as SettingsIcon,
  Person as UsersIcon,
  Logout as LogoutIcon,
  Image as GalleryIcon,
} from "@mui/icons-material";
import { useAuth } from "../contexts/AuthContext";

const SideMenu = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, logout } = useAuth();

  const allMenuItems = [
    {
      text: "Dashboard",
      icon: <DashboardIcon />,
      path: "/admin/dashboard",
      roles: ["admin"],
    },
    {
      text: "Clients",
      icon: <ClientsIcon />,
      path: "/admin/clients",
      roles: ["admin"],
    },
    {
      text: "User Management",
      icon: <UsersIcon />,
      path: "/admin/users",
      roles: ["admin"],
    },
    {
      text: "Client Dashboard",
      icon: <DashboardIcon />,
      path: "/client/dashboard",
      roles: ["client"],
    },
    {
      text: "Gallery",
      icon: <GalleryIcon />,
      path: "/client/gallery",
      roles: ["client"],
    },
    {
      text: "Settings",
      icon: <SettingsIcon />,
      path: "/settings",
      roles: ["admin", "client"],
    },
  ];

  const menuItems = allMenuItems.filter((item) => {
    if (!currentUser) return false;
    const userRoles = Array.isArray(currentUser.role)
      ? currentUser.role
      : [currentUser.role];
    return item.roles.some((role) => userRoles.includes(role));
  });

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <Box
      sx={{
        width: 250,
        minHeight: "100vh",
        bgcolor: "#1e293b",
        color: "white",
        display: "flex",
        flexDirection: "column",
        boxShadow: 3,
      }}
    >
      <Toolbar>
        <Typography variant="h6" noWrap>
          {currentUser
            ? `Welcome, ${currentUser.firstName || currentUser.email || "User"}`
            : "Guest"}
        </Typography>
      </Toolbar>
      <Divider sx={{ borderColor: "rgba(255,255,255,0.1)" }} />

      <List sx={{ flexGrow: 1, overflowY: "auto", overflowX: "hidden" }}>
        {menuItems.map((item) => {
          const selected = location.pathname.startsWith(item.path);
          return (
            <ListItemButton
              key={item.text}
              onClick={() => navigate(item.path)}
              sx={{
                backgroundColor: selected ? "#334155" : "transparent",
                color: selected ? "#fff" : "#cbd5e1",
                "&:hover": {
                  backgroundColor: "#475569",
                },
                transition: "background-color 0.2s ease",
              }}
            >
              <ListItemIcon sx={{ color: "inherit", minWidth: 40 }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          );
        })}
      </List>

      <Box sx={{ mt: "auto", p: 2 }}>
        <Divider sx={{ borderColor: "rgba(255,255,255,0.1)" }} />
        <ListItemButton
          onClick={handleLogout}
          sx={{
            color: "#cbd5e1",
            "&:hover": {
              backgroundColor: "#475569",
            },
          }}
        >
          <ListItemIcon sx={{ color: "inherit", minWidth: 40 }}>
            <LogoutIcon />
          </ListItemIcon>
          <ListItemText primary="Logout" />
        </ListItemButton>
      </Box>
    </Box>
  );
};

export default SideMenu;
