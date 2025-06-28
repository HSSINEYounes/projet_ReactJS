import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  Avatar,
  Paper,
  CircularProgress,
  Alert,
  Grid,
  Stack,
  Container,
  alpha,
  InputAdornment,
} from "@mui/material";
import {
  EmailOutlined,
  PhoneOutlined,
  PersonOutlined,
  LocationOnOutlined,
  LockOutlined,
  SaveOutlined,
  EditOutlined,
  SecurityOutlined,
  AccountCircleOutlined,
  CloudUploadOutlined,
  KeyOutlined,
  VpnKeyOutlined,
} from "@mui/icons-material";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { firestore } from "../firebase";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { toast } from "react-toastify";

const SettingsPage = () => {
  const { currentUser, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [activeSection, setActiveSection] = useState("profile");
  const [userData, setUserData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    photoURL: "",
  });
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState({
    profile: false,
    password: false,
    cloudinary: false,
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordError, setPasswordError] = useState("");

  const currentUserId = currentUser?.uid;

  const renderCount = useRef(0);
  useEffect(() => {
    renderCount.current = renderCount.current + 1;
  });

  const fetchUserData = useCallback(async () => {
    if (authLoading) {
      setLoading((prev) => ({ ...prev, profile: true }));
      return;
    }
    if (!currentUserId) {
      navigate("/login");
      return;
    }

    try {
      setLoading((prev) => ({ ...prev, profile: true }));
      const userDocRef = doc(firestore, "users", currentUserId);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        const data = userDocSnap.data();
        setUserData({
          name: data.name || "",
          email: data.email || "",
          phone: data.phone || "",
          address: data.address || "",
          photoURL: data.photoURL || "",
        });
        setSuccess("Profile data loaded successfully!");
      } else {
        setError("User profile not found in Firestore.");
        toast.error("User profile not found.");
      }
    } catch (err) {
      setError("Failed to load user data from Firestore.");
      toast.error("Failed to load profile data.");
    } finally {
      setLoading((prev) => ({ ...prev, profile: false }));
    }
  }, [currentUserId, navigate, authLoading]);

  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setUserData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveProfile = async () => {
    try {
      setLoading((prev) => ({ ...prev, profile: true }));
      setError("");
      setSuccess("");

      const userDocRef = doc(firestore, "users", currentUserId);
      await updateDoc(userDocRef, {
        name: userData.name,
        phone: userData.phone,
        address: userData.address,
        photoURL: userData.photoURL,
        updatedAt: new Date(),
      });

      const updatedUserInContext = { ...currentUser, ...userData };
      localStorage.setItem("currentUser", JSON.stringify(updatedUserInContext));

      setSuccess("Profile updated successfully!");
      toast.success("Profile updated successfully!");
      setEditMode(false);
    } catch (err) {
      setError("Failed to update profile: " + err.message);
      toast.error("Failed to update profile: " + err.message);
    } finally {
      setLoading((prev) => ({ ...prev, profile: false }));
    }
  };

  const handleUpdatePassword = async () => {
    try {
      if (passwordData.newPassword !== passwordData.confirmPassword) {
        setPasswordError("New passwords do not match.");
        return;
      }
      if (passwordData.newPassword.length < 6) {
        setPasswordError("New password must be at least 6 characters long.");
        return;
      }

      setLoading((prev) => ({ ...prev, password: true }));
      setPasswordError("");
      setSuccess("");

      const userDocRef = doc(firestore, "users", currentUserId);
      const userSnap = await getDoc(userDocRef);

      if (!userSnap.exists()) {
        throw new Error("User not found in Firestore.");
      }

      const dbUserData = userSnap.data();

      if (dbUserData.password !== passwordData.currentPassword) {
        throw new Error("Incorrect current password.");
      }

      await updateDoc(userDocRef, {
        password: passwordData.newPassword,
        updatedAt: new Date(),
      });

      setSuccess("Password updated successfully!");
      toast.success("Password updated successfully!");
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (err) {
      setPasswordError("Failed to update password: " + err.message);
      toast.error("Failed to update password: " + err.message);
    } finally {
      setLoading((prev) => ({ ...prev, password: false }));
    }
  };

  const handleCloudinaryUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Only image files are allowed.");
      toast.error("Only image files are allowed.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("File size must be under 5MB.");
      toast.error("File size must be under 5MB.");
      return;
    }

    setLoading((prev) => ({ ...prev, cloudinary: true }));
    setError("");
    setSuccess("");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "client_upload");

    try {
      const res = await fetch(
        "https://api.cloudinary.com/v1_1/dl6s63fwt/image/upload",
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await res.json();
      if (!res.ok || !data.secure_url) {
        throw new Error(data.error?.message || "Cloudinary upload failed.");
      }

      const uploadedImageUrl = data.secure_url;

      setUserData((prev) => ({
        ...prev,
        photoURL: uploadedImageUrl,
      }));

      const userDocRef = doc(firestore, "users", currentUserId);
      await updateDoc(userDocRef, {
        photoURL: uploadedImageUrl,
        updatedAt: new Date(),
      });

      const updatedUser = { ...currentUser, photoURL: uploadedImageUrl };
      localStorage.setItem("currentUser", JSON.stringify(updatedUser));

      setSuccess("Profile image updated successfully!");
      toast.success("Profile image updated successfully!");
    } catch (err) {
      setError("Cloudinary upload failed: " + err.message);
      toast.error("Image upload failed: " + err.message);
    } finally {
      setLoading((prev) => ({ ...prev, cloudinary: false }));
    }
  };

  if (authLoading || loading.profile) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
          width: "100%",
          bgcolor: "background.default",
        }}
      >
        <CircularProgress size={60} />
      </Box>
    );
  }

  if (!currentUser) {
    navigate("/login");
    return null;
  }

  return (
    <Container maxWidth="lg">
      <Typography
        variant="h4"
        gutterBottom
        sx={{ fontWeight: "bold", color: "text.primary" }}
      >
        Account Settings
      </Typography>

      <Paper
        elevation={8}
        sx={{
          borderRadius: 3,
          overflow: "hidden",
          bgcolor: "background.paper",
          boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
        }}
      >
        <Box
          sx={{
            width: { xs: "100%", md: "280px" },
            bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08),
            p: { xs: 3, md: 4 },
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            borderRight: { md: "1px solid" },
            borderColor: { md: "divider" },
            gap: 3,
            boxShadow: { xs: "0 4px 10px rgba(0,0,0,0.05)", md: "none" },
            zIndex: 1,
            maxHeight: { xs: "none", md: "auto" },
          }}
        >
          <Avatar
            src={userData.photoURL}
            sx={{
              width: 140,
              height: 140,
              fontSize: 60,
              border: "3px solid",
              borderColor: "primary.dark",
              boxShadow: "0 4px 15px rgba(0,0,0,0.1)",
              transition: "transform 0.2s ease-in-out",
              "&:hover": {
                transform: "scale(1.05)",
              },
            }}
          >
            {userData.name?.charAt(0)?.toUpperCase() || "U"}
          </Avatar>
          <Box sx={{ mt: 1, textAlign: "center" }}>
            <input
              accept="image/*"
              type="file"
              id="profile-photo-upload"
              onChange={handleCloudinaryUpload}
              style={{ display: "none" }}
            />
            <label htmlFor="profile-photo-upload">
              <Button
                variant="outlined"
                component="span"
                startIcon={
                  loading.cloudinary ? (
                    <CircularProgress size={20} />
                  ) : (
                    <CloudUploadOutlined />
                  )
                }
                disabled={loading.cloudinary}
                sx={{
                  borderRadius: 2,
                  px: 2,
                  py: 1,
                  textTransform: "none",
                  fontSize: "0.85rem",
                  borderColor: "primary.main",
                  color: "primary.main",
                  "&:hover": {
                    bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
                  },
                }}
              >
                {loading.cloudinary ? "Uploading..." : "Change Photo"}
              </Button>
            </label>
          </Box>
          <Typography
            variant="h6"
            sx={{ fontWeight: "600", mt: 2, color: "text.primary" }}
          >
            {userData.name || "User Name"}
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mb: 3, wordBreak: "break-all" }}
          >
            {userData.email}
          </Typography>

          <Stack
            direction={{ xs: "row", md: "column" }}
            spacing={{ xs: 1, md: 2 }}
            sx={{
              width: "100%",
              mt: 2,
              justifyContent: { xs: "center", md: "flex-start" },
            }}
          >
            <Button
              startIcon={<AccountCircleOutlined />}
              onClick={() => {
                setActiveSection("profile");
                setError("");
                setSuccess("");
                setPasswordError("");
              }}
              variant={activeSection === "profile" ? "contained" : "text"}
              sx={{
                justifyContent: { xs: "center", md: "flex-start" },
                borderRadius: 2,
                py: 1.5,
                textTransform: "none",
                color: activeSection === "profile" ? "white" : "text.primary",
                bgcolor:
                  activeSection === "profile" ? "primary.main" : "transparent",
                "&:hover": {
                  bgcolor: (theme) =>
                    activeSection === "profile"
                      ? theme.palette.primary.dark
                      : alpha(theme.palette.primary.main, 0.1),
                },
              }}
            >
              Profile Information
            </Button>
            <Button
              startIcon={<SecurityOutlined />}
              onClick={() => {
                setActiveSection("security");
                setError("");
                setSuccess("");
                setPasswordError("");
              }}
              variant={activeSection === "security" ? "contained" : "text"}
              sx={{
                justifyContent: { xs: "center", md: "flex-start" },
                borderRadius: 2,
                py: 1.5,
                textTransform: "none",
                color: activeSection === "security" ? "white" : "text.primary",
                bgcolor:
                  activeSection === "security" ? "primary.main" : "transparent",
                "&:hover": {
                  bgcolor: (theme) =>
                    activeSection === "security"
                      ? theme.palette.primary.dark
                      : alpha(theme.palette.primary.main, 0.1),
                },
              }}
            >
              Security Settings
            </Button>
          </Stack>
        </Box>

        <Box sx={{ flexGrow: 1, p: { xs: 3, md: 5 }, position: "relative" }}>
          {(error || success || passwordError) && (
            <Alert
              severity={error || passwordError ? "error" : "success"}
              sx={{ mb: 3, borderRadius: 2, alignItems: "center" }}
            >
              {error || success || passwordError}
            </Alert>
          )}

          {activeSection === "profile" && (
            <Stack spacing={4}>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  mb: 2,
                }}
              >
                <Typography
                  variant="h5"
                  sx={{ fontWeight: "600", color: "text.primary" }}
                >
                  Edit Profile Details
                </Typography>
                {!editMode ? (
                  <Button
                    variant="outlined"
                    startIcon={<EditOutlined />}
                    onClick={() => setEditMode(true)}
                    sx={{
                      borderRadius: 2,
                      px: 3,
                      py: 1.2,
                      textTransform: "none",
                    }}
                  >
                    Edit Information
                  </Button>
                ) : (
                  <Stack direction="row" spacing={2}>
                    <Button
                      variant="outlined"
                      onClick={() => {
                        setEditMode(false);
                        fetchUserData();
                      }}
                      sx={{
                        borderRadius: 2,
                        px: 3,
                        py: 1.2,
                        textTransform: "none",
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="contained"
                      startIcon={<SaveOutlined />}
                      onClick={handleSaveProfile}
                      disabled={loading.profile}
                      color="primary"
                      sx={{
                        borderRadius: 2,
                        px: 3,
                        py: 1.2,
                        textTransform: "none",
                      }}
                    >
                      {loading.profile ? (
                        <CircularProgress size={24} color="inherit" />
                      ) : (
                        "Save Changes"
                      )}
                    </Button>
                  </Stack>
                )}
              </Box>

              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Full Name"
                    name="name"
                    value={userData.name}
                    onChange={handleInputChange}
                    disabled={!editMode}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <PersonOutlined sx={{ color: "action.active" }} />
                        </InputAdornment>
                      ),
                    }}
                    variant="outlined"
                    sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Email Address"
                    name="email"
                    value={userData.email}
                    disabled
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <EmailOutlined sx={{ color: "action.active" }} />
                        </InputAdornment>
                      ),
                    }}
                    variant="outlined"
                    sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Phone Number"
                    name="phone"
                    value={userData.phone}
                    onChange={handleInputChange}
                    disabled={!editMode}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <PhoneOutlined sx={{ color: "action.active" }} />
                        </InputAdornment>
                      ),
                    }}
                    variant="outlined"
                    sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Address"
                    name="address"
                    value={userData.address}
                    onChange={handleInputChange}
                    disabled={!editMode}
                    multiline
                    rows={3}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment
                          position="start"
                          sx={{ alignSelf: "flex-start", mt: 1 }}
                        >
                          <LocationOnOutlined sx={{ color: "action.active" }} />
                        </InputAdornment>
                      ),
                    }}
                    variant="outlined"
                    sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
                  />
                </Grid>
              </Grid>
            </Stack>
          )}

          {activeSection === "security" && (
            <Stack spacing={4}>
              <Typography
                variant="h5"
                sx={{ fontWeight: "600", color: "text.primary" }}
              >
                Change Password
              </Typography>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Current Password"
                    type="password"
                    name="currentPassword"
                    value={passwordData.currentPassword}
                    onChange={handlePasswordChange}
                    disabled={loading.password}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <KeyOutlined sx={{ color: "action.active" }} />
                        </InputAdornment>
                      ),
                    }}
                    variant="outlined"
                    sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="New Password"
                    type="password"
                    name="newPassword"
                    value={passwordData.newPassword}
                    onChange={handlePasswordChange}
                    disabled={loading.password}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <VpnKeyOutlined sx={{ color: "action.active" }} />
                        </InputAdornment>
                      ),
                    }}
                    variant="outlined"
                    sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Confirm New Password"
                    type="password"
                    name="confirmPassword"
                    value={passwordData.confirmPassword}
                    onChange={handlePasswordChange}
                    disabled={loading.password}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <VpnKeyOutlined sx={{ color: "action.active" }} />
                        </InputAdornment>
                      ),
                    }}
                    variant="outlined"
                    sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={handleUpdatePassword}
                    disabled={
                      loading.password ||
                      !passwordData.currentPassword ||
                      !passwordData.newPassword ||
                      !passwordData.confirmPassword
                    }
                    sx={{
                      mt: 2,
                      borderRadius: 2,
                      px: 4,
                      py: 1.2,
                      textTransform: "none",
                    }}
                    startIcon={
                      loading.password ? (
                        <CircularProgress size={20} color="inherit" />
                      ) : (
                        <LockOutlined />
                      )
                    }
                  >
                    Update Password
                  </Button>
                </Grid>
              </Grid>
            </Stack>
          )}
        </Box>
      </Paper>
    </Container>
  );
};

export default SettingsPage;
