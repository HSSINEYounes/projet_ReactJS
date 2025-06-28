/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useState } from "react";
import {
  Typography,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  CircularProgress,
  Toolbar,
  useTheme,
  TablePagination,
  InputAdornment,
} from "@mui/material";
import {
  Delete,
  Edit,
  Add as AddIcon,
  Search as SearchIcon,
} from "@mui/icons-material";
import { firestore } from "../firebase";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  Timestamp,
} from "firebase/firestore";
import emailjs from "emailjs-com";
import { toast } from "react-toastify";
import * as yup from "yup";

const userSchema = yup.object().shape({
  firstName: yup.string().required("First Name is required"),
  lastName: yup.string().required("Last Name is required"),
  email: yup
    .string()
    .email("Invalid email format")
    .required("Email is required"),
  phone: yup
    .string()
    .nullable()
    .matches(/^[0-9+\-().\s]*$/, "Invalid phone number format"),
  address: yup.string().nullable(),
  role: yup
    .string()
    .oneOf(["admin", "client"], "Invalid role")
    .required("Role is required"),
  age: yup
    .number()
    .nullable()
    .min(0, "Age cannot be negative")
    .max(120, "Age seems too high")
    .typeError("Age must be a number"),
  gender: yup
    .string()
    .nullable()
    .oneOf(["male", "female", "other", null], "Invalid gender"),
  status: yup
    .string()
    .nullable()
    .oneOf(["active", "inactive", "pending", null], "Invalid status"),
});

const generatePassword = () => {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+";
  return Array.from(
    { length: 12 },
    () => chars[Math.floor(Math.random() * chars.length)]
  ).join("");
};

