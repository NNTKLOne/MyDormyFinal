import { useEffect, useState } from "react";
import {
    Container,
    Card,
    CardContent,
    Typography,
    Box,
    CircularProgress,
    Alert
} from "@mui/material";
import axios from '../api/axios';
import { triggerUnreadRefresh } from "../App";

export default function NotificationsPage() {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadNotifications();
    }, []);

    const loadNotifications = async () => {
        try {
            const res = await axios.get("/api/notifications");
            setNotifications(res.data.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const markAsRead = async (id) => {
        try {
            await axios.put(`/api/notifications/${id}/read`);
            setNotifications((prev) =>
                prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
            );
            triggerUnreadRefresh();
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <Container maxWidth="md" sx={{ py: 4 }}>
            <Typography variant="h4" gutterBottom>
                Pranešimai
            </Typography>

            {loading ? (
                <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
                    <CircularProgress />
                </Box>
            ) : notifications.length === 0 ? (
                <Alert severity="info">Pranešimų nėra</Alert>
            ) : (
                notifications.map((notif) => (
                    <Card
                        key={notif.id}
                        sx={{
                            mb: 2,
                            borderLeft: notif.is_read
                                ? "4px solid #cccccc"
                                : "4px solid #1976d2",
                            backgroundColor: notif.is_read ? "#f5f5f5" : "#e8f1ff",
                            cursor: "pointer"
                        }}
                        onClick={() => markAsRead(notif.id)}
                    >
                        <CardContent>
                            <Typography variant="h6">{notif.title}</Typography>
                            <Typography variant="body2" sx={{ mt: 1 }}>
                                {notif.message}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                {new Date(notif.created_at).toLocaleString("lt-LT")}
                            </Typography>
                        </CardContent>
                    </Card>
                ))
            )}
        </Container>
    );
}
