import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
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
    Divider
} from '@mui/material';

import { AuthProvider, useAuth } from './context/AuthContext';

import {
    Dashboard as DashboardIcon,
    Search as SearchIcon,
    CalendarMonth as CalendarIcon,
    Logout as LogoutIcon,
    AdminPanelSettings as AdminIcon,
    SupervisorAccount as SupervisorIcon,
    MeetingRoom as RoomIcon,
    Description as DescriptionIcon
} from '@mui/icons-material';

import { useNavigate, useLocation } from 'react-router-dom';

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

// NEW:
import UniversityAdminContracts from './pages/UniversityAdminContracts.jsx';

const theme = createTheme({
    palette: {
        primary: { main: '#1976d2' },
        secondary: { main: '#dc004e' }
    },
    typography: { fontFamily: 'Roboto, sans-serif' }
});

const DRAWER_WIDTH = 260;

// ---------------------------
// SIDEBAR
// ---------------------------
function Sidebar() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    if (!user || user.must_change_password) return null;

    const getMenuItems = () => {
        const items = [];

        // Student
        if (user.user_type === 'STUDENT') {
            items.push(
                { text: 'Kambarių paieška', icon: <SearchIcon />, path: '/rooms' },
                { text: 'Mano apžiūros', icon: <DashboardIcon />, path: '/dashboard' },
                { text: 'Apsilankymai pas mane', icon: <CalendarIcon />, path: '/resident' }
            );
        }

        // Supervisor
        if (user.user_type === 'SUPERVISOR') {
            items.push(
                { text: 'Apžiūrų valdymas', icon: <SupervisorIcon />, path: '/supervisor' }
            );
        }

        // University Admin
        if (user.user_type === 'UNIVERSITY_ADMIN') {
            items.push(
                { text: 'Vartotojų valdymas', icon: <AdminIcon />, path: '/admin' },
                { text: 'Sutarčių valdymas', icon: <DescriptionIcon />, path: '/admin/contracts' }, // NEW
                { text: 'Kambarių paieška', icon: <SearchIcon />, path: '/rooms' }
            );
        }

        // Dormitory Admin
        if (user.user_type === 'DORMITORY_ADMIN') {
            items.push(
                { text: 'Kambarių valdymas', icon: <RoomIcon />, path: '/dorm-admin' },
                { text: 'Sutarčių valdymas', icon: <DescriptionIcon />, path: '/dorm-admin/contracts' }
            );
        }

        return items;
    };

    const menuItems = getMenuItems();

    return (
        <Drawer
            variant="permanent"
            sx={{
                width: DRAWER_WIDTH,
                flexShrink: 0,
                '& .MuiDrawer-paper': {
                    width: DRAWER_WIDTH,
                    boxSizing: 'border-box'
                }
            }}
        >
            <Box sx={{ p: 2, bgcolor: 'primary.main', color: 'white' }}>
                <Typography variant="h5" fontWeight="bold">
                    MyDormy
                </Typography>
                <Typography variant="body2" mt={1}>
                    {user.first_name} {user.last_name}
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.8 }}>
                    {user.user_type}
                </Typography>
            </Box>

            <List sx={{ pt: 2 }}>
                {menuItems.map((item) => (
                    <ListItem key={item.text} disablePadding>
                        <ListItemButton
                            selected={location.pathname === item.path}
                            onClick={() => navigate(item.path)}
                            sx={{
                                '&.Mui-selected': {
                                    bgcolor: 'primary.light',
                                    color: 'primary.main',
                                    '&:hover': { bgcolor: 'primary.light' }
                                }
                            }}
                        >
                            <ListItemIcon
                                sx={{ color: location.pathname === item.path ? 'primary.main' : 'inherit' }}
                            >
                                {item.icon}
                            </ListItemIcon>
                            <ListItemText primary={item.text} />
                        </ListItemButton>
                    </ListItem>
                ))}

                <Divider sx={{ my: 2 }} />

                <ListItem disablePadding>
                    <ListItemButton
                        onClick={() => {
                            logout();
                            navigate('/login');
                        }}
                    >
                        <ListItemIcon>
                            <LogoutIcon />
                        </ListItemIcon>
                        <ListItemText primary="Atsijungti" />
                    </ListItemButton>
                </ListItem>
            </List>
        </Drawer>
    );
}

