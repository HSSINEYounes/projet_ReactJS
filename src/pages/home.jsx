import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Chip,
  Grid,
  Avatar,
  Stack,
  Tooltip,
  Card,
  CardHeader,
  Divider,
  Badge,
  CardContent,
  CircularProgress,
} from "@mui/material";
import {
  Close,
  Edit,
  Delete,
  Search,
  FilterList,
  Clear,
  Person,
} from "@mui/icons-material";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { motion } from "framer-motion";
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";
import { firestore } from "../firebase";

const ClientsPage = () => {
  const navigate = useNavigate();
  const [clients, setClients] = useState([]);
  const [filteredClients, setFilteredClients] = useState([]);
  const [openModal, setOpenModal] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [client, setClient] = useState({
    firstName: "",
    lastName: "",
    age: "",
    email: "",
    phone: "",
    gender: "",
    role: "client",
    uid: null,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({
    gender: "",
    ageRange: "",
    status: "active",
  });
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const clientsCollectionRef = collection(firestore, "users");
    const q = query(clientsCollectionRef, where("role", "==", "client"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const clientsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setClients(clientsData);
        setFilteredClients(clientsData);
      },
      (error) => {
        toast.error("Failed to load clients");
      }
    );

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    let result = [...clients];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter((client) => {
        const clientIdStr = client.id ? client.id.toString() : "";
        return (
          (client.firstName && client.firstName.toLowerCase().includes(term)) ||
          (client.lastName && client.lastName.toLowerCase().includes(term)) ||
          (client.email && client.email.toLowerCase().includes(term)) ||
          (client.phone && client.phone.toLowerCase().includes(term)) ||
          clientIdStr.includes(term)
        );
      });
    }

    if (filters.gender) {
      result = result.filter((client) => client.gender === filters.gender);
    }

    if (filters.ageRange) {
      const [min, max] = filters.ageRange.split("-").map(Number);
      result = result.filter((client) => {
        if (!client.age) return false;
        const age = parseInt(client.age);
        return !isNaN(age) && age >= min && age <= max;
      });
    }

    if (filters.status) {
      result = result.filter(
        (client) => (client.status || "active") === filters.status
      );
    }

    setFilteredClients(result);
  }, [searchTerm, filters, clients]);

  const handleRowClick = (firebaseId) => {
    navigate(`/admin/clients/${firebaseId}`);
  };

  const handleCloseModal = () => {
    setOpenModal(false);
    setEditingClient(null);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setClient((prev) => ({ ...prev, [name]: value }));
  };

  const handleEdit = (clientToEdit) => {
    setEditingClient(clientToEdit.id);
    setClient({
      firstName: clientToEdit.firstName,
      lastName: clientToEdit.lastName,
      age: clientToEdit.age,
      email: clientToEdit.email,
      phone: clientToEdit.phone,
      gender: clientToEdit.gender,
      role: clientToEdit.role || "client",
      uid: clientToEdit.id,
    });
    setOpenModal(true);
  };

  const handleDelete = async (firebaseId) => {
    if (
      window.confirm(
        "Are you sure you want to delete this client? This will delete their user document."
      )
    ) {
      try {
        await deleteDoc(doc(firestore, "users", firebaseId));
        toast.success("Client deleted successfully");
      } catch (error) {
        toast.error("Failed to delete client");
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const currentDate = new Date().toISOString();
      const clientData = {
        ...client,
        status: client.status || "active",
        role: "client",
        updatedAt: currentDate,
        ...(!editingClient && {
          joinDate: currentDate,
          createdAt: currentDate,
        }),
      };

      if (editingClient) {
        await updateDoc(doc(firestore, "users", editingClient), clientData);
        toast.success("Client updated successfully!");
      } else {
        await addDoc(collection(firestore, "users"), clientData);
        toast.success("Client added successfully!");
      }

      handleCloseModal();
    } catch (error) {
      toast.error(`Failed to save client: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClearFilters = () => {
    setSearchTerm("");
    setFilters({
      gender: "",
      ageRange: "",
      status: "active",
    });
  };

  const activeFiltersCount = [
    searchTerm,
    filters.gender,
    filters.ageRange,
    filters.status !== "active",
  ].filter(Boolean).length;

  const activeClients = clients.filter(
    (c) => (c.status || "active") === "active"
  ).length;
  const inactiveClients = clients.filter(
    (c) => (c.status || "active") === "inactive"
  ).length;

  return (
    <Box sx={{ p: 1 }}>
      <Box sx={{ mb: 1 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 600, mb: 1 }}>
          Client Management
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage your client database, view details, and track interactions
        </Typography>
      </Box>

      <Grid container spacing={10} sx={{ mb: 2 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: "100%", width: "150%", marginLeft: "60%" }}>
            <CardContent>
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
              >
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    Total Clients
                  </Typography>
                  <Typography variant="h4">{clients.length}</Typography>
                </Box>
                <Avatar sx={{ bgcolor: "primary.light" }}>
                  <Person />
                </Avatar>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: "100%", width: "150%", marginLeft: "140%" }}>
            <CardContent>
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
              >
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    Active Clients
                  </Typography>
                  <Typography variant="h4">{activeClients}</Typography>
                </Box>
                <Avatar sx={{ bgcolor: "success.light" }}>
                  <Badge badgeContent={activeClients} color="success" />
                </Avatar>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: "100%", width: "150%", marginLeft: "220%" }}>
            <CardContent>
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
              >
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    Inactive Clients
                  </Typography>
                  <Typography variant="h4">{inactiveClients}</Typography>
                </Box>
                <Avatar sx={{ bgcolor: "error.light" }}>
                  <Badge badgeContent={inactiveClients} color="error" />
                </Avatar>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card sx={{ mb: 3 }}>
        <CardHeader
          title="Search & Filter"
          action={
            <Button
              variant="outlined"
              startIcon={<FilterList />}
              endIcon={
                activeFiltersCount > 0 ? (
                  <Chip
                    label={activeFiltersCount}
                    size="small"
                    color="primary"
                    sx={{ ml: 1 }}
                  />
                ) : null
              }
              onClick={() => setShowFilters(!showFilters)}
            >
              Filters
            </Button>
          }
        />
        <Divider />
        <CardContent>
          <TextField
            fullWidth
            variant="outlined"
            placeholder="Search clients by name, email, phone or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: <Search sx={{ mr: 1, color: "action.active" }} />,
              endAdornment: searchTerm && (
                <IconButton
                  size="small"
                  onClick={() => setSearchTerm("")}
                  edge="end"
                >
                  <Clear fontSize="small" />
                </IconButton>
              ),
            }}
          />

          {showFilters && (
            <Box
              sx={{
                mt: 3,
                pt: 2,
                borderTop: "1px solid",
                borderColor: "divider",
              }}
            >
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={3}>
                  <FormControl fullWidth>
                    <InputLabel>Gender</InputLabel>
                    <Select
                      value={filters.gender}
                      onChange={(e) =>
                        setFilters({ ...filters, gender: e.target.value })
                      }
                      label="Gender"
                    >
                      <MenuItem value="">All Genders</MenuItem>
                      <MenuItem value="male">Male</MenuItem>
                      <MenuItem value="female">Female</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <FormControl fullWidth>
                    <InputLabel>Age Range</InputLabel>
                    <Select
                      value={filters.ageRange}
                      onChange={(e) =>
                        setFilters({ ...filters, ageRange: e.target.value })
                      }
                      label="Age Range"
                    >
                      <MenuItem value="">All Ages</MenuItem>
                      <MenuItem value="0-18">0-18</MenuItem>
                      <MenuItem value="19-30">19-30</MenuItem>
                      <MenuItem value="31-50">31-50</MenuItem>
                      <MenuItem value="51-100">51+</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <FormControl fullWidth>
                    <InputLabel>Status</InputLabel>
                    <Select
                      value={filters.status}
                      onChange={(e) =>
                        setFilters({ ...filters, status: e.target.value })
                      }
                      label="Status"
                    >
                      <MenuItem value="">All Statuses</MenuItem>
                      <MenuItem value="active">Active</MenuItem>
                      <MenuItem value="inactive">Inactive</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid
                  item
                  xs={12}
                  sm={6}
                  md={3}
                  sx={{ display: "flex", alignItems: "center" }}
                >
                  <Button
                    variant="text"
                    startIcon={<Clear />}
                    onClick={handleClearFilters}
                    disabled={activeFiltersCount === 0}
                    fullWidth
                    sx={{ height: "56px" }}
                  >
                    Clear Filters
                  </Button>
                </Grid>
              </Grid>
            </Box>
          )}
        </CardContent>
      </Card>

      {activeFiltersCount > 0 && (
        <Box sx={{ mb: 2, display: "flex", gap: 1, flexWrap: "wrap" }}>
          {searchTerm && (
            <Chip
              label={`Search: "${searchTerm}"`}
              onDelete={() => setSearchTerm("")}
              deleteIcon={<Clear />}
              size="small"
              variant="outlined"
            />
          )}
          {filters.gender && (
            <Chip
              label={`Gender: ${filters.gender}`}
              onDelete={() => setFilters({ ...filters, gender: "" })}
              deleteIcon={<Clear />}
              size="small"
              variant="outlined"
            />
          )}
          {filters.ageRange && (
            <Chip
              label={`Age: ${filters.ageRange}`}
              onDelete={() => setFilters({ ...filters, ageRange: "" })}
              deleteIcon={<Clear />}
              size="small"
              variant="outlined"
            />
          )}
          {filters.status && filters.status !== "active" && (
            <Chip
              label={`Status: ${filters.status}`}
              onDelete={() => setFilters({ ...filters, status: "active" })}
              deleteIcon={<Clear />}
              size="small"
              variant="outlined"
            />
          )}
        </Box>
      )}

      <Card>
        <CardHeader
          title={`Clients (${filteredClients.length})`}
          subheader={`Showing ${filteredClients.length} of ${clients.length} clients`}
        />
        <Divider />
        <TableContainer
          sx={{
            maxHeight: "calc(100vh - 380px)",
            "&::-webkit-scrollbar": {
              width: "6px",
              height: "6px",
            },
            "&::-webkit-scrollbar-thumb": {
              backgroundColor: "primary.main",
              borderRadius: "4px",
            },
          }}
        >
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Client</TableCell>
                <TableCell>Contact</TableCell>
                <TableCell align="center">Age</TableCell>
                <TableCell align="center">Gender</TableCell>
                <TableCell align="center">Status</TableCell>
                <TableCell>Member Since</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredClients.length > 0 ? (
                filteredClients.map((client) => (
                  <TableRow
                    key={client.id}
                    hover
                    onClick={() => handleRowClick(client.id)}
                    sx={{ cursor: "pointer" }}
                  >
                    <TableCell>
                      <Stack direction="row" alignItems="center" spacing={2}>
                        <Avatar sx={{ bgcolor: "primary.light" }}>
                          {client.firstName?.charAt(0)}
                          {client.lastName?.charAt(0)}
                        </Avatar>
                        <Box>
                          <Typography variant="subtitle2">
                            {client.firstName} {client.lastName}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            ID: {client.id}{" "}
                          </Typography>
                        </Box>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="body2">
                          {client.email || "-"}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {client.phone || "-"}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell align="center">{client.age || "-"}</TableCell>
                    <TableCell align="center">
                      <Chip
                        label={client.gender || "-"}
                        color={
                          client.gender === "male"
                            ? "primary"
                            : client.gender === "female"
                            ? "secondary"
                            : "default"
                        }
                        size="small"
                        sx={{ textTransform: "capitalize", minWidth: 80 }}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={client.status || "active"}
                        color={
                          client.status === "active"
                            ? "success"
                            : client.status === "inactive"
                            ? "error"
                            : "warning"
                        }
                        size="small"
                        sx={{ textTransform: "capitalize", minWidth: 80 }}
                      />
                    </TableCell>
                    <TableCell>
                      {client.joinDate
                        ? new Date(client.joinDate).toLocaleDateString()
                        : "N/A"}
                    </TableCell>
                    <TableCell align="right">
                      <Stack
                        direction="row"
                        spacing={1}
                        justifyContent="flex-end"
                      >
                        <Tooltip title="Edit">
                          <IconButton
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEdit(client);
                            }}
                            aria-label="edit"
                            color="primary"
                          >
                            <Edit fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(client.id);
                            }}
                            aria-label="delete"
                            color="error"
                          >
                            <Delete fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                    <Box
                      sx={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 1,
                      }}
                    >
                      <Search sx={{ fontSize: 60, color: "text.disabled" }} />
                      <Typography variant="h6" color="text.secondary">
                        No clients found
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {activeFiltersCount > 0
                          ? "Try adjusting your search or filters"
                          : "Add your first client using the button above"}
                      </Typography>
                      {activeFiltersCount > 0 && (
                        <Button
                          variant="text"
                          onClick={handleClearFilters}
                          startIcon={<Clear />}
                        >
                          Clear all filters
                        </Button>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      <Dialog
        open={openModal}
        onClose={handleCloseModal}
        maxWidth="sm"
        fullWidth
        component={motion.div}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        sx={{
          "& .MuiDialog-paper": {
            borderRadius: "16px",
            backgroundColor: "#F5F5F5",
            boxShadow: "0px 10px 40px rgba(0, 0, 0, 0.1)",
            padding: "20px",
          },
        }}
      >
        <DialogTitle
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: "1.5rem",
            fontWeight: 600,
            color: "#333",
            paddingBottom: "16px",
            paddingTop: "16px",
            borderBottom: "2px solid #EEE",
          }}
        >
          <Stack direction="row" alignItems="center" spacing={2}>
            <Person sx={{ fontSize: 32, color: "#1e293b" }} />
            <Typography variant="h6">
              {editingClient ? "Edit Client" : "Add New Client"}
            </Typography>
          </Stack>
          <IconButton
            aria-label="close"
            onClick={handleCloseModal}
            sx={{
              position: "absolute",
              right: 8,
              top: 8,
              color: "#1e293b",
            }}
          >
            <Close sx={{ fontSize: 24 }} />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers sx={{ padding: "16px 24px" }}>
          <form onSubmit={handleSubmit}>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="First Name"
                  name="firstName"
                  value={client.firstName}
                  onChange={handleInputChange}
                  fullWidth
                  required
                  variant="outlined"
                  InputProps={{
                    startAdornment: (
                      <Person sx={{ color: "action.active", mr: 1 }} />
                    ),
                  }}
                  sx={{
                    "& .MuiInputBase-root": {
                      borderRadius: "12px",
                    },
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Last Name"
                  name="lastName"
                  value={client.lastName}
                  onChange={handleInputChange}
                  fullWidth
                  required
                  variant="outlined"
                  sx={{
                    "& .MuiInputBase-root": {
                      borderRadius: "12px",
                    },
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Age"
                  name="age"
                  type="number"
                  value={client.age}
                  onChange={handleInputChange}
                  inputProps={{ min: 1, max: 120 }}
                  fullWidth
                  required
                  variant="outlined"
                  sx={{
                    "& .MuiInputBase-root": {
                      borderRadius: "12px",
                    },
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Gender</InputLabel>
                  <Select
                    name="gender"
                    value={client.gender}
                    onChange={handleInputChange}
                    label="Gender"
                    required
                    sx={{
                      "& .MuiSelect-root": {
                        borderRadius: "12px",
                      },
                    }}
                  >
                    <MenuItem value="male">Male</MenuItem>
                    <MenuItem value="female">Female</MenuItem>
                    <MenuItem value="other">Other</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Email"
                  name="email"
                  type="email"
                  value={client.email}
                  onChange={handleInputChange}
                  fullWidth
                  variant="outlined"
                  sx={{
                    "& .MuiInputBase-root": {
                      borderRadius: "12px",
                    },
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Phone"
                  name="phone"
                  value={client.phone}
                  onChange={handleInputChange}
                  fullWidth
                  variant="outlined"
                  sx={{
                    "& .MuiInputBase-root": {
                      borderRadius: "12px",
                    },
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select
                    name="status"
                    value={client.status || "active"}
                    onChange={handleInputChange}
                    label="Status"
                    sx={{
                      "& .MuiSelect-root": {
                        borderRadius: "12px",
                      },
                    }}
                  >
                    <MenuItem value="active">Active</MenuItem>
                    <MenuItem value="inactive">Inactive</MenuItem>
                    <MenuItem value="pending">Pending</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <Stack
                  direction="row"
                  spacing={2}
                  justifyContent="flex-end"
                  sx={{ mt: 3 }}
                >
                  <Button
                    variant="outlined"
                    onClick={handleCloseModal}
                    disabled={isSubmitting}
                    sx={{
                      padding: "8px 16px",
                      borderRadius: "8px",
                      textTransform: "none",
                      borderColor: "#1e293b",
                      "&:hover": {
                        backgroundColor: "#1e293b",
                        color: "#fff",
                      },
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={isSubmitting}
                    startIcon={
                      isSubmitting ? <CircularProgress size={20} /> : null
                    }
                    sx={{
                      padding: "8px 16px",
                      borderRadius: "8px",
                      textTransform: "none",
                      backgroundColor: "#1e293b",
                      "&:hover": {
                        backgroundColor: "#004d40",
                      },
                    }}
                  >
                    {isSubmitting ? "Saving..." : "Save Client"}
                  </Button>
                </Stack>
              </Grid>
            </Grid>
          </form>
        </DialogContent>
      </Dialog>

      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
    </Box>
  );
};

export default ClientsPage;
