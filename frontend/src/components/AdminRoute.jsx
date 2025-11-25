import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function AdminRoute({ children }) {
    const { user } = useAuth();

    if (!user) return <Navigate to="/login" replace />;
    if (user.must_change_password) return <Navigate to="/change-password" replace />;
    if (user.user_type !== "UNIVERSITY_ADMIN") return <Navigate to="/rooms" replace />;

    return children;
}
