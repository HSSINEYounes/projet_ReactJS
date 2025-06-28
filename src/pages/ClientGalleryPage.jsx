import React, { useState, useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import {
  Box,
  Typography,
  Container,
  Grid,
  Paper,
  CircularProgress,
  useTheme,
  Button,
  TextField,
  MenuItem,
  Checkbox,
  Card,
  CardMedia,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress,
} from "@mui/material";
import { CloudUpload, Image as ImageIcon } from "@mui/icons-material";
import { useAuth } from "../contexts/AuthContext";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  Timestamp,
} from "firebase/firestore";
import { firestore } from "../firebase";
import { toast } from "react-toastify";

const CLOUDINARY_CLOUD_NAME = "dl6s63fwt";
const CLOUDINARY_UPLOAD_PRESET = "client_upload";

const ClientGalleryPage = () => {
  const { currentUser, loading: authLoading } = useAuth();
  const { clientId: urlClientId } = useParams();

  const [clientImages, setClientImages] = useState([]);
  const [loading, setLoading] = useState(true);
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

  const theme = useTheme();

  const effectiveClientId = useMemo(() => {
    if (urlClientId) {
      return urlClientId;
    }
    if (currentUser && currentUser.uid) {
      return currentUser.uid;
    }
    return null;
  }, [urlClientId, currentUser]);

  const fetchClientImages = async () => {
    if (authLoading || effectiveClientId === null) {
      if (!authLoading && effectiveClientId === null) {
        setLoading(false);
      }
      return;
    }
    setLoading(true);
    try {
      const userImagesRef = collection(firestore, "userImages");
      const userImagesQuery = query(
        userImagesRef,
        where("userId", "==", effectiveClientId),
        where("type", "==", "gallery")
      );
      const imagesSnapshot = await getDocs(userImagesQuery);
      const allClientImages = imagesSnapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));
      setClientImages(allClientImages);
    } catch (error) {
      toast.error("Failed to load images.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClientImages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveClientId, authLoading]);

  const allProjects = useMemo(() => {
    const projects = new Set(
      clientImages.map((img) => img.project).filter(Boolean)
    );
    return ["All", ...Array.from(projects).sort()];
  }, [clientImages]);

  const allUploadProjects = useMemo(() => {
    const projects = new Set(
      clientImages.map((img) => img.project).filter(Boolean)
    );
    return [...Array.from(projects)].sort();
  }, [clientImages]);

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
    if (!effectiveClientId) {
      toast.error("Cannot upload: No valid client ID determined.");
      return;
    }
    if (!newImageProject.trim()) {
      toast.error("Please select or enter a project name for the image.");
      return;
    }
    if (!CLOUDINARY_CLOUD_NAME) {
      toast.error(
        "Cloudinary Cloud Name is not configured. Please check the code."
      );
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
    formData.append(
      "folder",
      `clients/${effectiveClientId}/${newImageProject.trim()}`
    );

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
      await addDoc(collection(firestore, "userImages"), {
        userId: effectiveClientId,
        filename: selectedFile.name,
        mimeType: selectedFile.type,
        project: newImageProject.trim(),
        size: selectedFile.size,
        treated: false,
        uploadedAt: Timestamp.now(),
        url: downloadURL,
        type: "gallery",
      });

      toast.success(
        "Image uploaded successfully! You can now view it in the gallery."
      );
      setUploadModalOpen(false);
      setSelectedFile(null);
      setUploadProgress(0);
      setNewImageProject("");
      setIsAddingNewProject(false);
      fetchClientImages();
    } catch (error) {
      toast.error(
        `Upload failed: ${error.message || "An unexpected error occurred."}`
      );
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteImage = async (imageId, imagePath) => {
    if (currentUser?.role === "admin") {
      toast.info("Admin delete functionality is not yet implemented.");
    } else {
      toast.info("Only admins can delete images.");
    }
  };

  const filteredImages = useMemo(() => {
    return clientImages
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
  }, [clientImages, selectedProject, treatedFilter]);

  if (loading || authLoading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="60vh"
      >
        <CircularProgress size={60} color="primary" />
      </Box>
    );
  }

  if (!effectiveClientId) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        justifyContent="center"
        alignItems="center"
        minHeight="60vh"
      >
        <ImageIcon sx={{ fontSize: 48, mb: 2, color: "text.secondary" }} />
        <Typography variant="h6" color="text.secondary" gutterBottom>
          No client ID specified for the gallery.
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Please log in or ensure the URL contains a valid client ID.
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        p: { xs: theme.spacing(2), sm: theme.spacing(3) },
        backgroundColor: theme.palette.background.default,
        minHeight: "100vh",
      }}
    >
      <Container maxWidth="lg">
        <Typography
          variant="h4"
          gutterBottom
          sx={{ mb: theme.spacing(4), fontWeight: 700 }}
        >
          Your Image Gallery
        </Typography>

        <Paper
          sx={{
            borderRadius: 3,
            boxShadow: 3,
            overflow: "hidden",
            p: theme.spacing(3),
          }}
        >
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 3,
            }}
          >
            <Typography variant="h6" fontWeight={600}>
              Gallery Filters
            </Typography>
            <Button
              variant="contained"
              startIcon={<CloudUpload />}
              onClick={() => setUploadModalOpen(true)}
              sx={{
                borderRadius: 2,
                backgroundColor: theme.palette.primary.main,
                "&:hover": { backgroundColor: theme.palette.primary.dark },
              }}
            >
              Upload
            </Button>
          </Box>

          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} md={6}>
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
            <Grid item xs={12} md={6}>
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

          {clientImages.length > 0 ? (
            Object.entries(filteredImages).map(([project, imgs]) => (
              <Box key={project} sx={{ mb: 4 }}>
                <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                  {project}
                </Typography>
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
                            boxShadow: theme.shadows[6],
                          },
                        }}
                        onClick={() => {
                          setPreviewImage(image);
                          setPreviewOpen(true);
                        }}
                      >
                        <Checkbox
                          checked={!!image.treated}
                          disabled={true}
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
                            "&.Mui-disabled": {
                              opacity: 0.7,
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
                          {currentUser && currentUser.role === "admin" && (
                            <Button
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteImage(
                                  image.id,
                                  image.cloudinaryPublicId
                                );
                              }}
                            >
                              Delete
                            </Button>
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
                bgcolor: theme.palette.background.default,
                mt: 4,
              }}
            >
              <ImageIcon
                sx={{ fontSize: 48, mb: 2, color: "text.secondary" }}
              />
              <Typography variant="h6" color="text.secondary">
                No images found for this gallery.
              </Typography>
              <Typography variant="body2" sx={{ mb: 3 }}>
                Upload images to build your gallery.
              </Typography>
              <Button
                variant="contained"
                startIcon={<CloudUpload />}
                onClick={() => setUploadModalOpen(true)}
                sx={{
                  backgroundColor: theme.palette.primary.main,
                  "&:hover": { backgroundColor: theme.palette.primary.dark },
                }}
              >
                Upload Now
              </Button>
            </Paper>
          )}
        </Paper>
      </Container>

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
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
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
    </Box>
  );
};

export default ClientGalleryPage;
