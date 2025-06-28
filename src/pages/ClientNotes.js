import {
  Box,
  Card,
  CardContent,
  Typography,
  Divider,
  TextField,
  Button,
  Paper,
  List,
  IconButton,
} from "@mui/material";
import { Delete, Notes } from "@mui/icons-material";
import { format } from "date-fns";

const ClientNotes = ({
  notes,
  newNote,
  setNewNote,
  handleAddNote,
  handleDeleteNote,
}) => {
  return (
    <Card sx={{ borderRadius: 3, boxShadow: 3, mb: 4 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
          Client Notes
        </Typography>
        <Divider sx={{ mb: 3 }} />

        <Box sx={{ mb: 3 }}>
          <TextField
            multiline
            rows={4}
            fullWidth
            variant="outlined"
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Add a new note about this client..."
            sx={{
              mb: 2,
              "& .MuiOutlinedInput-root": {
                borderRadius: "8px",
              },
            }}
          />
          <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
            <Button
              variant="contained"
              onClick={handleAddNote}
              disabled={!newNote.trim()}
              sx={{
                backgroundColor: "#2575fc",
                "&:hover": { backgroundColor: "#1e5bbf" },
              }}
            >
              Add Note
            </Button>
          </Box>
        </Box>

        {notes.length > 0 ? (
          <List>
            {notes.map((note) => (
              <Paper
                key={note.id}
                elevation={2}
                sx={{
                  mb: 2,
                  p: 2,
                  bgcolor: "background.paper",
                  borderRadius: 2,
                  boxShadow: 2,
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    mb: 1,
                  }}
                >
                  <Typography variant="body2" color="text.secondary">
                    {format(note.date, "MMMM d, yyyy 'at' h:mm a")}
                  </Typography>
                  <IconButton
                    size="small"
                    onClick={() => handleDeleteNote(note.id)}
                    color="error"
                  >
                    <Delete fontSize="small" />
                  </IconButton>
                </Box>
                <Typography variant="body2">{note.content}</Typography>
              </Paper>
            ))}
          </List>
        ) : (
          <Paper
            variant="outlined"
            sx={{
              p: 4,
              textAlign: "center",
              backgroundColor: "background.default",
              borderRadius: 3,
              boxShadow: 1,
            }}
          >
            <Notes sx={{ fontSize: 60, color: "text.secondary", mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No Notes Yet
            </Typography>
            <Typography variant="body2">
              Add notes to track important information about this client.
            </Typography>
          </Paper>
        )}
      </CardContent>
    </Card>
  );
};

export default ClientNotes;