const UsersPage = () => {
  const theme = useTheme();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: "",
    role: "",
    age: "",
    gender: "",
    status: "",
  });
  const [formErrors, setFormErrors] = useState({});
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalUsers, setTotalUsers] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const usersColRef = collection(firestore, "users");
      let q = query(
        usersColRef,
        orderBy("lastName", "asc"),
        orderBy("firstName", "asc")
      );
      const snapshot = await getDocs(q);
      const allUsers = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate
          ? doc.data().createdAt.toDate()
          : null,
        updatedAt: doc.data().updatedAt?.toDate
          ? doc.data().updatedAt.toDate()
          : null,
      }));
      const filteredUsers = searchQuery
        ? allUsers.filter(
            (user) =>
              user.firstName
                .toLowerCase()
                .includes(searchQuery.toLowerCase()) ||
              user.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
              user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
              user.role.toLowerCase().includes(searchQuery.toLowerCase())
          )
        : allUsers;
      setTotalUsers(filteredUsers.length);
      setUsers(filteredUsers);
    } catch (error) {
      toast.error("Failed to fetch users.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [searchQuery]);

  const handleOpenDialog = (user = null) => {
    setEditingUser(user);
    setFormData(
      user
        ? {
            firstName: user.firstName || "",
            lastName: user.lastName || "",
            email: user.email || "",
            phone: user.phone || "",
            address: user.address || "",
            role: user.role || "",
            age: user.age || "",
            gender: user.gender || "",
            status: user.status || "",
          }
        : {
            firstName: "",
            lastName: "",
            email: "",
            phone: "",
            address: "",
            role: "",
            age: "",
            gender: "",
            status: "",
          }
    );
    setFormErrors({});
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingUser(null);
    setFormErrors({});
  };

  const sendEmail = async (email, name, password) => {
    try {
      await emailjs.send(
        "service_fzju5op",
        "template_5y4f09o",
        {
          to_name: name,
          to_email: email,
          password: password,
        },
        "TR2X7p2WzUNxm8gmj"
      );
      toast.success("Welcome email sent successfully!");
      return true;
    } catch (err) {
      toast.error("Failed to send welcome email.");
      return false;
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await userSchema.validate(formData, { abortEarly: false });
      setFormErrors({});
      const dataToSave = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone || null,
        address: formData.address || null,
        role: formData.role,
        age: formData.age ? Number(formData.age) : null,
        gender: formData.gender || null,
        status: formData.status || null,
        updatedAt: Timestamp.now(),
      };
      if (editingUser) {
        await updateDoc(doc(firestore, "users", editingUser.id), dataToSave);
        toast.success("User updated successfully!");
      } else {
        const password = generatePassword();
        await addDoc(collection(firestore, "users"), {
          ...dataToSave,
          password: password,
          createdAt: Timestamp.now(),
          joinDate: Timestamp.now(),
        });
        const emailSent = await sendEmail(
          formData.email,
          `${formData.firstName} ${formData.lastName}`,
          password
        );
        if (emailSent) {
          toast.success("New user added successfully!");
        } else {
          toast.warn("User added, but failed to send welcome email.");
        }
      }
      await fetchUsers();
      handleCloseDialog();
    } catch (err) {
      if (err instanceof yup.ValidationError) {
        const errors = {};
        err.inner.forEach((e) => {
          errors[e.path] = e.message;
        });
        setFormErrors(errors);
        toast.error("Please correct the form errors.");
      } else {
        toast.error("Operation failed. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (
      window.confirm(
        "Are you sure you want to delete this user? This action cannot be undone."
      )
    ) {
      setLoading(true);
      try {
        await deleteDoc(doc(firestore, "users", id));
        toast.success("User deleted successfully!");
        await fetchUsers();
      } catch (err) {
        toast.error("Failed to delete user.");
      } finally {
        setLoading(false);
      }
    }
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const paginatedUsers = users.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  return (
    <Box
      sx={{
        p: { xs: 2, sm: 3 },
        minHeight: "100vh",
      }}
    >
      <Typography
        variant="h4"
        gutterBottom
        sx={{
          mb: theme.spacing(4),
          fontWeight: 700,
          color: theme.palette.text.primary,
        }}
      >
        User Management
      </Typography>

      <Paper
        elevation={3}
        sx={{ p: theme.spacing(3), borderRadius: theme.shape.borderRadius * 2 }}
      >
        <Toolbar
          sx={{
            justifyContent: "space-between",
            mb: theme.spacing(2),
            pl: { sm: 2 },
            pr: { xs: 1, sm: 1 },
          }}
        >
          <TextField
            variant="outlined"
            size="small"
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            sx={{ width: { xs: "100%", sm: "auto" }, mb: { xs: 2, sm: 0 } }}
          />
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
            sx={{ px: theme.spacing(3), py: theme.spacing(1.5) }}
          >
            Add User
          </Button>
        </Toolbar>

        <TableContainer>
          {loading ? (
            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                py: theme.spacing(5),
              }}
            >
              <CircularProgress />
              <Typography variant="h6" color="text.secondary" sx={{ ml: 2 }}>
                Loading Users...
              </Typography>
            </Box>
          ) : users.length === 0 && !searchQuery ? (
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                py: theme.spacing(5),
              }}
            >
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No users found.
              </Typography>
              <Button variant="outlined" onClick={() => handleOpenDialog()}>
                Add your first user
              </Button>
            </Box>
          ) : paginatedUsers.length === 0 && searchQuery ? (
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                py: theme.spacing(5),
              }}
            >
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No users matching "{searchQuery}".
              </Typography>
              <Button variant="outlined" onClick={() => setSearchQuery("")}>
                Clear Search
              </Button>
            </Box>
          ) : (
            <>
              <Table stickyHeader aria-label="user management table">
                <TableHead>
                  <TableRow sx={{ backgroundColor: theme.palette.grey[100] }}>
                    <TableCell
                      sx={{
                        fontWeight: "bold",
                        borderBottom: `2px solid ${theme.palette.divider}`,
                      }}
                    >
                      Name
                    </TableCell>
                    <TableCell
                      sx={{
                        fontWeight: "bold",
                        borderBottom: `2px solid ${theme.palette.divider}`,
                      }}
                    >
                      Email
                    </TableCell>
                    <TableCell
                      sx={{
                        fontWeight: "bold",
                        borderBottom: `2px solid ${theme.palette.divider}`,
                      }}
                    >
                      Phone
                    </TableCell>
                    <TableCell
                      sx={{
                        fontWeight: "bold",
                        borderBottom: `2px solid ${theme.palette.divider}`,
                      }}
                    >
                      Role
                    </TableCell>
                    <TableCell
                      sx={{
                        fontWeight: "bold",
                        borderBottom: `2px solid ${theme.palette.divider}`,
                      }}
                    >
                      Status
                    </TableCell>
                    <TableCell
                      sx={{
                        fontWeight: "bold",
                        borderBottom: `2px solid ${theme.palette.divider}`,
                      }}
                    >
                      Actions
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginatedUsers.map((user) => (
                    <TableRow key={user.id} hover>
                      <TableCell>
                        {`${user.firstName || ""} ${
                          user.lastName || ""
                        }`.trim()}
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{user.phone || "-"}</TableCell>
                      <TableCell>
                        <Typography
                          variant="body2"
                          sx={{
                            px: 1,
                            py: 0.5,
                            borderRadius: "4px",
                            display: "inline-block",
                            fontWeight: 600,
                            backgroundColor:
                              user.role === "admin"
                                ? theme.palette.secondary.light
                                : theme.palette.primary.light,
                            color:
                              user.role === "admin"
                                ? theme.palette.secondary.contrastText
                                : theme.palette.primary.contrastText,
                          }}
                        >
                          {user.role}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography
                          variant="body2"
                          sx={{
                            px: 1,
                            py: 0.5,
                            borderRadius: "4px",
                            display: "inline-block",
                            fontWeight: 600,
                            backgroundColor:
                              user.status === "active"
                                ? theme.palette.success.light
                                : user.status === "inactive"
                                ? theme.palette.error.light
                                : theme.palette.grey[300],
                            color:
                              user.status === "active"
                                ? theme.palette.success.contrastText
                                : user.status === "inactive"
                                ? theme.palette.error.contrastText
                                : theme.palette.text.primary,
                          }}
                        >
                          {user.status || "-"}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <IconButton
                          onClick={() => handleOpenDialog(user)}
                          aria-label={`edit ${user.firstName}`}
                          color="primary"
                        >
                          <Edit />
                        </IconButton>
                        <IconButton
                          onClick={() => handleDelete(user.id)}
                          aria-label={`delete ${user.firstName}`}
                          color="error"
                        >
                          <Delete />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <TablePagination
                rowsPerPageOptions={[5, 10, 25]}
                component="div"
                count={totalUsers}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
              />
            </>
          )}
        </TableContainer>
      </Paper>

      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle
          sx={{
            backgroundColor: theme.palette.primary.main,
            color: theme.palette.primary.contrastText,
          }}
        >
          {editingUser ? "Edit User" : "Add New User"}
        </DialogTitle>
        <DialogContent sx={{ pt: theme.spacing(2) }}>
          <TextField
            autoFocus
            fullWidth
            margin="dense"
            label="First Name"
            value={formData.firstName}
            onChange={(e) =>
              setFormData({ ...formData, firstName: e.target.value })
            }
            error={!!formErrors.firstName}
            helperText={formErrors.firstName}
            disabled={submitting}
          />
          <TextField
            fullWidth
            margin="dense"
            label="Last Name"
            value={formData.lastName}
            onChange={(e) =>
              setFormData({ ...formData, lastName: e.target.value })
            }
            error={!!formErrors.lastName}
            helperText={formErrors.lastName}
            disabled={submitting}
          />
          <TextField
            fullWidth
            margin="dense"
            label="Email"
            value={formData.email}
            onChange={(e) =>
              setFormData({ ...formData, email: e.target.value })
            }
            InputProps={{
              readOnly: !!editingUser,
            }}
            error={!!formErrors.email}
            helperText={formErrors.email}
            disabled={submitting}
          />
          <TextField
            fullWidth
            margin="dense"
            label="Phone Number"
            value={formData.phone}
            onChange={(e) =>
              setFormData({ ...formData, phone: e.target.value })
            }
            error={!!formErrors.phone}
            helperText={formErrors.phone}
            disabled={submitting}
          />
          <TextField
            fullWidth
            margin="dense"
            label="Address"
            value={formData.address}
            onChange={(e) =>
              setFormData({ ...formData, address: e.target.value })
            }
            error={!!formErrors.address}
            helperText={formErrors.address}
            disabled={submitting}
          />
          <FormControl fullWidth margin="dense" error={!!formErrors.role}>
            <InputLabel id="role-label">Role</InputLabel>
            <Select
              labelId="role-label"
              value={formData.role}
              onChange={(e) =>
                setFormData({ ...formData, role: e.target.value })
              }
              label="Role"
              disabled={submitting}
            >
              <MenuItem value="">
                <em>Select Role</em>
              </MenuItem>
              <MenuItem value="admin">Admin</MenuItem>
              <MenuItem value="client">Client</MenuItem>
            </Select>
            {formErrors.role && (
              <Typography color="error" variant="caption">
                {formErrors.role}
              </Typography>
            )}
          </FormControl>

          <TextField
            fullWidth
            margin="dense"
            label="Age"
            type="number"
            value={formData.age}
            onChange={(e) => setFormData({ ...formData, age: e.target.value })}
            error={!!formErrors.age}
            helperText={formErrors.age}
            disabled={submitting}
          />
          <FormControl fullWidth margin="dense" error={!!formErrors.gender}>
            <InputLabel id="gender-label">Gender</InputLabel>
            <Select
              labelId="gender-label"
              value={formData.gender}
              onChange={(e) =>
                setFormData({ ...formData, gender: e.target.value })
              }
              label="Gender"
              disabled={submitting}
            >
              <MenuItem value="">
                <em>Select Gender</em>
              </MenuItem>
              <MenuItem value="male">Male</MenuItem>
              <MenuItem value="female">Female</MenuItem>
              <MenuItem value="other">Other</MenuItem>
            </Select>
            {formErrors.gender && (
              <Typography color="error" variant="caption">
                {formErrors.gender}
              </Typography>
            )}
          </FormControl>
          <FormControl fullWidth margin="dense" error={!!formErrors.status}>
            <InputLabel id="status-label">Status</InputLabel>
            <Select
              labelId="status-label"
              value={formData.status}
              onChange={(e) =>
                setFormData({ ...formData, status: e.target.value })
              }
              label="Status"
              disabled={submitting}
            >
              <MenuItem value="">
                <em>Select Status</em>
              </MenuItem>
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="inactive">Inactive</MenuItem>
              <MenuItem value="pending">Pending</MenuItem>
            </Select>
            {formErrors.status && (
              <Typography color="error" variant="caption">
                {formErrors.status}
              </Typography>
            )}
          </FormControl>
          {editingUser && formData.createdAt && (
            <TextField
              fullWidth
              margin="dense"
              label="Created At"
              value={new Date(formData.createdAt).toLocaleString()}
              InputProps={{
                readOnly: true,
              }}
              disabled={submitting}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} disabled={submitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={submitting}
            startIcon={
              submitting ? <CircularProgress size={20} color="inherit" /> : null
            }
          >
            {editingUser ? "Update User" : "Add User"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UsersPage;
