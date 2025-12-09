import {
    BrowserRouter as Router,
    Routes,
    Route,
    Navigate,
    useNavigate,
    useLocation
} from 'react-router-dom';

import {
    ThemeProvider,
    createTheme,
    CssBaseline,
    Box,
    Drawer,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    ListItemButton,
    Typography,
    Divider,
    Badge
} from '@mui/material';

import { useEffect, useState } from "react";
import axios from "./api/axios";

import { AuthProvider, useAuth } from './context/AuthContext';

import {
    Dashboard as DashboardIcon,
    Search as SearchIcon,
    CalendarMonth as CalendarIcon,
    Logout as LogoutIcon,
    AdminPanelSettings as AdminIcon,
    SupervisorAccount as SupervisorIcon,
    MeetingRoom as RoomIcon,
    Description as DescriptionIcon,
    Notifications as NotificationsIcon
} from '@mui/icons-material';

// Pages
import LoginPage from './pages/LoginPage';
import RoomsPage from './pages/RoomsPage';
import StudentDashboard from './pages/StudentDashboard';
import AdminDashboard from './pages/AdminDashboard';
import SupervisorDashboard from './pages/SupervisorDashboard';
import DormAdminDashboard from './pages/DormAdminDashboard';
import ResidentDashboard from './pages/ResidentDashboard';
import DormAdminContracts from './pages/DormAdminContracts';
import ChangePasswordPage from './pages/ChangePasswordPage';
import UniversityAdminContracts from './pages/UniversityAdminContracts.jsx';
import NotificationsPage from './pages/NotificationsPage.jsx';

/* ============================================================
   GLOBAL REFRESH TRIGGER — NotificationsPage will call this
============================================================ */
export let triggerUnreadRefresh = () => {};

const theme = createTheme({
    palette: {
        primary: { main: '#1976d2' },
        secondary: { main: '#dc004e' }
    },
    typography: { fontFamily: 'Roboto, sans-serif' }
});

const DRAWER_WIDTH = 260;

/* ============================================================
   SIDEBAR
============================================================ */
function Sidebar() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const [unread, setUnread] = useState(0);

    // Load unread notifications count
    const loadUnread = async () => {
        try {
            const res = await axios.get("/api/notifications/unread/count");
            setUnread(res.data.count);
        } catch (err) {
            console.error("Unread error:", err);
        }
    };

    // Allow NotificationsPage to refresh sidebar badge in real time
    triggerUnreadRefresh = () => loadUnread();

    useEffect(() => {
        if (user) loadUnread();
    }, [user, location.pathname]);

    if (!user || user.must_change_password) return null;

    const items = [];

    if (user.user_type === "STUDENT") {
        items.push(
            { text: "Kambarių paieška", icon: <SearchIcon />, path: "/rooms" },
            { text: "Mano apžiūros", icon: <DashboardIcon />, path: "/dashboard" },
            { text: "Apsilankymai pas mane", icon: <CalendarIcon />, path: "/resident" },
            {
                text: "Pranešimai",
                path: "/notifications",
                icon: (
                    <Badge color="error" badgeContent={unread} invisible={unread === 0}>
                        <NotificationsIcon />
                    </Badge>
                )
            }
        );
    }

    if (user.user_type === "SUPERVISOR") {
        items.push(
            { text: "Apžiūrų valdymas", icon: <SupervisorIcon />, path: "/supervisor" },
        );
    }

    if (user.user_type === "UNIVERSITY_ADMIN") {
        items.push(
            { text: "Vartotojų valdymas", icon: <AdminIcon />, path: "/admin" },
            { text: "Sutarčių valdymas", icon: <DescriptionIcon />, path: "/admin/contracts" },
            { text: "Kambarių paieška", icon: <SearchIcon />, path: "/rooms" },
        );
    }

    if (user.user_type === "DORMITORY_ADMIN") {
        items.push(
            { text: "Kambarių valdymas", icon: <RoomIcon />, path: "/dorm-admin" },
            { text: "Sutarčių valdymas", icon: <DescriptionIcon />, path: "/dorm-admin/contracts" },
        );
    }

    return (
        <Drawer
            variant="permanent"
            sx={{
                width: DRAWER_WIDTH,
                '& .MuiDrawer-paper': {
                    width: DRAWER_WIDTH,
                    boxSizing: 'border-box'
                }
            }}
        >
            <Box sx={{ p: 2, bgcolor: 'primary.main', color: 'white' }}>
                <Typography variant="h5" fontWeight="bold">MyDormy</Typography>
                <Typography variant="body2" mt={1}>
                    {user.first_name} {user.last_name}
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.8 }}>
                    {user.user_type}
                </Typography>
            </Box>

            <List sx={{ pt: 2 }}>
                {items.map((item) => (
                    <ListItem key={item.text} disablePadding>
                        <ListItemButton
                            selected={location.pathname === item.path}
                            onClick={() => navigate(item.path)}
                        >
                            <ListItemIcon>{item.icon}</ListItemIcon>
                            <ListItemText primary={item.text} />
                        </ListItemButton>
                    </ListItem>
                ))}

                <Divider sx={{ my: 2 }} />

                <ListItem disablePadding>
                    <ListItemButton onClick={() => { logout(); navigate("/login"); }}>
                        <ListItemIcon><LogoutIcon /></ListItemIcon>
                        <ListItemText primary="Atsijungti" />
                    </ListItemButton>
                </ListItem>
            </List>
        </Drawer>
    );
}

