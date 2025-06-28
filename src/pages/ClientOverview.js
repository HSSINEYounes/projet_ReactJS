import {
  Grid,
  Card,
  CardContent,
  Typography,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  TextField,
  Box,
  Button,
} from "@mui/material";
import {
  Person,
  Email,
  Phone,
  LocationOn,
  CalendarToday,
  Work,
} from "@mui/icons-material";
import { format } from "date-fns";

const ClientOverview = ({
  client,
  clientData,
  setClientData,
  editMode,
  setEditMode,
  handleUpdateClient,
  notes,
  setActiveTab,
}) => {
  return (
    <Grid container spacing={3} sx={{ margin: 0 }}>
      <Grid item xs={12} md={7} sx={{ paddingRight: { md: 2 }, width: "70%" }}>
        <Card sx={{ mb: 3, borderRadius: 3, height: "100%", width: "146%" }}>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
              Client Information
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <List dense>
                  <ListItem>
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      <Person color="primary" />
                    </ListItemIcon>
                    <ListItemText
                      primary="Full Name"
                      secondary={
                        editMode ? (
                          <Box sx={{ display: "flex", gap: 2 }}>
                            <TextField
                              value={clientData.firstName || ""}
                              onChange={(e) =>
                                setClientData({
                                  ...clientData,
                                  firstName: e.target.value,
                                })
                              }
                              variant="standard"
                              size="small"
                              placeholder="First Name"
                            />
                            <TextField
                              value={clientData.lastName || ""}
                              onChange={(e) =>
                                setClientData({
                                  ...clientData,
                                  lastName: e.target.value,
                                })
                              }
                              variant="standard"
                              size="small"
                              placeholder="Last Name"
                            />
                          </Box>
                        ) : (
                          `${client.firstName} ${client.lastName}`
                        )
                      }
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      <Email color="primary" />
                    </ListItemIcon>
                    <ListItemText
                      primary="Email"
                      secondary={
                        editMode ? (
                          <TextField
                            value={clientData.email || ""}
                            onChange={(e) =>
                              setClientData({
                                ...clientData,
                                email: e.target.value,
                              })
                            }
                            variant="standard"
                            size="small"
                            fullWidth
                          />
                        ) : (
                          client.email || "Not provided"
                        )
                      }
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      <Phone color="primary" />
                    </ListItemIcon>
                    <ListItemText
                      primary="Phone"
                      secondary={
                        editMode ? (
                          <TextField
                            value={clientData.phone || ""}
                            onChange={(e) =>
                              setClientData({
                                ...clientData,
                                phone: e.target.value,
                              })
                            }
                            variant="standard"
                            size="small"
                            fullWidth
                          />
                        ) : (
                          client.phone || "Not provided"
                        )
                      }
                    />
                  </ListItem>
                </List>
              </Grid>
              <Grid item xs={12} md={6}>
                <List dense>
                  <ListItem>
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      <LocationOn color="primary" />
                    </ListItemIcon>
                    <ListItemText
                      primary="Address"
                      secondary={
                        editMode ? (
                          <TextField
                            value={clientData.address || ""}
                            onChange={(e) =>
                              setClientData({
                                ...clientData,
                                address: e.target.value,
                              })
                            }
                            variant="standard"
                            size="small"
                            fullWidth
                            multiline
                          />
                        ) : (
                          client.address || "Not provided"
                        )
                      }
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      <CalendarToday color="primary" />
                    </ListItemIcon>
                    <ListItemText
                      primary="Member Since"
                      secondary={
                        client.joinDate && !isNaN(new Date(client.joinDate))
                          ? format(new Date(client.joinDate), "MMMM d, yyyy")
                          : "Unknown"
                      }
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      <Work color="primary" />
                    </ListItemIcon>
                    <ListItemText
                      primary="Occupation"
                      secondary={
                        editMode ? (
                          <TextField
                            value={clientData.occupation || ""}
                            onChange={(e) =>
                              setClientData({
                                ...clientData,
                                occupation: e.target.value,
                              })
                            }
                            variant="standard"
                            size="small"
                            fullWidth
                          />
                        ) : (
                          client.occupation || "Not provided"
                        )
                      }
                    />
                  </ListItem>
                </List>
              </Grid>
            </Grid>
            {editMode && (
              <Box
                sx={{
                  mt: 3,
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 2,
                }}
              >
                <Button
                  variant="outlined"
                  onClick={() => {
                    setEditMode(false);
                    setClientData(client);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleUpdateClient}
                >
                  Save Changes
                </Button>
              </Box>
            )}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};

export default ClientOverview;
