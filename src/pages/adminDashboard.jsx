import { useState, useEffect, useMemo } from "react";
import emailjs from "@emailjs/browser";
import {
  Box,
  Typography,
  Grid,
  Paper,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Avatar,
  useTheme,
  Container,
  Skeleton,
  TablePagination,
} from "@mui/material";
import {
  Groups as ClientsIcon,
  SupervisorAccount as ActiveClientsIcon,
  HowToReg as NewClientsIcon,
} from "@mui/icons-material";
import {
  collection,
  query,
  where,
  getDocs,
  getCountFromServer,
  Timestamp,
  updateDoc,
  doc,
} from "firebase/firestore";
import { firestore } from "../firebase";
import {
  format,
  parse,
  startOfWeek,
  getDay,
  isBefore,
  differenceInDays,
} from "date-fns";
import enUS from "date-fns/locale/en-US";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip as RechartsTooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import { toast } from "react-toastify";

const locales = { "en-US": enUS };
const EMAILJS_SERVICE_ID = "service_fzju5op";
const EMAILJS_TEMPLATE_ID = "Relance";
const EMAILJS_PUBLIC_KEY = "TR2X7p2WzUNxm8gmj";
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});
const PAYMENT_REMINDER_TYPES = {
  TEN_DAYS_BEFORE: "10_days_before",
  ONE_DAY_BEFORE: "1_day_before",
  ON_PAY_DAY: "on_pay_day",
  FIVE_DAYS_AFTER: "5_days_after",
};

const convertToDate = (dateField) => {
  if (!dateField) return null;
  if (dateField.toDate && typeof dateField.toDate === "function")
    return dateField.toDate();
  if (typeof dateField === "string") {
    const parsedDate = new Date(dateField);
    return isNaN(parsedDate.getTime()) ? null : parsedDate;
  }
  if (dateField instanceof Date) return dateField;
  return null;
};

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
        transition: "transform 0.2s, box-shadow 0.2s",
        "&:hover": {
          transform: "translateY(-5px)",
          boxShadow: theme.shadows[6],
        },
      }}
    >
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="flex-start"
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

const ClientStatusChart = ({ data }) => {
  const theme = useTheme();
  const COLORS = [
    theme.palette.primary.main,
    theme.palette.success.main,
    theme.palette.warning.main,
    theme.palette.error.main,
    theme.palette.info.main,
  ];
  return (
    <Paper elevation={3} sx={{ p: 3, borderRadius: 4, height: 280 }}>
      <Typography variant="h6" gutterBottom sx={{ mb: 2, fontWeight: 600 }}>
        Client Status Distribution
      </Typography>
      {data.length > 0 ? (
        <ResponsiveContainer width="100%" height="80%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={3}
              dataKey="value"
              labelLine={false}
              label={({ name, percent }) =>
                `${name} ${(percent * 100).toFixed(0)}%`
              }
            >
              {data.map((_, idx) => (
                <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
              ))}
            </Pie>
            <RechartsTooltip />
            <Legend wrapperStyle={{ fontSize: "0.8rem" }} />
          </PieChart>
        </ResponsiveContainer>
      ) : (
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          height="70%"
        >
          <Typography variant="body2" color="text.secondary">
            No client status data available.
          </Typography>
        </Box>
      )}
    </Paper>
  );
};

