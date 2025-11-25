import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import LoginPage from './pages/LoginPage';
import RoomsPage from './pages/RoomsPage';
import CreateUserPage from './pages/CreateUserPage';   // <-- ČIA PRIDĖTA
import ChangePasswordPage from "./pages/ChangePasswordPage";
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from "./components/ProtectedRoute.jsx";

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

function App() {
  return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <AuthProvider>
          <Router>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/rooms" element={<ProtectedRoute><RoomsPage /> </ProtectedRoute>} />
              <Route path="/change-password" element={<ChangePasswordPage />} />
              <Route path="/admin/create-user" element={<CreateUserPage />} /> {/* <-- NAUJAS ROUTE */}
              <Route path="/" element={<Navigate to="/rooms" />} />
            </Routes>
          </Router>
        </AuthProvider>
      </ThemeProvider>
  );
}

export default App;
