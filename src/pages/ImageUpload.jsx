import React, { useState } from "react";
import {
  Button,
  CircularProgress,
  Box,
  Grid,
  IconButton,
  Typography,
} from "@mui/material";
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import { collection, addDoc, deleteDoc, doc } from "firebase/firestore";
import { firestore } from "../firebase";
import { Delete, CloudUpload } from "@mui/icons-material";
import { useSnackbar } from "notistack";

const ImageUpload = ({ clientId, onUploadSuccess }) => {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(null);
  const storage = getStorage();
  const { enqueueSnackbar } = useSnackbar();

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Check file type
    if (!file.type.match("image.*")) {
      enqueueSnackbar("Please upload an image file", { variant: "error" });
      return;
    }

    // Check file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      enqueueSnackbar("File size should be less than 5MB", {
        variant: "error",
      });
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result);
    reader.readAsDataURL(file);
  };

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      // 1. Create storage reference
      const storageRef = ref(storage, `clients/${clientId}/${file.name}`);

      // 2. Upload file
      const snapshot = await uploadBytes(storageRef, file);

      // 3. Get download URL
      const downloadURL = await getDownloadURL(snapshot.ref);

      // 4. Save to Firestore
      await addDoc(collection(firestore, "clientImages"), {
        clientId,
        url: downloadURL,
        path: snapshot.ref.fullPath,
        filename: file.name,
        uploadedAt: new Date().toISOString(),
        size: file.size,
        type: file.type,
      });

      enqueueSnackbar("Image uploaded successfully!", { variant: "success" });
      onUploadSuccess?.();
    } catch (error) {
      console.error("Upload failed:", error);
      enqueueSnackbar(`Upload failed: ${error.message}`, { variant: "error" });
    } finally {
      setUploading(false);
      setPreview(null);
      e.target.value = ""; // Reset file input
    }
  };

  return (
    <Box sx={{ mt: 3, p: 2, border: "1px dashed grey", borderRadius: 1 }}>
      <input
        accept="image/*"
        style={{ display: "none" }}
        id={`upload-image-${clientId}`}
        type="file"
        onChange={handleFileChange}
        onClick={(e) => (e.target.value = null)} // Allow re-uploading same file
      />

      <Grid container spacing={2} alignItems="center">
        {preview && (
          <Grid item xs={12} md={4}>
            <Box position="relative">
              <img
                src={preview}
                alt="Preview"
                style={{
                  width: "100%",
                  maxHeight: 200,
                  objectFit: "contain",
                  borderRadius: 4,
                }}
              />
            </Box>
          </Grid>
        )}

        <Grid item xs={12} md={preview ? 8 : 12}>
          <Typography variant="subtitle1" gutterBottom>
            Upload Client Image
          </Typography>
          <label htmlFor={`upload-image-${clientId}`}>
            <Button
              variant="contained"
              component="span"
              startIcon={<CloudUpload />}
              disabled={uploading}
              sx={{ mr: 2 }}
            >
              {uploading ? <CircularProgress size={24} /> : "Select Image"}
            </Button>
          </label>
          <Typography variant="caption" display="block" sx={{ mt: 1 }}>
            JPG, PNG (Max 5MB)
          </Typography>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ImageUpload;
