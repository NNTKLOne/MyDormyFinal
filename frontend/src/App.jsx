import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import LoginPage from './pages/LoginPage';
import RoomsPage from './pages/RoomsPage';
import CreateUserPage from './pages/CreateUserPage';
import ChangePasswordPage from "./pages/ChangePasswordPage";
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from "./components/ProtectedRoute.jsx";

const theme = createTheme({
  palette: {
    primary: { main: '#1976d2' },
    secondary: { main: '#dc004e' },
  },
  typography: {
    fontFamily: 'Roboto, sans-serif',
  },
});

function App() {
  return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <AuthProvider>
          <Router>
            <Routes>

              {/* PUBLIC ROUTES */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/change-password" element={<ChangePasswordPage />} />

              {/* PROTECTED ROUTES */}
              <Route path="/rooms" element={
                <ProtectedRoute>
                  <RoomsPage />
                </ProtectedRoute>
              } />

              <Route path="/admin/create-user" element={
                <ProtectedRoute>
                  <CreateUserPage />
                </ProtectedRoute>
              } />

              {/* DEFAULT */}
              <Route path="/" element={<Navigate to="/rooms" />} />

            </Routes>
          </Router>
        </AuthProvider>
      </ThemeProvider>
  );
}

export default App;