const NewClientsChart = ({ data }) => {
  const theme = useTheme();
  return (
    <Paper elevation={3} sx={{ p: 3, borderRadius: 4, height: 280 }}>
      <Typography variant="h6" gutterBottom sx={{ mb: 2, fontWeight: 600 }}>
        New Clients Per Month
      </Typography>
      {data.length > 0 ? (
        <ResponsiveContainer width="100%" height="80%">
          <BarChart
            data={data}
            margin={{ top: 10, right: 30, left: 20, bottom: 0 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              strokeOpacity={0.5}
            />
            <XAxis
              dataKey="name"
              axisLine={false}
              tickLine={false}
              style={{ fontSize: "0.75rem" }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              style={{ fontSize: "0.75rem" }}
            />
            <RechartsTooltip
              cursor={{ fill: theme.palette.action.hover, opacity: 0.7 }}
            />
            <Legend wrapperStyle={{ fontSize: "0.8rem" }} />
            <Bar
              dataKey="clients"
              fill={theme.palette.primary.main}
              name="New Clients"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          height="70%"
        >
          <Typography variant="body2" color="text.secondary">
            No new client data available.
          </Typography>
        </Box>
      )}
    </Paper>
  );
};

const PayDateCalendar = ({ clients = [] }) => {
  const theme = useTheme();
  const events = useMemo(() => {
    const payDateEvents = [];
    const today = new Date();
    const currentYear = today.getFullYear();
    const nextYear = currentYear + 1;
    clients.forEach((client) => {
      if (client.joinDate && client.firstName && client.lastName) {
        const joinDate = new Date(client.joinDate);
        const joinDay = joinDate.getDate();
        for (let year = currentYear; year <= nextYear; year++) {
          for (let month = 0; month < 12; month++) {
            const payDate = new Date(year, month, joinDay);
            if (payDate.getMonth() === month) {
              payDateEvents.push({
                title: `${client.firstName} ${client.lastName}'s Pay Date`,
                start: payDate,
                end: payDate,
                allDay: true,
                resource: client,
              });
            }
          }
        }
      }
    });
    return payDateEvents;
  }, [clients]);
  const eventPropGetter = () => ({
    style: {
      backgroundColor: theme.palette.secondary.main,
      color: theme.palette.secondary.contrastText,
      borderRadius: "4px",
      border: `1px solid ${theme.palette.secondary.dark}`,
      opacity: 0.9,
      fontWeight: 600,
      fontSize: "0.75rem",
    },
  });
  return (
    <Paper
      elevation={3}
      sx={{ p: 1, borderRadius: 4, height: 450, width: 500, mt: -20 }}
    >
      <Typography variant="h6" gutterBottom sx={{ mb: 2, fontWeight: 600 }}>
        Client Pay Dates Calendar
      </Typography>
      {clients.length > 0 ? (
        <Box sx={{ height: "calc(100% - 60px)" }}>
          <Calendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            style={{
              height: "100%",
              fontFamily: theme.typography.fontFamily,
              width: "20",
            }}
            views={["month", "week", "day"]}
            defaultView="month"
            eventPropGetter={eventPropGetter}
            messages={{
              next: "Next",
              previous: "Back",
              today: "Today",
              month: "Month",
              week: "Week",
              day: "Day",
            }}
          />
        </Box>
      ) : (
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          height="70%"
        >
          <Typography variant="body2" color="text.secondary">
            No clients to display pay dates for.
          </Typography>
        </Box>
      )}
    </Paper>
  );
};

const sendPaymentReminderEmail = async (client, reminderType, nextPayDate) => {
  if (!client.email) {
    console.warn(
      `Client ${client.firstName} ${client.lastName} has no email. Skipping reminder.`
    );
    return;
  }
  if (!EMAILJS_SERVICE_ID || !EMAILJS_TEMPLATE_ID || !EMAILJS_PUBLIC_KEY) {
    console.error(
      "EmailJS credentials are not fully set. Skipping email send."
    );
    toast.error("Email service not configured. Cannot send reminder.");
    return;
  }
  const formattedPayDate = format(nextPayDate, "MMMM d, yyyy");
  let subject = "";
  let message = "";
  switch (reminderType) {
    case PAYMENT_REMINDER_TYPES.TEN_DAYS_BEFORE:
      subject = `Friendly Reminder: Your Payment for ${formattedPayDate} is Approaching!`;
      message = `Dear ${client.firstName},\n\nThis is a friendly reminder that your payment for your services with us is due on ${formattedPayDate}. Please ensure your payment is processed on time.\n\nThank you,\n`;
      break;
    case PAYMENT_REMINDER_TYPES.ONE_DAY_BEFORE:
      subject = `Urgent Reminder: Your Payment for ${formattedPayDate} is Tomorrow!`;
      message = `Dear ${client.firstName},\n\nJust a quick heads-up: your payment for your services with us is due tomorrow, ${formattedPayDate}. Please make sure your payment is completed by then.\n\nBest regards,\n`;
      break;
    case PAYMENT_REMINDER_TYPES.ON_PAY_DAY:
      subject = `Payment Due Today: ${formattedPayDate}!`;
      message = `Dear ${client.firstName},\n\nYour payment for services is due today, ${formattedPayDate}. We appreciate your prompt payment.\n\nThank you,\n`;
      break;
    case PAYMENT_REMINDER_TYPES.FIVE_DAYS_AFTER:
      subject = `Action Required: Overdue Payment for ${formattedPayDate}`;
      message = `Dear ${client.firstName},\n\nOur records show that your payment due on ${formattedPayDate} is now 5 days overdue. Please settle this amount as soon as possible to avoid any service interruption. If you have already made the payment, please disregard this email.\n\nContact us if you have any questions.\n\nSincerely,\n `;
      break;
    default:
      console.error("Unknown reminder type:", reminderType);
      toast.error("An unknown reminder type was requested.");
      return;
  }
  const templateParams = {
    to_name: `${client.firstName} ${client.lastName}`,
    to_email: client.email,
    subject,
    message,
  };
  try {
    await emailjs.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_TEMPLATE_ID,
      templateParams,
      EMAILJS_PUBLIC_KEY
    );
    toast.success(
      `Sent "${reminderType.replace(/_/g, " ")}" reminder to ${
        client.firstName
      } ${client.lastName}.`
    );
    const clientDocRef = doc(firestore, "users", client.id);
    await updateDoc(clientDocRef, {
      [`lastReminderSent.${reminderType}`]: Timestamp.now(),
    });
  } catch (error) {
    console.error(
      `Failed to send ${reminderType} reminder to ${client.firstName} ${client.lastName}:`,
      error
    );
    toast.error(
      `Failed to send ${reminderType} reminder to ${client.firstName} ${client.lastName}.`
    );
  }
};

const checkAndSendPaymentReminders = async (clients) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (const client of clients) {
    if (
      !(client.joinDate instanceof Date) ||
      isNaN(client.joinDate.getTime()) ||
      !client.email ||
      !client.id
    ) {
      continue;
    }
    let joinDate = client.joinDate;
    joinDate.setHours(0, 0, 0, 0);
    const joinDay = joinDate.getDate();
    let nextPayDate = new Date(today.getFullYear(), today.getMonth(), joinDay);
    if (
      isBefore(nextPayDate, today) &&
      differenceInDays(nextPayDate, today) !== 0
    ) {
      nextPayDate = new Date(
        today.getFullYear(),
        today.getMonth() + 1,
        joinDay
      );
      if (nextPayDate.getMonth() !== (today.getMonth() + 1) % 12) {
        nextPayDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      }
    }
    nextPayDate.setHours(0, 0, 0, 0);
    const daysUntilPayment = differenceInDays(nextPayDate, today);
    const lastReminderSent = client.lastReminderSent || {};
    if (
      daysUntilPayment === 10 &&
      !lastReminderSent[PAYMENT_REMINDER_TYPES.TEN_DAYS_BEFORE]
    ) {
      await sendPaymentReminderEmail(
        client,
        PAYMENT_REMINDER_TYPES.TEN_DAYS_BEFORE,
        nextPayDate
      );
    } else if (
      daysUntilPayment === 1 &&
      !lastReminderSent[PAYMENT_REMINDER_TYPES.ONE_DAY_BEFORE]
    ) {
      await sendPaymentReminderEmail(
        client,
        PAYMENT_REMINDER_TYPES.ONE_DAY_BEFORE,
        nextPayDate
      );
    } else if (
      daysUntilPayment === 0 &&
      !lastReminderSent[PAYMENT_REMINDER_TYPES.ON_PAY_DAY]
    ) {
      await sendPaymentReminderEmail(
        client,
        PAYMENT_REMINDER_TYPES.ON_PAY_DAY,
        nextPayDate
      );
    } else if (
      daysUntilPayment === -5 &&
      !lastReminderSent[PAYMENT_REMINDER_TYPES.FIVE_DAYS_AFTER]
    ) {
      await sendPaymentReminderEmail(
        client,
        PAYMENT_REMINDER_TYPES.FIVE_DAYS_AFTER,
        nextPayDate
      );
    }
  }
};

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    totalClients: 0,
    activeClients: 0,
    newClientsThisWeek: 0,
    activities: [],
  });
  const [chartData, setChartData] = useState({
    clientStatus: [],
    newClientsMonthly: [],
  });
  const [clientsData, setClientsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const theme = useTheme();

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const usersRef = collection(firestore, "users");
        const activitiesRef = collection(firestore, "activities");
        const clientBaseQuery = query(usersRef, where("role", "==", "client"));
        const [
          totalClientsSnapshot,
          activeClientsSnapshot,
          newClientsSnapshot,
        ] = await Promise.all([
          getCountFromServer(clientBaseQuery),
          (async () => {
            const activeClientsQuery = query(
              clientBaseQuery,
              where("status", "==", "active")
            );
            return getCountFromServer(activeClientsQuery);
          })(),
          (async () => {
            const oneWeekAgo = new Date();
            oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
            const newClientsQuery = query(
              clientBaseQuery,
              where("createdAt", ">=", Timestamp.fromDate(oneWeekAgo))
            );
            return getCountFromServer(newClientsQuery);
          })(),
        ]);
        const allClientsSnapshot = await getDocs(clientBaseQuery);
        const allClients = allClientsSnapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            joinDate: convertToDate(data.joinDate),
            createdAt: convertToDate(data.createdAt),
            updatedAt: convertToDate(data.updatedAt),
            lastReminderSent: data.lastReminderSent || {},
          };
        });
        setClientsData(allClients);
        checkAndSendPaymentReminders(allClients);

        const statusCounts = allClients.reduce((acc, client) => {
          const status = client.status || "unknown";
          acc[status] = (acc[status] || 0) + 1;
          return acc;
        }, {});
        const clientStatusChartData = Object.keys(statusCounts).map(
          (status) => ({
            name: status.charAt(0).toUpperCase() + status.slice(1),
            value: statusCounts[status],
          })
        );
        const newClientsMonthly = allClients.reduce((acc, client) => {
          if (
            client.createdAt instanceof Date &&
            !isNaN(client.createdAt.getTime())
          ) {
            const monthYear = format(client.createdAt, "MMM yy");
            acc[monthYear] = (acc[monthYear] || 0) + 1;
          }
          return acc;
        }, {});
        const newClientsMonthlyChartData = Object.keys(newClientsMonthly)
          .sort(
            (a, b) =>
              parse(a, "MMM yy", new Date()).getTime() -
              parse(b, "MMM yy", new Date()).getTime()
          )
          .map((monthYear) => ({
            name: monthYear,
            clients: newClientsMonthly[monthYear],
          }));

        const activitiesQuery = query(activitiesRef);
        const activitiesSnapshot = await getDocs(activitiesQuery);
        const recentActivities = activitiesSnapshot.docs
          .map((doc) => {
            const data = doc.data();
            return {
              id: doc.id,
              ...data,
              formattedDate: data.timestamp?.toDate
                ? format(data.timestamp.toDate(), "MMM dd, h:mm a")
                : "N/A",
            };
          })
          .sort((a, b) => {
            const dateA = a.timestamp?.toDate
              ? a.timestamp.toDate()
              : new Date(0);
            const dateB = b.timestamp?.toDate
              ? b.timestamp.toDate()
              : new Date(0);
            return dateB.getTime() - dateA.getTime();
          });

        setStats({
          totalClients: totalClientsSnapshot.data().count,
          activeClients: activeClientsSnapshot.data().count,
          newClientsThisWeek: newClientsSnapshot.data().count,
          activities: recentActivities,
        });
        setChartData({
          clientStatus: clientStatusChartData,
          newClientsMonthly: newClientsMonthlyChartData,
        });
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
        toast.error("Failed to load dashboard data.");
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  const handleChangePage = (_, newPage) => setPage(newPage);
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };
  const paginatedActivities = stats.activities.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  return (
    <Box
      sx={{
        p: { xs: 2, sm: 3 },
        backgroundColor: theme.palette.background.default,
        minHeight: "100vh",
      }}
    >
      <Container maxWidth="xl">
        <Typography
          variant="h4"
          gutterBottom
          sx={{ mb: 4, fontWeight: 700, color: theme.palette.text.primary }}
        >
          Admin Dashboard Overview
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6} md={4}>
            {loading ? (
              <Skeleton
                variant="rectangular"
                height={120}
                sx={{ borderRadius: 4 }}
              />
            ) : (
              <StatCard
                icon={
                  <ClientsIcon
                    fontSize="large"
                    aria-label="Total Clients Icon"
                  />
                }
                title="Total Clients"
                value={stats.totalClients}
                color={theme.palette.primary.main}
              />
            )}
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            {loading ? (
              <Skeleton
                variant="rectangular"
                height={120}
                sx={{ borderRadius: 4 }}
              />
            ) : (
              <StatCard
                icon={
                  <ActiveClientsIcon
                    fontSize="large"
                    aria-label="Active Clients Icon"
                  />
                }
                title="Active Clients"
                value={stats.activeClients}
                color={theme.palette.success.main}
              />
            )}
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            {loading ? (
              <Skeleton
                variant="rectangular"
                height={120}
                sx={{ borderRadius: 4 }}
              />
            ) : (
              <StatCard
                icon={
                  <NewClientsIcon
                    fontSize="large"
                    aria-label="New Clients This Week Icon"
                  />
                }
                title="New Clients (7d)"
                value={stats.newClientsThisWeek}
                color={theme.palette.info.main}
              />
            )}
          </Grid>
        </Grid>
        <Grid container spacing={3} sx={{ mt: 4 }}>
          <Grid item xs={12} md={6}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                {loading ? (
                  <Skeleton
                    variant="rectangular"
                    height={280}
                    sx={{ borderRadius: 4 }}
                  />
                ) : (
                  <ClientStatusChart data={chartData.clientStatus} />
                )}
              </Grid>
              <Grid item xs={12}>
                {loading ? (
                  <Skeleton
                    variant="rectangular"
                    height={280}
                    sx={{ borderRadius: 4 }}
                  />
                ) : (
                  <NewClientsChart data={chartData.newClientsMonthly} />
                )}
              </Grid>
            </Grid>
          </Grid>
          <Grid item xs={12} md={6}>
            {loading ? (
              <Skeleton
                variant="rectangular"
                height={600}
                sx={{ borderRadius: 4 }}
              />
            ) : (
              <PayDateCalendar clients={clientsData} />
            )}
          </Grid>
        </Grid>
        <Typography
          variant="h6"
          gutterBottom
          sx={{ mt: 4, mb: 2, fontWeight: 600 }}
        >
          Recent Activities
        </Typography>
        <Paper elevation={3} sx={{ p: 3, borderRadius: 4 }}>
          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
              <CircularProgress size={40} />
            </Box>
          ) : stats.activities.length > 0 ? (
            <TableContainer sx={{ maxHeight: 400, overflowY: "auto" }}>
              <Table stickyHeader size="medium">
                <TableHead sx={{ backgroundColor: theme.palette.grey[50] }}>
                  <TableRow>
                    <TableCell
                      sx={{
                        fontWeight: "bold",
                        borderBottom: `1px solid ${theme.palette.divider}`,
                      }}
                    >
                      User
                    </TableCell>
                    <TableCell
                      sx={{
                        fontWeight: "bold",
                        borderBottom: `1px solid ${theme.palette.divider}`,
                      }}
                    >
                      Action
                    </TableCell>
                    <TableCell
                      sx={{
                        fontWeight: "bold",
                        borderBottom: `1px solid ${theme.palette.divider}`,
                      }}
                    >
                      Date
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginatedActivities.map((activity) => (
                    <TableRow key={activity.id} hover>
                      <TableCell>
                        <Box display="flex" alignItems="center">
                          <Avatar
                            src={activity.userPhoto || ""}
                            sx={{ width: 36, height: 36, mr: 2 }}
                          >
                            {activity.userName?.charAt(0)?.toUpperCase() || "U"}
                          </Avatar>
                          <Typography variant="body2" fontWeight={500}>
                            {activity.userName || "System"}
                          </Typography>
                        </Box>
                      </TableCell>
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
              sx={{ py: 3 }}
            >
              No recent activities found.
            </Typography>
          )}
          {stats.activities.length > rowsPerPage && (
            <TablePagination
              rowsPerPageOptions={[5, 10, 25]}
              component="div"
              count={stats.activities.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
            />
          )}
        </Paper>
      </Container>
    </Box>
  );
};

export default AdminDashboard;
