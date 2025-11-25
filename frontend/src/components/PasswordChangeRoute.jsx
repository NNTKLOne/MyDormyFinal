import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function PasswordChangeRoute({ children }) {
    const { user } = useAuth();

    if (!user) return <Navigate to="/login" replace />;
    if (!user.must_change_password) return <Navigate to="/change-password" replace />;

    return children;
}
