import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function RequirePasswordChange({ children }) {
    const { user, mustChangePassword, loading } = useAuth();

    // Palaukiame, kol užsikraus user info
    if (loading) return null;

    // Jei reikia keisti slaptažodį — redirectinam
    if (mustChangePassword) {
        return <Navigate to="/change-password" replace />;
    }

    return children;
}
