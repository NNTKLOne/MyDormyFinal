import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme, CssBaseline, Box, Drawer, List, ListItem, ListItemIcon, ListItemText, ListItemButton, Typography, Divider } from '@mui/material';
import { AuthProvider, useAuth } from './context/AuthContext';

import {
  Dashboard as DashboardIcon,
  Search as SearchIcon,
  CalendarMonth as CalendarIcon,
  Logout as LogoutIcon,
  AdminPanelSettings as AdminIcon,
  SupervisorAccount as SupervisorIcon,
  MeetingRoom as RoomIcon
} from '@mui/icons-material';

import { useNavigate, useLocation } from 'react-router-dom';

import RequirePasswordChange from "./components/RequirePasswordChange";
import PreventAccessIfPasswordChanged from "./components/PreventAccessIfPasswordChanged";
import ChangePasswordPage from "./pages/ChangePasswordPage";

// Pages
import LoginPage from './pages/LoginPage';
import RoomsPage from './pages/RoomsPage';
import StudentDashboard from './pages/StudentDashboard';
import AdminDashboard from './pages/AdminDashboard';
import SupervisorDashboard from './pages/SupervisorDashboard';
import DormAdminDashboard from './pages/DormAdminDashboard';
import ResidentDashboard from './pages/ResidentDashboard';

// ---------- ROLE REDIRECT HELPER --------------
const getRedirectForRole = (role) => {
  switch (role) {
    case "STUDENT":
      return "/rooms";
    case "UNIVERSITY_ADMIN":
      return "/admin";
    case "DORMITORY_ADMIN":
      return "/dorm-admin";
    case "SUPERVISOR":
      return "/supervisor";
    default:
      return "/rooms";
  }
};
// -----------------------------------------------

const theme = createTheme({
  palette: {
    primary: { main: '#1976d2' },
    secondary: { main: '#dc004e' },
  },
  typography: { fontFamily: 'Roboto, sans-serif' },
});

const DRAWER_WIDTH = 260;

function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  if (!user) return null;

  const menuItems = [];

  if (user.user_type === "STUDENT") {
    menuItems.push(
        { text: 'Kambarių paieška', icon: <SearchIcon />, path: '/rooms' },
        { text: 'Mano apžiūros', icon: <DashboardIcon />, path: '/dashboard' },
        { text: 'Mano kambarys', icon: <CalendarIcon />, path: '/resident' },
    );
  }

  if (user.user_type === "UNIVERSITY_ADMIN") {
    menuItems.push(
        { text: 'Vartotojų valdymas', icon: <AdminIcon />, path: '/admin' },
        { text: 'Kambarių paieška', icon: <SearchIcon />, path: '/rooms' }
    );
  }

  if (user.user_type === "DORMITORY_ADMIN") {
    menuItems.push(
        { text: 'Kambarių valdymas', icon: <RoomIcon />, path: '/dorm-admin' }
    );
  }

  if (user.user_type === "SUPERVISOR") {
    menuItems.push(
        { text: 'Apžiūrų valdymas', icon: <SupervisorIcon />, path: '/supervisor' }
    );
  }

  return (
      <Drawer
          variant="permanent"
          sx={{
            width: DRAWER_WIDTH,
            flexShrink: 0,
            '& .MuiDrawer-paper': {
              width: DRAWER_WIDTH,
              boxSizing: 'border-box',
            },
          }}
      >
        <Box sx={{ p: 2, bgcolor: 'primary.main', color: 'white' }}>
          <Typography variant="h5" sx={{ fontWeight: 'bold' }}>MyDormy</Typography>
          <Typography variant="body2" sx={{ mt: 1 }}>
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
                >
                  <ListItemIcon sx={{ color: location.pathname === item.path ? 'primary.main' : 'inherit' }}>
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
              <ListItemIcon><LogoutIcon /></ListItemIcon>
              <ListItemText primary="Atsijungti" />
            </ListItemButton>
          </ListItem>
        </List>
      </Drawer>
  );
}

function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth();

  if (loading) return null;

  if (!user) return <Navigate to="/login" replace />;

  if (allowedRoles && !allowedRoles.includes(user.user_type)) {
    return <Navigate to={getRedirectForRole(user.user_type)} replace />;
  }

  return <RequirePasswordChange>{children}</RequirePasswordChange>;
}

function AppContent() {
  const { user } = useAuth();

  return (
      <Box sx={{ display: 'flex', minHeight: '100vh' }}>
        {user && <Sidebar />}

        <Box component="main" sx={{ flexGrow: 1 }}>
          <Routes>

            <Route path="/login" element={<LoginPage />} />

            <Route
                path="/change-password"
                element={
                  <PreventAccessIfPasswordChanged>
                    <ChangePasswordPage />
                  </PreventAccessIfPasswordChanged>
                }
            />

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

            <Route
                path="/admin"
                element={
                  <ProtectedRoute allowedRoles={['UNIVERSITY_ADMIN']}>
                    <AdminDashboard />
                  </ProtectedRoute>
                }
            />

            <Route
                path="/dorm-admin"
                element={
                  <ProtectedRoute allowedRoles={['DORMITORY_ADMIN']}>
                    <DormAdminDashboard />
                  </ProtectedRoute>
                }
            />

            <Route
                path="/supervisor"
                element={
                  <ProtectedRoute allowedRoles={['SUPERVISOR']}>
                    <SupervisorDashboard />
                  </ProtectedRoute>
                }
            />

            {/* DEFAULT REDIRECT */}
            <Route
                path="/"
                element={
                  user
                      ? <Navigate to={getRedirectForRole(user.user_type)} replace />
                      : <Navigate to="/login" replace />
                }
            />

            <Route path="*" element={<Navigate to="/" replace />} />

          </Routes>
        </Box>
      </Box>
  );
}

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