// ---------------------------
// PROTECTED ROUTE
// ---------------------------
function ProtectedRoute({ children, allowedRoles }) {
    const { user, loading } = useAuth();

    if (loading)
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}>
                Kraunama...
            </Box>
        );

    if (!user) return <Navigate to="/login" replace />;

    if (user.must_change_password && window.location.pathname !== '/change-password') {
        return <Navigate to="/change-password" replace />;
    }

    if (allowedRoles && !allowedRoles.includes(user.user_type)) {
        return <Navigate to="/" replace />;
    }

    return children;
}

// ---------------------------
// MAIN APP CONTENT
// ---------------------------
function AppContent() {
    const { user } = useAuth();

    return (
        <Box sx={{ display: 'flex', minHeight: '100vh' }}>
            {user && !user.must_change_password && <Sidebar />}

            <Box component="main" sx={{ flexGrow: 1, bgcolor: 'background.default', p: 0 }}>
                <Routes>
                    {/* Public */}
                    <Route path="/login" element={<LoginPage />} />

                    {/* Change Password */}
                    <Route
                        path="/change-password"
                        element={
                            <ProtectedRoute>
                                <ChangePasswordPage />
                            </ProtectedRoute>
                        }
                    />

                    {/* Student */}
                    <Route
                        path="/rooms"
                        element={
                            <ProtectedRoute allowedRoles={['STUDENT', 'UNIVERSITY_ADMIN']}>
                                <RoomsPage />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/dashboard"
                        element={
                            <ProtectedRoute allowedRoles={['STUDENT']}>
                                <StudentDashboard />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/resident"
                        element={
                            <ProtectedRoute allowedRoles={['STUDENT']}>
                                <ResidentDashboard />
                            </ProtectedRoute>
                        }
                    />

                    {/* University Admin */}
                    <Route
                        path="/admin"
                        element={
                            <ProtectedRoute allowedRoles={['UNIVERSITY_ADMIN']}>
                                <AdminDashboard />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/admin/contracts"
                        element={
                            <ProtectedRoute allowedRoles={['UNIVERSITY_ADMIN']}>
                                <UniversityAdminContracts />
                            </ProtectedRoute>
                        }
                    />

                    {/* Dorm Admin */}
                    <Route
                        path="/dorm-admin"
                        element={
                            <ProtectedRoute allowedRoles={['DORMITORY_ADMIN']}>
                                <DormAdminDashboard />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/dorm-admin/contracts"
                        element={
                            <ProtectedRoute allowedRoles={['DORMITORY_ADMIN']}>
                                <DormAdminContracts />
                            </ProtectedRoute>
                        }
                    />

                    {/* Supervisor */}
                    <Route
                        path="/supervisor"
                        element={
                            <ProtectedRoute allowedRoles={['SUPERVISOR']}>
                                <SupervisorDashboard />
                            </ProtectedRoute>
                        }
                    />

                    {/* Default */}
                    <Route
                        path="/"
                        element={
                            user ? (
                                user.user_type === 'STUDENT' ? (
                                    <Navigate to="/rooms" replace />
                                ) : user.user_type === 'UNIVERSITY_ADMIN' ? (
                                    <Navigate to="/admin" replace />
                                ) : user.user_type === 'SUPERVISOR' ? (
                                    <Navigate to="/supervisor" replace />
                                ) : user.user_type === 'DORMITORY_ADMIN' ? (
                                    <Navigate to="/dorm-admin" replace />
                                ) : (
                                    <Navigate to="/rooms" replace />
                                )
                            ) : (
                                <Navigate to="/login" replace />
                            )
                        }
                    />

                    {/* 404 */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </Box>
        </Box>
    );
}

// ---------------------------
// MAIN APP
// ---------------------------
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
