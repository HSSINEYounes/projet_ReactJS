import React, { useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  TextField,
  MenuItem,
  Checkbox,
  IconButton,
  CardMedia,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
} from "@mui/material";
import { CloudUpload, Delete, Image, MailOutline } from "@mui/icons-material";
import { toast } from "react-toastify";
import emailjs from "@emailjs/browser";

const ClientGallery = ({
  images,
  selectedProject,
  setSelectedProject,
  treatedFilter,
  setTreatedFilter,
  setUploadModalOpen,
  handleToggleTreated,
  handleDeleteImage,
  setPreviewImage,
  setPreviewOpen,
  client,
  currentUser,
  logActivity,
}) => {
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [currentProjectForEmail, setCurrentProjectForEmail] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);

  const filteredImages = images
    .filter((img) => {
      const matchProject =
        selectedProject === "All" ||
        (img.project || "Uncategorized") === selectedProject;
      const matchStatus =
        treatedFilter === "All" ||
        (treatedFilter === "Treated" && img.treated) ||
        (treatedFilter === "Untreated" && !img.treated);
      return matchProject && matchStatus;
    })
    .reduce((acc, img) => {
      const key = img.project || "Uncategorized";
      if (!acc[key]) acc[key] = [];
      acc[key].push(img);
      return acc;
    }, {});

  const allProjects = [
    "All",
    ...new Set(images.map((img) => img.project || "Uncategorized")),
  ];

  const handleOpenEmailModal = (projectName) => {
    if (!client || !client.email) {
      toast.info("Client email not available to send notification.");
      return;
    }
    setCurrentProjectForEmail(projectName);
    setEmailBody(
      `Dear Client,\n\nThis is a notification regarding your project: "${projectName}".\n\nWe have identified that there might be missing files or documents required for this project. Please review your files and upload any outstanding items to your gallery. If you have any questions, please contact us.\n\nThank you,\n `
    );
    setEmailModalOpen(true);
  };

  const handleCloseEmailModal = () => {
    setEmailModalOpen(false);
    setEmailBody("");
    setCurrentProjectForEmail("");
  };

  const handleSendEmail = () => {
    if (!client || !client.email) {
      toast.error("Client email is missing. Cannot send email.");
      return;
    }
    setSendingEmail(true);
    const templateParams = {
      to_name: `${client.firstName || ""} ${client.lastName || ""}`.trim(),
      to_email: client.email,
      message: emailBody,
    };
    emailjs
      .send("service_fzju5op", "Relance", templateParams, "TR2X7p2WzUNxm8gmj")
      .then(async () => {
        toast.success("Email sent successfully!");
        setEmailModalOpen(false);
        setEmailBody("");
        if (logActivity) {
          await logActivity("Sent Email", emailBody.slice(0, 100));
        }
      })
      .catch((err) => {
        console.error("Email error:", err);
        toast.error("Failed to send email");
      })
      .finally(() => setSendingEmail(false));
  };

  return (
    <Card sx={{ borderRadius: 3, boxShadow: 3, overflow: "hidden" }}>
      <CardContent>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 3,
          }}
        >
          <Typography variant="h6" fontWeight={600}>
            Client Gallery
          </Typography>
          <Button
            variant="contained"
            startIcon={<CloudUpload />}
            onClick={() => setUploadModalOpen(true)}
            sx={{
              borderRadius: 2,
              backgroundColor: "#2575fc",
              "&:hover": { backgroundColor: "#1e5bbf" },
            }}
          >
            Upload
          </Button>
        </Box>
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={12} md={6} sx={{ width: "20%" }}>
            <TextField
              select
              fullWidth
              size="small"
              label="Filter by Project"
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
            >
              {allProjects.map((project) => (
                <MenuItem key={project} value={project}>
                  {project}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} md={6} sx={{ width: "20%" }}>
            <TextField
              select
              fullWidth
              size="small"
              label="Filter by Status"
              value={treatedFilter}
              onChange={(e) => setTreatedFilter(e.target.value)}
            >
              <MenuItem value="All">All</MenuItem>
              <MenuItem value="Treated">Treated</MenuItem>
              <MenuItem value="Untreated">Untreated</MenuItem>
            </TextField>
          </Grid>
        </Grid>
        {images.length > 0 ? (
          Object.entries(filteredImages).map(([project, imgs]) => (
            <Box key={project} sx={{ mb: 4 }}>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  mb: 1,
                }}
              >
                <Typography variant="subtitle1" fontWeight={600}>
                  {project}
                </Typography>
                <IconButton
                  color="primary"
                  onClick={() => handleOpenEmailModal(project)}
                  disabled={!client?.email || sendingEmail}
                  title={
                    client?.email
                      ? `Email client about missing files for ${project}`
                      : "Client email not available"
                  }
                  sx={{ p: 0.5 }}
                >
                  {sendingEmail ? (
                    <CircularProgress size={20} color="inherit" />
                  ) : (
                    <MailOutline />
                  )}
                </IconButton>
              </Box>
              <Grid container spacing={2}>
                {imgs.map((image) => (
                  <Grid item xs={12} sm={6} md={4} lg={3} key={image.id}>
                    <Card
                      sx={{
                        borderRadius: 2,
                        overflow: "hidden",
                        position: "relative",
                        boxShadow: 2,
                        transition: "transform 0.2s, box-shadow 0.3s",
                        "&:hover": {
                          transform: "scale(1.05)",
                          boxShadow: "0px 4px 15px rgba(0, 0, 0, 0.1)",
                        },
                      }}
                      onClick={() => {
                        setPreviewImage(image);
                        setPreviewOpen(true);
                      }}
                    >
                      <Checkbox
                        checked={!!image.treated}
                        onClick={(e) => e.stopPropagation()}
                        onChange={() =>
                          handleToggleTreated(image.id, !!image.treated)
                        }
                        sx={{
                          position: "absolute",
                          top: 8,
                          right: 8,
                          zIndex: 1,
                          color: "white",
                          bgcolor: "rgba(0,0,0,0.5)",
                          "&.Mui-checked": {
                            color: "limegreen",
                          },
                        }}
                      />
                      <CardMedia
                        component="img"
                        image={image.url}
                        height="180"
                        sx={{ objectFit: "cover" }}
                      />
                      <Box
                        sx={{
                          p: 1.5,
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          bgcolor: "background.paper",
                        }}
                      >
                        <Typography variant="caption" noWrap>
                          {image.filename}
                        </Typography>
                        {currentUser?.role === "admin" && (
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteImage(image.id, image.path);
                            }}
                          >
                            <Delete fontSize="small" />
                          </IconButton>
                        )}
                      </Box>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Box>
          ))
        ) : (
          <Paper
            sx={{
              py: 8,
              textAlign: "center",
              borderRadius: 3,
              bgcolor: "background.default",
              mt: 4,
            }}
          >
            <Image sx={{ fontSize: 48, mb: 2, color: "text.secondary" }} />
            <Typography variant="h6" color="text.secondary">
              No images uploaded yet
            </Typography>
            <Typography variant="body2" sx={{ mb: 3 }}>
              Upload images to build this client’s gallery
            </Typography>
            <Button
              variant="contained"
              startIcon={<CloudUpload />}
              onClick={() => setUploadModalOpen(true)}
              sx={{
                backgroundColor: "#2575fc",
                "&:hover": { backgroundColor: "#1e5bbf" },
              }}
            >
              Upload Now
            </Button>
          </Paper>
        )}
      </CardContent>
      <Dialog
        open={emailModalOpen}
        onClose={handleCloseEmailModal}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Send Missing Files Email for "{currentProjectForEmail}"
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
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
            label="Email Subject"
            type="text"
            fullWidth
            variant="outlined"
            value={`Missing Files for Project: ${currentProjectForEmail}`}
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
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEmailModal} disabled={sendingEmail}>
            Cancel
          </Button>
          <Button
            onClick={handleSendEmail}
            variant="contained"
            color="primary"
            disabled={sendingEmail}
            startIcon={sendingEmail ? <CircularProgress size={20} /> : null}
          >
            {sendingEmail ? "Sending..." : "Send Email"}
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
};

export default ClientGallery;
