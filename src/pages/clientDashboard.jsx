import React, { useState, useEffect, useMemo } from "react";
import {
  Box,
  Typography,
  Container,
  Grid,
  Paper,
  CircularProgress,
  useTheme,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Skeleton,
} from "@mui/material";
import {
  QueryStats as StatsIcon,
  MonetizationOn as NextPaymentIcon,
  Folder as ProjectIcon,
} from "@mui/icons-material";
import { useAuth } from "../contexts/AuthContext";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
} from "firebase/firestore";
import { firestore } from "../firebase";
import { format, addMonths, setDate, isPast } from "date-fns";
import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import { parse, startOfWeek, getDay } from "date-fns";
import { enUS } from "date-fns/locale/en-US";

const locales = {
  "en-US": enUS,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

const StatCard = ({ icon, title, value, color }) => {
  const theme = useTheme();
  return (
    <Paper
      elevation={4}
      sx={{
        p: theme.spacing(3),
        borderRadius: theme.shape.borderRadius * 2,
        backgroundColor: color,
        color: "#fff",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        transition: "transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out",
        "&:hover": {
          transform: "translateY(-5px)",
          boxShadow: theme.shadows[6],
        },
      }}
    >
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <Box>
          <Typography variant="subtitle2" sx={{ opacity: 0.8 }}>
            {title}
          </Typography>
          <Typography variant="h5" fontWeight={700}>
            {value}
          </Typography>
        </Box>
        <Box sx={{ opacity: 0.7, color: "rgba(255,255,255,0.8)" }}>{icon}</Box>
      </Box>
    </Paper>
  );
};

const ClientDashboard = () => {
  const { currentUser } = useAuth();
  const [userData, setUserData] = useState(null);
  const [recentActivities, setRecentActivities] = useState([]);
  const [projectsOverview, setProjectsOverview] = useState([]);
  const [nextPaymentDate, setNextPaymentDate] = useState(null);
  const [clientNotes, setClientNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const theme = useTheme();

  useEffect(() => {
    const fetchUserDashboardData = async () => {
      if (!currentUser || !currentUser.uid) {
        setLoading(false);
        return;
      }

      try {
        const userDocRef = doc(firestore, "users", currentUser.uid);
        const userDocSnap = await getDoc(userDocRef);
        let fetchedUserData = null;

        if (userDocSnap.exists()) {
          fetchedUserData = { id: userDocSnap.id, ...userDocSnap.data() };
          setUserData(fetchedUserData);
        } else {
          setUserData(null);
        }

        const activitiesRef = collection(firestore, "activities");
        const userActivitiesQuery = query(
          activitiesRef,
          where("clientId", "==", currentUser.uid),
          orderBy("timestamp", "desc"),
          limit(5)
        );
        const activitiesSnapshot = await getDocs(userActivitiesQuery);
        const fetchedActivities = activitiesSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          formattedDate: doc.data().timestamp?.toDate
            ? format(doc.data().timestamp.toDate(), "MMM dd, h:mm a")
            : "N/A",
        }));
        setRecentActivities(fetchedActivities);

        const clientImagesRef = collection(firestore, "userImages");
        const userImagesQuery = query(
          clientImagesRef,
          where("userId", "==", currentUser.uid),
          where("type", "==", "gallery")
        );
        const imagesSnapshot = await getDocs(userImagesQuery);
        const allClientImages = imagesSnapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }));

        const projectsMap = allClientImages.reduce((acc, image) => {
          const projectName = image.project || "Uncategorized";
          if (!acc[projectName]) {
            acc[projectName] = {
              totalImages: 0,
              treatedImages: 0,
            };
          }
          acc[projectName].totalImages++;
          if (image.treated) {
            acc[projectName].treatedImages++;
          }
          return acc;
        }, {});

        const processedProjects = Object.keys(projectsMap).map((name) => ({
          name,
          ...projectsMap[name],
        }));
        setProjectsOverview(processedProjects);

        if (fetchedUserData && fetchedUserData.createdAt) {
          const userCreatedAt = fetchedUserData.createdAt?.toDate
            ? fetchedUserData.createdAt.toDate()
            : new Date(fetchedUserData.createdAt);

          const today = new Date();
          let nextPayment = setDate(
            addMonths(userCreatedAt, 1),
            userCreatedAt.getDate()
          );

          while (
            isPast(nextPayment) &&
            nextPayment.getMonth() === today.getMonth()
          ) {
            nextPayment = addMonths(nextPayment, 1);
          }
          const dayOfMonth = userCreatedAt.getDate();
          let candidatePaymentDate = new Date(
            today.getFullYear(),
            today.getMonth() + 1,
            dayOfMonth
          );

          if (
            isPast(candidatePaymentDate) &&
            candidatePaymentDate.getMonth() === today.getMonth()
          ) {
            candidatePaymentDate = addMonths(candidatePaymentDate, 1);
          }

          setNextPaymentDate(candidatePaymentDate);
        }

        const clientNotesRef = collection(firestore, "clientNotes");
        const userNotesQuery = query(
          clientNotesRef,
          where("clientId", "==", currentUser.uid),
          orderBy("date", "desc"),
          limit(5)
        );
        const notesSnapshot = await getDocs(userNotesQuery);
        const fetchedNotes = notesSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          formattedDate: doc.data().date?.toDate
            ? format(doc.data().date.toDate(), "MMM dd, h:mm a")
            : "N/A",
        }));
        setClientNotes(fetchedNotes);
      } catch (error) {
        console.error("Error fetching user dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserDashboardData();
  }, [currentUser]);

  const events = useMemo(() => {
    const payDateEvents = [];
    if (
      userData &&
      userData.joinDate &&
      userData.firstName &&
      userData.lastName
    ) {
      const joinDate = userData.joinDate?.toDate
        ? userData.joinDate.toDate()
        : new Date(userData.joinDate);
      const joinDay = joinDate.getDate();
      const today = new Date();
      const currentYear = today.getFullYear();
      const nextYear = currentYear + 1;

      for (let year = currentYear; year <= nextYear; year++) {
        for (let month = 0; month < 12; month++) {
          const payDate = new Date(year, month, joinDay);
          if (payDate.getMonth() === month) {
            payDateEvents.push({
              title: `Your Pay Date`,
              start: payDate,
              end: payDate,
              allDay: true,
              resource: userData,
            });
          }
        }
      }
    }
    return payDateEvents;
  }, [userData]);

  const eventPropGetter = () => {
    return {
      style: {
        backgroundColor: theme.palette.secondary.main,
        color: theme.palette.secondary.contrastText,
        borderRadius: "4px",
        border: `1px solid ${theme.palette.secondary.dark}`,
        opacity: 0.9,
        fontWeight: 600,
        fontSize: "0.75rem",
      },
    };
  };

  if (loading) {
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

  if (!userData) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        justifyContent="center"
        alignItems="center"
        minHeight="60vh"
      >
        <Typography variant="h6" color="text.secondary" gutterBottom>
          No user profile found.
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Please contact support to resolve this issue.
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
          Welcome, {userData.firstName || "User"}!
        </Typography>

        <Grid container spacing={theme.spacing(3)}>
          <Grid item xs={12} sm={6} md={4}>
            {loading ? (
              <Skeleton
                variant="rectangular"
                height={120}
                sx={{ borderRadius: theme.shape.borderRadius * 2 }}
              />
            ) : (
              <StatCard
                icon={
                  <StatsIcon fontSize="large" aria-label="Client Status Icon" />
                }
                title="Your Status"
                value={
                  userData.status
                    ? userData.status.charAt(0).toUpperCase() +
                      userData.status.slice(1)
                    : "N/A"
                }
                color={theme.palette.primary.main}
              />
            )}
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            {loading ? (
              <Skeleton
                variant="rectangular"
                height={120}
                sx={{ borderRadius: theme.shape.borderRadius * 2 }}
              />
            ) : (
              <StatCard
                icon={
                  <NextPaymentIcon
                    fontSize="large"
                    aria-label="Next Payment Icon"
                  />
                }
                title="Next Payment Due"
                value={
                  nextPaymentDate
                    ? format(nextPaymentDate, "MMM dd, yyyy")
                    : "N/A"
                }
                color={theme.palette.success.main}
              />
            )}
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            {loading ? (
              <Skeleton
                variant="rectangular"
                height={120}
                sx={{ borderRadius: theme.shape.borderRadius * 2 }}
              />
            ) : (
              <StatCard
                icon={
                  <ProjectIcon
                    fontSize="large"
                    aria-label="Total Projects Icon"
                  />
                }
                title="Total Projects"
                value={projectsOverview.length}
                color={theme.palette.info.main}
              />
            )}
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography
              variant="h6"
              gutterBottom
              sx={{
                mt: theme.spacing(4),
                mb: theme.spacing(2),
                fontWeight: 600,
              }}
            >
              Your Projects Overview
            </Typography>
            {loading ? (
              <Skeleton
                variant="rectangular"
                height={250}
                sx={{ borderRadius: theme.shape.borderRadius * 2 }}
              />
            ) : (
              <Paper
                elevation={3}
                sx={{
                  p: theme.spacing(3),
                  borderRadius: theme.shape.borderRadius * 2,
                  maxHeight: 400,
                  overflowY: "auto",
                }}
              >
                {projectsOverview.length > 0 ? (
                  <TableContainer>
                    <Table size="small">
                      <TableHead
                        sx={{ backgroundColor: theme.palette.grey[50] }}
                      >
                        <TableRow>
                          <TableCell sx={{ fontWeight: "bold" }}>
                            Project Name
                          </TableCell>
                          <TableCell sx={{ fontWeight: "bold" }}>
                            Total Images
                          </TableCell>
                          <TableCell sx={{ fontWeight: "bold" }}>
                            Treated Images
                          </TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {projectsOverview.map((project, index) => (
                          <TableRow key={project.name || index} hover>
                            <TableCell>{project.name}</TableCell>
                            <TableCell>{project.totalImages}</TableCell>
                            <TableCell>{project.treatedImages}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                ) : (
                  <Typography
                    variant="body1"
                    color="text.secondary"
                    align="center"
                    sx={{ py: theme.spacing(3) }}
                  >
                    No projects found for you.
                  </Typography>
                )}
              </Paper>
            )}
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography
              variant="h6"
              gutterBottom
              sx={{
                mt: theme.spacing(4),
                mb: theme.spacing(2),
                fontWeight: 600,
              }}
            >
              Your Pay Dates Calendar
            </Typography>
            {loading ? (
              <Skeleton
                variant="rectangular"
                height={350}
                sx={{ borderRadius: theme.shape.borderRadius * 2 }}
              />
            ) : (
              <Paper
                elevation={3}
                sx={{
                  p: theme.spacing(1),
                  borderRadius: theme.shape.borderRadius * 2,
                  height: 350,
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                {events.length > 0 ? (
                  <Box
                    sx={{
                      flexGrow: 1,
                      px: theme.spacing(1),
                      pb: theme.spacing(1),
                    }}
                  >
                    <Calendar
                      localizer={localizer}
                      events={events}
                      startAccessor="start"
                      endAccessor="end"
                      style={{
                        height: "100%",
                        fontFamily: theme.typography.fontFamily,
                      }}
                      views={["month"]}
                      defaultView="month"
                      eventPropGetter={eventPropGetter}
                      messages={{
                        next: "Next",
                        previous: "Back",
                        today: "Today",
                        month: "Month",
                      }}
                    />
                  </Box>
                ) : (
                  <Box
                    display="flex"
                    justifyContent="center"
                    alignItems="center"
                    height="70%"
                    sx={{ px: theme.spacing(2) }}
                  >
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      align="center"
                    >
                      No pay date information available for your profile.
                    </Typography>
                  </Box>
                )}
              </Paper>
            )}
          </Grid>
          <Grid item xs={12}>
            <Typography
              variant="h6"
              gutterBottom
              sx={{
                mt: theme.spacing(4),
                mb: theme.spacing(2),
                fontWeight: 600,
              }}
            >
              Your Recent Activities
            </Typography>
            {loading ? (
              <Skeleton
                variant="rectangular"
                height={250}
                sx={{ borderRadius: theme.shape.borderRadius * 2 }}
              />
            ) : (
              <Paper
                elevation={3}
                sx={{
                  p: theme.spacing(3),
                  borderRadius: theme.shape.borderRadius * 2,
                }}
              >
                {recentActivities.length > 0 ? (
                  <TableContainer sx={{ maxHeight: 250, overflowY: "auto" }}>
                    <Table size="small">
                      <TableHead
                        sx={{ backgroundColor: theme.palette.grey[50] }}
                      >
                        <TableRow>
                          <TableCell sx={{ fontWeight: "bold" }}>
                            Action
                          </TableCell>
                          <TableCell sx={{ fontWeight: "bold" }}>
                            Date
                          </TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {recentActivities.map((activity) => (
                          <TableRow key={activity.id} hover>
                            <TableCell>{activity.action}</TableCell>
                            <TableCell>{activity.formattedDate}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                ) : (
                  <Typography
                    variant="body1"
                    color="text.secondary"
                    align="center"
                    sx={{ py: theme.spacing(3) }}
                  >
                    No recent activities recorded for you.
                  </Typography>
                )}
              </Paper>
            )}
          </Grid>
          <Grid item xs={12}>
            <Typography
              variant="h6"
              gutterBottom
              sx={{
                mt: theme.spacing(4),
                mb: theme.spacing(2),
                fontWeight: 600,
              }}
            >
              Your Recent Notes
            </Typography>
            {loading ? (
              <Skeleton
                variant="rectangular"
                height={250}
                sx={{ borderRadius: theme.shape.borderRadius * 2 }}
              />
            ) : (
              <Paper
                elevation={3}
                sx={{
                  p: theme.spacing(3),
                  borderRadius: theme.shape.borderRadius * 2,
                }}
              >
                {clientNotes.length > 0 ? (
                  <TableContainer sx={{ maxHeight: 250, overflowY: "auto" }}>
                    <Table size="small">
                      <TableHead
                        sx={{ backgroundColor: theme.palette.grey[50] }}
                      >
                        <TableRow>
                          <TableCell sx={{ fontWeight: "bold" }}>
                            Author
                          </TableCell>
                          <TableCell sx={{ fontWeight: "bold" }}>
                            Content
                          </TableCell>
                          <TableCell sx={{ fontWeight: "bold" }}>
                            Date
                          </TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {clientNotes.map((note) => (
                          <TableRow key={note.id} hover>
                            <TableCell>{note.author || "N/A"}</TableCell>
                            <TableCell>{note.content || "N/A"}</TableCell>
                            <TableCell>{note.formattedDate}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                ) : (
                  <Typography
                    variant="body1"
                    color="text.secondary"
                    align="center"
                    sx={{ py: theme.spacing(3) }}
                  >
                    No recent notes found for you.
                  </Typography>
                )}
              </Paper>
            )}
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default ClientDashboard;
