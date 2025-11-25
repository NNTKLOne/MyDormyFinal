import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function PreventAccessIfPasswordChanged({ children }) {
    const { mustChangePassword, loading } = useAuth();

    if (loading) return null;

    // Jei nereikia keisti slaptažodžio — uždraudžiame patekti į puslapį
    if (!mustChangePassword) {
        return <Navigate to="/rooms" replace />;
    }

    return children;
}
