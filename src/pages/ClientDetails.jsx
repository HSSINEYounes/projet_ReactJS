import { useState, useEffect, useMemo } from "react";
import { Email, Person, Edit } from "@mui/icons-material";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Tabs,
  Tab,
  Tooltip,
  MenuItem,
  Fab,
} from "@mui/material";
import emailjs from "@emailjs/browser";
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Avatar,
  Chip,
  CircularProgress,
  Paper,
  LinearProgress,
} from "@mui/material";
import { ArrowBack, CloudUpload } from "@mui/icons-material";
import { useNavigate, useParams } from "react-router-dom";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  deleteDoc,
  updateDoc,
  Timestamp,
} from "firebase/firestore";
import { firestore } from "../firebase";
import { toast } from "react-toastify";
import ClientOverview from "./ClientOverview";
import ClientGallery from "./ClientGallery";
import ClientNotes from "./ClientNotes";

const CLOUDINARY_CLOUD_NAME = "dl6s63fwt";
const CLOUDINARY_UPLOAD_PRESET = "client_upload";

const ClientDetails = () => {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [images, setImages] = useState([]);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [emailBody, setEmailBody] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [clientData, setClientData] = useState({});
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [selectedProject, setSelectedProject] = useState("All");
  const [treatedFilter, setTreatedFilter] = useState("All");
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [newImageProject, setNewImageProject] = useState("");
  const [isAddingNewProject, setIsAddingNewProject] = useState(false);

  const fetchClientImages = async () => {
    try {
      const q = query(
        collection(firestore, "userImages"),
        where("userId", "==", clientId),
        where("type", "==", "gallery")
      );
      const querySnapshot = await getDocs(q);
      const imagesData = querySnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          url: data.url,
          path: data.path || `clients/${clientId}/${data.filename || doc.id}`,
          filename: data.filename,
          uploadedAt: data.uploadedAt,
          size: data.size,
          type: data.type,
          project: data.project || "Uncategorized",
          treated: data.treated || false,
          cloudinaryPublicId: data.cloudinaryPublicId || null,
        };
      });
      setImages(imagesData);
    } catch (error) {
      toast.error("Failed to load images");
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setNotFound(false);
        const clientDoc = await getDoc(doc(firestore, "users", clientId));
        if (!clientDoc.exists()) {
          setNotFound(true);
          toast.error("Client not found");
          return;
        }
        const clientData = { id: clientDoc.id, ...clientDoc.data() };
        setClient(clientData);
        setClientData(clientData);
        await fetchClientImages();
        await fetchClientNotes();
      } catch (error) {
        toast.error("Failed to load data");
      } finally {
        setLoading(false);
      }
    };

    const fetchClientNotes = async () => {
      try {
        const q = query(
          collection(firestore, "clientNotes"),
          where("clientId", "==", clientId)
        );
        const querySnapshot = await getDocs(q);
        const notesData = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          date: doc.data().date?.toDate(),
        }));
        setNotes(notesData.sort((a, b) => b.date - a.date));
      } catch (error) {
        toast.error("Failed to load notes");
      }
    };

    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId, navigate]);

  const allUploadProjects = useMemo(() => {
    const projects = new Set(images.map((img) => img.project).filter(Boolean));
    return [...Array.from(projects)].sort();
  }, [images]);

  const handleToggleTreated = async (imageId, currentStatus) => {
    try {
      const imageRef = doc(firestore, "userImages", imageId);
      await updateDoc(imageRef, {
        treated: !currentStatus,
      });

      setImages((prev) =>
        prev.map((img) =>
          img.id === imageId ? { ...img, treated: !currentStatus } : img
        )
      );

      toast.success(
        `Image marked as ${!currentStatus ? "treated" : "untreated"}`
      );
    } catch (error) {
      toast.error("Failed to update image status");
    }
  };

  const handleDeleteImage = async (imageId, cloudinaryPublicId) => {
    if (!window.confirm("Are you sure you want to delete this image?")) return;

    try {
      await deleteDoc(doc(firestore, "userImages", imageId));
      setImages((prev) => prev.filter((img) => img.id !== imageId));
      toast.success("Image deleted successfully");
      await logActivity("Deleted Image", `Image ID: ${imageId}`);
    } catch (error) {
      toast.error("Failed to delete image");
    }
  };

  const handleSendEmail = () => {
    if (!client?.email) return;

    setSendingEmail(true);

    const templateParams = {
      to_name: `${client.firstName} ${client.lastName}`,
      to_email: client.email,
      message: emailBody,
    };

    emailjs
      .send("service_fzju5op", "Relance", templateParams, "TR2X7p2WzUNxm8gmj")
      .then(async () => {
        toast.success("Email sent successfully!");
        setEmailModalOpen(false);
        setEmailBody("");
        await logActivity("Sent Email", emailBody.slice(0, 100));
      })
      .catch(() => {
        toast.error("Failed to send email");
      })
      .finally(() => setSendingEmail(false));
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;

    try {
      const noteDoc = {
        clientId,
        content: newNote,
        date: new Date(),
        author: "User",
      };

      const docRef = await addDoc(
        collection(firestore, "clientNotes"),
        noteDoc
      );
      setNotes((prev) => [{ id: docRef.id, ...noteDoc }, ...prev]);
      setNewNote("");
      toast.success("Note added successfully");
      await logActivity("added Note", newNote);
    } catch (error) {
      toast.error("Failed to add note");
    }
  };

  const logActivity = async (action, details = "") => {
    try {
      await addDoc(collection(firestore, "activities"), {
        clientId,
        action,
        details,
        timestamp: new Date(),
        actor: "User",
      });
    } catch (err) {}
  };

  const handleDeleteNote = async (noteId) => {
    try {
      await deleteDoc(doc(firestore, "clientNotes", noteId));
      setNotes((prev) => prev.filter((note) => note.id !== noteId));
      toast.success("Note deleted successfully");
      await logActivity("Deleted Note", `Note ID: ${noteId}`);
    } catch (error) {
      toast.error("Failed to delete note");
    }
  };

  const handleUpdateClient = async () => {
    try {
      await updateDoc(doc(firestore, "users", clientId), clientData);
      setClient(clientData);
      setEditMode(false);
      toast.success("Client updated successfully");
      await logActivity("Updated Client", "Client data was updated");
    } catch (error) {
      toast.error("Failed to update client");
    }
  };

  const handleFileChange = (event) => {
    if (event.target.files[0]) {
      setSelectedFile(event.target.files[0]);
    } else {
      setSelectedFile(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error("Please select an image file to upload.");
      return;
    }
    if (!clientId) {
      toast.error("Cannot upload: No valid client ID determined.");
      return;
    }
    if (!newImageProject.trim()) {
      toast.error("Please select or enter a project name for the image.");
      return;
    }
    if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
      toast.error(
        "Cloudinary configuration missing. Please check the code constants."
      );
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
    formData.append("folder", `clients/${clientId}/${newImageProject.trim()}`);

    try {
      const cloudinaryResponse = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (!cloudinaryResponse.ok) {
        const errorData = await cloudinaryResponse.json();
        throw new Error(
          errorData.error?.message || "Cloudinary upload failed."
        );
      }

      const cloudinaryData = await cloudinaryResponse.json();
      const downloadURL = cloudinaryData.secure_url;

      setUploadProgress(100);

      await addDoc(collection(firestore, "userImages"), {
        userId: clientId,
        filename: selectedFile.name,
        mimeType: selectedFile.type,
        project: newImageProject.trim(),
        size: selectedFile.size,
        treated: false,
        uploadedAt: Timestamp.now(),
        url: downloadURL,
        type: "gallery",
        cloudinaryPublicId: cloudinaryData.public_id,
      });

      toast.success(
        "Image uploaded successfully! You can now view it in the gallery."
      );
      setUploadModalOpen(false);
      setSelectedFile(null);
      setUploadProgress(0);
      setNewImageProject("");
      setIsAddingNewProject(false);

      await fetchClientImages();
      await logActivity(
        "Uploaded Image",
        `Filename: ${selectedFile.name}, Project: ${newImageProject.trim()}`
      );
    } catch (error) {
      toast.error(
        `Upload failed: ${error.message || "An unexpected error occurred."}`
      );
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          background: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)",
        }}
      >
        <Box textAlign="center">
          <CircularProgress size={60} thickness={4} sx={{ mb: 2 }} />
          <Typography variant="h6" color="textSecondary">
            Loading client details...
          </Typography>
        </Box>
      </Box>
    );
  }

  if (notFound) {
    return (
      <Box
        sx={{
          p: 3,
          background: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)",
          minHeight: "100vh",
        }}
      >
        <Paper
          elevation={3}
          sx={{
            p: 4,
            textAlign: "center",
            maxWidth: 600,
            mx: "auto",
            background: "white",
            borderRadius: 3,
          }}
        >
          <Box sx={{ color: "error.main", fontSize: 60, mb: 2 }}>
            <Person fontSize="inherit" />
          </Box>
          <Typography variant="h4" color="error" gutterBottom>
            Client Not Found
          </Typography>
          <Typography variant="body1" sx={{ mb: 3 }}>
            The client you're looking for doesn't exist or may have been
            removed.
          </Typography>
          <Button
            variant="contained"
            color="primary"
            onClick={() => navigate("/clients")}
          >
            Browse All Clients
          </Button>
        </Paper>
      </Box>
    );
  }

  if (!client) return null;

  return (
    <Box
      sx={{
        minHeight: "100vh",
      }}
    >
      <Fab
        color="primary"
        aria-label="edit"
        sx={{
          position: "fixed",
          bottom: 32,
          right: 32,
          zIndex: 1000,
        }}
        onClick={() => setEditMode(!editMode)}
      >
        {editMode ? <ArrowBack /> : <Edit />}
      </Fab>

      <Box>
        <Dialog
          open={emailModalOpen}
          onClose={() => setEmailModalOpen(false)}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: 3,
              boxShadow: "0px 8px 25px rgba(0, 0, 0, 0.1)",
            },
          }}
        >
          <DialogTitle
            sx={{
              bgcolor: "primary.main",
              color: "white",
              display: "flex",
              alignItems: "center",
              py: 1.5,
              px: 3,
              borderTopLeftRadius: 3,
              borderTopRightRadius: 3,
            }}
          >
            <Email sx={{ mr: 1.5, fontSize: "1.8rem" }} />
            <Typography variant="h6" component="span" fontWeight={600}>
              Send Email to {client?.firstName}
            </Typography>
          </DialogTitle>

          <DialogContent sx={{ pt: 3, px: 3, pb: 1 }}>
            <TextField
              margin="dense"
              label="Recipient Email"
              type="email"
              fullWidth
              variant="outlined"
              value={client?.email || ""}
              InputProps={{ readOnly: true }}
              sx={{ mb: 2 }}
            />
            <TextField
              margin="dense"
              label="Email Body"
              type="text"
              fullWidth
              multiline
              rows={8}
              variant="outlined"
              value={emailBody}
              onChange={(e) => setEmailBody(e.target.value)}
              placeholder={`Type your message to ${
                client?.firstName || "client"
              } here...`}
            />
          </DialogContent>

          <DialogActions
            sx={{
              p: 2.5,
              bgcolor: "grey.50",
              borderBottomLeftRadius: 3,
              borderBottomRightRadius: 3,
            }}
          >
            <Button
              onClick={() => setEmailModalOpen(false)}
              disabled={sendingEmail}
              variant="outlined"
              color="inherit"
              sx={{ mr: 1 }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSendEmail}
              variant="contained"
              color="primary"
              disabled={sendingEmail || !emailBody.trim()}
              startIcon={
                sendingEmail ? (
                  <CircularProgress size={20} color="inherit" />
                ) : (
                  <Email />
                )
              }
              sx={{ minWidth: 120, py: 1 }}
            >
              {sendingEmail ? "Sending..." : "Send Email"}
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog
          open={previewOpen}
          onClose={() => setPreviewOpen(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>{previewImage?.filename || "Image Preview"}</DialogTitle>
          <DialogContent
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            {previewImage?.url && (
              <img
                src={previewImage.url}
                alt={previewImage.filename}
                style={{
                  maxWidth: "100%",
                  maxHeight: "80vh",
                  objectFit: "contain",
                }}
              />
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setPreviewOpen(false)}>Close</Button>
          </DialogActions>
        </Dialog>

        <Dialog
          open={uploadModalOpen}
          onClose={() => {
            setUploadModalOpen(false);
            setSelectedFile(null);
            setUploadProgress(0);
            setNewImageProject("");
            setIsAddingNewProject(false);
          }}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Upload New Images</DialogTitle>
          <DialogContent>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              style={{ display: "none" }}
              id="image-upload-input"
            />
            <label htmlFor="image-upload-input">
              <Button
                variant="outlined"
                component="span"
                startIcon={<CloudUpload />}
                fullWidth
                sx={{ mb: 2 }}
              >
                {selectedFile ? selectedFile.name : "Select Image File"}
              </Button>
            </label>
            {isAddingNewProject ? (
              <TextField
                fullWidth
                label="New Project Name"
                value={newImageProject}
                onChange={(e) => setNewImageProject(e.target.value)}
                margin="normal"
                disabled={uploading}
                helperText="Enter a unique name for your new project."
              />
            ) : (
              <TextField
                select
                fullWidth
                label="Select Project"
                value={newImageProject}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === "addNew") {
                    setIsAddingNewProject(true);
                    setNewImageProject("");
                  } else {
                    setNewImageProject(value);
                  }
                }}
                margin="normal"
                disabled={uploading}
                helperText="Choose an existing project or add a new one."
              >
                {allUploadProjects.map((project) => (
                  <MenuItem key={project} value={project}>
                    {project}
                  </MenuItem>
                ))}
                <MenuItem value="addNew" divider>
                  <em>+ Add New Project...</em>
                </MenuItem>
              </TextField>
            )}

            {isAddingNewProject && (
              <Button
                onClick={() => {
                  setIsAddingNewProject(false);
                  setNewImageProject("");
                }}
                disabled={uploading}
                sx={{ mt: 1 }}
              >
                Select Existing Project
              </Button>
            )}

            {uploading && (
              <Box sx={{ width: "100%", mt: 2 }}>
                <LinearProgress variant="determinate" value={uploadProgress} />
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 1 }}
                >
                  {Math.round(uploadProgress)}% uploaded
                </Typography>
              </Box>
            )}
            {!uploading && selectedFile && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                Selected: {selectedFile.name} (
                {Math.round(selectedFile.size / 1024)} KB)
              </Typography>
            )}
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => {
                setUploadModalOpen(false);
                setSelectedFile(null);
                setUploadProgress(0);
                setNewImageProject("");
                setIsAddingNewProject(false);
              }}
              disabled={uploading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              variant="contained"
              disabled={uploading || !selectedFile || !newImageProject.trim()}
            >
              {uploading ? <CircularProgress size={24} /> : "Upload"}
            </Button>
          </DialogActions>
        </Dialog>

        <Card
          sx={{
            mb: 4,
            boxShadow: 3,
            borderRadius: 3,
            overflow: "hidden",
          }}
        >
          <Box
            sx={{
              height: 70,
              backgroundColor: "#1e293b",
              position: "relative",
            }}
          >
            <Box
              sx={{
                position: "absolute",
                bottom: -50,
                left: 30,
                border: "2px solid white",
                borderRadius: "50%",
                background: "white",
              }}
            >
              <Avatar
                sx={{
                  width: 100,
                  height: 100,
                  fontSize: "3rem",
                  bgcolor:
                    client.gender === "male"
                      ? "primary.main"
                      : "secondary.main",
                }}
              >
                {client.firstName?.charAt(0)}
                {client.lastName?.charAt(0)}
              </Avatar>
            </Box>
          </Box>

          <CardContent sx={{ pt: 8, pl: { xs: 2, md: 20 } }}>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                flexWrap: "wrap",
              }}
            >
              <Box>
                <Typography
                  variant="h3"
                  component="h1"
                  fontWeight="600"
                  sx={{ mb: 1 }}
                >
                  {editMode ? (
                    <TextField
                      value={clientData.firstName || ""}
                      onChange={(e) =>
                        setClientData({
                          ...clientData,
                          firstName: e.target.value,
                        })
                      }
                      variant="standard"
                      sx={{ width: 200 }}
                    />
                  ) : (
                    client.firstName
                  )}{" "}
                  {editMode ? (
                    <TextField
                      value={clientData.lastName || ""}
                      onChange={(e) =>
                        setClientData({
                          ...clientData,
                          lastName: e.target.value,
                        })
                      }
                      variant="standard"
                      sx={{ width: 200 }}
                    />
                  ) : (
                    client.lastName
                  )}
                </Typography>

                <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                  <Chip
                    label={client.status || "Active"}
                    size="small"
                    color={
                      client.status === "Active"
                        ? "success"
                        : client.status === "Inactive"
                        ? "error"
                        : "default"
                    }
                  />
                </Box>
              </Box>

              <Box sx={{ display: "flex", gap: 1 }}>
                {client.email && (
                  <Tooltip title="Send Email">
                    <Button
                      variant="contained"
                      color="primary"
                      startIcon={<Email />}
                      onClick={() => setEmailModalOpen(true)}
                    >
                      Email
                    </Button>
                  </Tooltip>
                )}
              </Box>
            </Box>

            <Tabs
              value={activeTab}
              onChange={(e, newValue) => setActiveTab(newValue)}
              sx={{ mt: 3 }}
              indicatorColor="primary"
            >
              <Tab label="Overview" />
              <Tab label="Gallery" />
              <Tab label="Notes" />
            </Tabs>
          </CardContent>
        </Card>

        <Box sx={{ mt: 1 }}>
          {activeTab === 0 && (
            <ClientOverview
              client={client}
              clientData={clientData}
              editMode={editMode}
              setClientData={setClientData}
              handleUpdateClient={handleUpdateClient}
              setEditMode={setEditMode}
              notes={notes}
              setActiveTab={setActiveTab}
            />
          )}
          {activeTab === 1 && (
            <ClientGallery
              images={images}
              selectedProject={selectedProject}
              setSelectedProject={setSelectedProject}
              treatedFilter={treatedFilter}
              setTreatedFilter={setTreatedFilter}
              setUploadModalOpen={setUploadModalOpen}
              handleToggleTreated={handleToggleTreated}
              handleDeleteImage={handleDeleteImage}
              setPreviewImage={setPreviewImage}
              setPreviewOpen={setPreviewOpen}
              client={client}
            />
          )}
          {activeTab === 2 && (
            <ClientNotes
              notes={notes}
              newNote={newNote}
              setNewNote={setNewNote}
              handleAddNote={handleAddNote}
              handleDeleteNote={handleDeleteNote}
            />
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default ClientDetails;