/* ============================================================
   PROTECTED ROUTE
============================================================ */
function ProtectedRoute({ children, allowedRoles }) {
    const { user, loading } = useAuth();

    if (loading)
        return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}>Kraunama...</Box>;

    if (!user) return <Navigate to="/login" replace />;

    if (user.must_change_password && window.location.pathname !== '/change-password')
        return <Navigate to="/change-password" replace />;

    if (allowedRoles && !allowedRoles.includes(user.user_type))
        return <Navigate to="/" replace />;

    return children;
}

/* ============================================================
   MAIN APP CONTENT
============================================================ */
function AppContent() {
    const { user } = useAuth();

    return (
        <Box sx={{ display: 'flex', minHeight: '100vh' }}>
            {user && !user.must_change_password && <Sidebar />}

            <Box component="main" sx={{ flexGrow: 1, p: 0 }}>
                <Routes>
                    <Route path="/login" element={<LoginPage />} />

                    <Route path="/change-password" element={<ProtectedRoute><ChangePasswordPage /></ProtectedRoute>} />

                    <Route path="/rooms" element={<ProtectedRoute allowedRoles={['STUDENT','UNIVERSITY_ADMIN']}><RoomsPage /></ProtectedRoute>} />
                    <Route path="/dashboard" element={<ProtectedRoute allowedRoles={['STUDENT']}><StudentDashboard /></ProtectedRoute>} />
                    <Route path="/resident" element={<ProtectedRoute allowedRoles={['STUDENT']}><ResidentDashboard /></ProtectedRoute>} />
                    <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />

                    <Route path="/admin" element={<ProtectedRoute allowedRoles={['UNIVERSITY_ADMIN']}><AdminDashboard /></ProtectedRoute>} />
                    <Route path="/admin/contracts" element={<ProtectedRoute allowedRoles={['UNIVERSITY_ADMIN']}><UniversityAdminContracts /></ProtectedRoute>} />

                    <Route path="/dorm-admin" element={<ProtectedRoute allowedRoles={['DORMITORY_ADMIN']}><DormAdminDashboard /></ProtectedRoute>} />
                    <Route path="/dorm-admin/contracts" element={<ProtectedRoute allowedRoles={['DORMITORY_ADMIN']}><DormAdminContracts /></ProtectedRoute>} />

                    <Route path="/supervisor" element={<ProtectedRoute allowedRoles={['SUPERVISOR']}><SupervisorDashboard /></ProtectedRoute>} />

                    <Route path="/" element={
                        user ? (
                            user.user_type === 'STUDENT' ? <Navigate to="/rooms" replace />
                                : user.user_type === 'UNIVERSITY_ADMIN' ? <Navigate to="/admin" replace />
                                    : user.user_type === 'SUPERVISOR' ? <Navigate to="/supervisor" replace />
                                        : user.user_type === 'DORMITORY_ADMIN' ? <Navigate to="/dorm-admin" replace />
                                            : <Navigate to="/rooms" replace />
                        ) : <Navigate to="/login" replace />
                    } />

                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </Box>
        </Box>
    );
}

/* ============================================================
   MAIN APP
============================================================ */
function App() {
    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <AuthProvider>
                <Router>
                    <AppContent />
                </Router>
            </AuthProvider>
        </ThemeProvider>
    );
}

export default App;
