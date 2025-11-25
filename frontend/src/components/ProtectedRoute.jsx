import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children }) {
    const { user, loading } = useAuth();

    // Kol kraunam user'į – nerenderinam nieko
    if (loading) return null;

    // Jei nėra user -> login
    if (!user) return <Navigate to="/login" replace />;

    // Jei reik keisti slaptažodį -> change-password
    if (user.must_change_password) return <Navigate to="/change-password" replace />;

    return children;
}
