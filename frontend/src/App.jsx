import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme, CssBaseline, Box } from '@mui/material';
import { AuthProvider, useAuth } from './context/AuthContext';

// Pages
import LoginPage from './pages/LoginPage';
import RoomsPage from './pages/RoomsPage';
import StudentDashboard from './pages/StudentDashboard';
import AdminDashboard from './pages/AdminDashboard';
import SupervisorDashboard from './pages/SupervisorDashboard';
import InspectionBooking from './pages/InspectionBooking';
import RequestSubmission from './pages/RequestSubmission';

// Components
import Navigation from './components/Navigation';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
  typography: {
    fontFamily: 'Roboto, sans-serif',
  },
});

// Protected Route Component
function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
      Kraunama...
    </Box>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.user_type)) {
    return <Navigate to="/" replace />;
  }

  return children;
}

// Main App Content
function AppContent() {
  const { user } = useAuth();

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      {user && <Navigation />}
      
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<LoginPage />} />

        {/* Protected Routes - All authenticated users */}
        <Route
          path="/rooms"
          element={
            <ProtectedRoute>
              <RoomsPage />
            </ProtectedRoute>
          }
        />

        {/* Student Routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute allowedRoles={['STUDENT']}>
              <StudentDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/submit-request"
          element={
            <ProtectedRoute allowedRoles={['STUDENT']}>
              <RequestSubmission />
            </ProtectedRoute>
          }
        />
        <Route
          path="/book-inspection"
          element={
            <ProtectedRoute allowedRoles={['STUDENT']}>
              <InspectionBooking />
            </ProtectedRoute>
          }
        />

        {/* Admin Routes */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={['UNIVERSITY_ADMIN']}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        {/* Supervisor Routes */}
        <Route
          path="/supervisor"
          element={
            <ProtectedRoute allowedRoles={['SUPERVISOR']}>
              <SupervisorDashboard />
            </ProtectedRoute>
          }
        />

        {/* Default Route */}
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
              ) : (
                <Navigate to="/rooms" replace />
              )
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        {/* 404 Route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
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
